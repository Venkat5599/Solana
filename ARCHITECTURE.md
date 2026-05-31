# Architecture — Solana Gasless Tip Jar

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER'S BROWSER                                 │
│                                                                         │
│  ┌─────────────────┐    ┌──────────────────────────────────────────┐   │
│  │   WalletProvider│    │              TipJar Component             │   │
│  │   (Phantom /    │    │                                          │   │
│  │    Solflare)    │◄───│  1. Build tx (LegionGasless.buildTx())   │   │
│  │                 │    │  2. wallet.signTransaction(tx)           │   │
│  │  wallet.sign() │────►│  3. POST /api/sponsor {tx: base64}       │   │
│  └─────────────────┘    │  4. connection.sendRawTransaction(signed)│   │
│                         │  5. confirmTransaction() → Explorer link │   │
│                         └──────────────────────────────────────────┘   │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ POST /api/sponsor
                                  │ {transaction: base64}
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS API ROUTE (Server)                       │
│                                                                         │
│  src/app/api/sponsor/route.ts                                           │
│                                                                         │
│  1. Validate method (POST only → 405 otherwise)                        │
│  2. Rate limit (10 req/min/IP in-memory)                               │
│  3. Load SPONSOR_PRIVATE_KEY from process.env (never client-exposed)   │
│  4. Check sponsor SOL balance → 503 if < 0.01 SOL                     │
│  5. Deserialize tx → tx.partialSign(sponsorKeypair)                   │
│  6. Return {transaction: base64} OR {error, code}                     │
│                                                                         │
│  ENV: SPONSOR_PRIVATE_KEY (unprefixed → server only)                  │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ sendRawTransaction(dual-signed tx)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SOLANA NETWORK                                  │
│                                                                         │
│  devnet: api.devnet.solana.com  |  mainnet: api.mainnet-beta.solana.com│
│                                                                         │
│  Atomic Transaction:                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  feePayer: SPONSOR_WALLET (covers SOL gas ~5000 lamports)       │   │
│  │  instruction[0]: SPL Token Transfer                              │   │
│  │    FROM: user_wallet                                             │   │
│  │    TO:   sponsor_wallet                                         │   │
│  │    MINT: USDC (devnet: 4zMMC9... | mainnet: EPjFWdd5...)        │   │
│  │    AMOUNT: 50000 (= $0.05 USDC, 6 decimals)                    │   │
│  │                                                                  │   │
│  │  instruction[1]: System Transfer                                 │   │
│  │    FROM: user_wallet                                             │   │
│  │    TO:   recipient_wallet                                        │   │
│  │    AMOUNT: user_specified lamports (e.g. 100000 = 0.0001 SOL)  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Either BOTH instructions execute or NEITHER does (Solana atomicity)   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Happy Path (Tip Sent Successfully)

```
1. User visits /?to=<creator_address>
   → TipJar reads ?to param → pre-fills recipient field

2. User clicks "Connect Wallet"
   → WalletProvider opens Phantom modal
   → User approves → wallet.publicKey available

3. User enters tip amount (e.g. "0.001" SOL)
   → Validation: recipient valid base58, amount > 0

4. User clicks "Send Tip"
   → loading = true, spinner shown

5. LegionGasless.buildGaslessTipTransaction({
       connection,
       sponsorPublicKey: <from API /api/sponsor-pubkey or env>,
       senderPublicKey: wallet.publicKey,
       recipientPublicKey: recipient,
       tipAmountLamports: 100000,
       feeToken: "USDC"
     })
   → Returns Transaction with feePayer=sponsor, 2 instructions, fresh blockhash

6. wallet.signTransaction(tx)
   → Wallet prompts user → User approves
   → Returns partially-signed tx (user signed)

7. POST /api/sponsor { transaction: tx.serialize().toString('base64') }
   → Server: loads SPONSOR_PRIVATE_KEY from env
   → Server: tx.partialSign(sponsorKeypair)
   → Returns: { transaction: dualSignedBase64 }

8. Buffer from base64 → Transaction.from(buffer)
   → connection.sendRawTransaction(tx.serialize())
   → Returns: txSignature (string)

9. connection.confirmTransaction(txSignature, 'confirmed')
   → Polls until confirmed (≤5s on devnet)

10. loading = false
    → Success toast: "Tip sent! View on Explorer →"
    → TipHistory refreshes
```

### Error Paths

| Error | Origin | UI Response |
|-------|--------|-------------|
| User rejects wallet prompt | Step 6 | Toast: "Transaction rejected" |
| Sponsor insufficient SOL | Step 7 | Toast: "Sponsor wallet needs funding" |
| Insufficient USDC | Step 8 | Toast: "Insufficient USDC for fee" |
| Network / RPC error | Step 8-9 | Toast: "Network error — try again" |
| Blockhash expired | Step 8 | Toast: "Transaction expired — retry" |

---

## Component Breakdown

### `src/lib/legion-gasless.ts` — Core Library

The Legion-compatible gasless transaction builder.

```typescript
interface LegionGaslessConfig {
  gasless: {
    fees: Array<{ token: string; mintAddress: string; amount: number }>;
    defaultFeeToken: string;
  };
}

class LegionGasless {
  constructor(config: LegionGaslessConfig)
  
  buildGaslessTipTransaction(params: {
    connection: Connection;
    sponsorPublicKey: PublicKey;
    senderPublicKey: PublicKey;
    recipientPublicKey: PublicKey;
    tipAmountLamports: number;
    feeToken?: string;
  }): Promise<Transaction>
  
  getFeeForToken(token: string): { mintAddress: string; amount: number }
}
```

**Key invariants:**
- `feePayer` is always `sponsorPublicKey` — the sponsor's SOL covers gas
- USDC fee instruction always precedes tip instruction
- `recentBlockhash` fetched at construction time (caller must build tx immediately before signing)

---

### `src/lib/solana.ts` — Network Configuration

```typescript
// Driven by NEXT_PUBLIC_SOLANA_NETWORK env var
export function getConnection(): Connection
export const SOLANA_NETWORK: 'devnet' | 'mainnet-beta'
export const LEGION_CONFIG: LegionGaslessConfig   // fee token config per network
export function explorerUrl(signature: string): string
export function truncateAddress(address: string): string
```

---

### `src/app/api/sponsor/route.ts` — Sponsor Co-Signer

Server-only. Never imported from client components.

**Request:** `POST /api/sponsor`
```json
{ "transaction": "<base64-serialized-partially-signed-tx>" }
```

**Response (success):**
```json
{ "transaction": "<base64-dual-signed-tx>" }
```

**Response (error):**
```json
{ "error": "Human-readable message", "code": "ERROR_CODE" }
```

**Error codes:**
- `MISSING_ENV` — `SPONSOR_PRIVATE_KEY` not set (HTTP 500)
- `INSUFFICIENT_SPONSOR_SOL` — sponsor wallet needs funding (HTTP 503)
- `INVALID_TRANSACTION` — tx deserialization failed (HTTP 400)
- `RATE_LIMITED` — too many requests from this IP (HTTP 429)
- `SIGN_FAILED` — partial sign failed (HTTP 500)

---

### `src/components/WalletProvider.tsx` — Wallet Context

Client component. Wraps the app with Solana Wallet Adapter providers.

- Adapters: `PhantomWalletAdapter`, `SolflareWalletAdapter`
- Network: reads `NEXT_PUBLIC_SOLANA_NETWORK`
- Auto-connect: disabled (explicit user action required)

---

### `src/components/TipJar.tsx` — Main UI

Client component. Owns the tip-sending flow.

**State:**
```typescript
recipient: string       // base58 address or empty
amountSol: string       // decimal string (e.g. "0.001")
loading: boolean        // true during tx submission
lastTxSig: string|null  // last confirmed tx signature
```

**URL param behavior:**
- `?to=<address>` → pre-fills recipient, disables recipient input field
- No param → recipient input is editable

---

### `src/components/TipHistory.tsx` — Transaction History

Client component. Shows last 10 tx signatures for connected wallet.

- Fetches via `connection.getSignaturesForAddress(wallet.publicKey, { limit: 10 })`
- Refreshes on wallet connect and after each sent tip
- Each row: blockTime (formatted), signature (truncated), Explorer link

---

## Security Model

| Concern | Protection |
|---------|-----------|
| Sponsor key exposure | `SPONSOR_PRIVATE_KEY` — no `NEXT_PUBLIC_` prefix; only in `route.ts` |
| Malicious tx submission | API validates tx has expected USDC fee instruction |
| Sponsor wallet drain by abuse | Rate limiting: 10 req/min/IP |
| Mainnet tx on devnet config | Token addresses driven by `NEXT_PUBLIC_SOLANA_NETWORK` env |
| Max tip amount | No arbitrary cap (v1 — grant demo scope) |

---

## Environment Variables

| Variable | Scope | Required | Description |
|----------|-------|----------|-------------|
| `NEXT_PUBLIC_SOLANA_NETWORK` | Client + Server | Yes | `devnet` or `mainnet-beta` |
| `SPONSOR_PRIVATE_KEY` | Server only | Yes | Base58-encoded sponsor keypair secret key |

---

## Network Token Addresses

| Network | USDC Mint | USDT Mint |
|---------|-----------|-----------|
| **devnet** | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` | N/A (use USDC) |
| **mainnet-beta** | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` |

---

## Deployment

The app is a standard Next.js app deployable to:
- **Vercel** (recommended — zero config)
- **Cloudflare Pages** (with Next.js adapter)
- **Any Node.js host** with env vars set

**Required env vars on deploy:**
```
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
SPONSOR_PRIVATE_KEY=<base58-encoded-sponsor-key>
```

**Sponsor wallet funding:** The sponsor wallet needs SOL to cover gas fees. At ~5000 lamports/tx, 0.1 SOL covers ~20,000 tips. On mainnet, replenish when balance drops below 0.01 SOL.
