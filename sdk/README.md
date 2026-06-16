# @legion/gasless

Gasless Solana transactions. Your users shouldn't need SOL just to use your app.

The SDK handles the gas — your sponsor wallet covers it — and collects a small fee in USDC, USDT, or whatever SPL token you choose. One transaction, fully atomic, no SOL required on the user's end.

```ts
import { LegionGasless } from "@legion/gasless";

const legion = new LegionGasless({
  gasless: {
    fees: [
      { token: "USDT", mintAddress: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", amount: 0.10 },
      { token: "USDC", mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: 0.05 },
    ],
    defaultFeeToken: "USDC",
  },
});
```

---

## Installation

```bash
bun add @legion/gasless @solana/web3.js @solana/spl-token
```

---

## How it works

```
User wallet signs:
  [0] Transfer 0.05 USDC → sponsor   (fee for gas coverage)
  [1] Transfer X SOL    → recipient  (the actual action)

Sponsor wallet co-signs as feePayer, covering SOL gas.
Both instructions are atomic — all or nothing, on-chain.
```

The sponsor wallet needs SOL to cover Solana network fees (~5000 lamports per tx). It receives the USDC fee from each user to recoup costs. At $0.05/tx, 1 SOL of gas covers ~20,000 gasless transactions.

---

## React (recommended)

```tsx
import { useGaslessTransaction } from "@legion/gasless/react";

const LEGION_CONFIG = {
  gasless: {
    fees: [{ token: "USDC", mintAddress: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", amount: 0.05 }],
    defaultFeeToken: "USDC",
  },
};

function TipButton({ recipient }: { recipient: string }) {
  const { sendGaslessTip, status, signature, error } = useGaslessTransaction(LEGION_CONFIG);

  return (
    <button
      onClick={() =>
        sendGaslessTip({
          recipientAddress: recipient,
          tipAmountRaw: 1_000_000, // 1 USDC
        })
      }
      disabled={status !== "idle"}
    >
      {status === "idle" ? "Send Tip (no SOL needed)" : status}
    </button>
  );
}
```

The hook handles the full flow: build → user sign → sponsor co-sign → submit → confirm.

**Status values:** `idle` | `building` | `signing` | `sponsoring` | `submitting` | `confirming` | `confirmed` | `error`

---

## Next.js App Router

### 1. Create the sponsor API routes

```ts
// app/api/sponsor/route.ts
import { createSponsorRoute } from "@legion/gasless/server";

export const { GET, POST } = createSponsorRoute({
  privateKeyEnvVar: "SPONSOR_PRIVATE_KEY",  // default
  rateLimit: 10,        // requests per IP per minute
  minSolBalance: 0.01,  // SOL — returns 503 if below
});
```

```ts
// app/api/sponsor-pubkey/route.ts
import { createSponsorPubkeyRoute } from "@legion/gasless/server";

export const { GET } = createSponsorPubkeyRoute();
```

### 2. Set environment variables

```bash
# .env.local
NEXT_PUBLIC_SOLANA_NETWORK=devnet
SPONSOR_PRIVATE_KEY=your_sponsor_wallet_private_key_base58
```

### 3. Use the hook in your components

```tsx
"use client";
import { useGaslessTransaction } from "@legion/gasless/react";
// ... see React example above
```

---

## Low-level API

If you need more control:

```ts
import { LegionGasless } from "@legion/gasless";

const legion = new LegionGasless(config);

// Build the transaction
const { transaction, expiresAt } = await legion.buildGaslessTipTransaction({
  connection,
  sponsorPublicKey,   // feePayer — covers SOL gas
  senderPublicKey,    // pays USDC fee + sends SOL tip
  recipientPublicKey, // receives SOL tip
  tipAmountRaw: 1_000_000,
  feeToken: "USDC",  // optional, defaults to config.gasless.defaultFeeToken
});

// User partially signs
const userSigned = await wallet.signTransaction(transaction);
const b64 = userSigned.serialize({ requireAllSignatures: false }).toString("base64");

// POST to your sponsor endpoint
const res = await fetch("/api/sponsor", {
  method: "POST",
  body: JSON.stringify({ transaction: b64 }),
});
const { transaction: signedB64 } = await res.json();

// Submit
const finalTx = Transaction.from(Buffer.from(signedB64, "base64"));
const signature = await connection.sendRawTransaction(finalTx.serialize());
await connection.confirmTransaction(signature, "confirmed");
```

---

## Sponsor API contract

`POST /api/sponsor`

**Request:**
```json
{ "transaction": "<base64-user-signed-tx>" }
```

**Response (success):**
```json
{ "transaction": "<base64-dual-signed-tx>" }
```

**Response (error):**
```json
{ "error": "Human-readable message", "code": "ERROR_CODE" }
```

**Error codes:** `MISSING_ENV` | `INVALID_KEY` | `INSUFFICIENT_SPONSOR_SOL` | `INVALID_TRANSACTION` | `RATE_LIMITED` | `SIGN_FAILED` | `METHOD_NOT_ALLOWED`

---

## Network addresses

| Network | USDC mint | USDT mint |
|---------|-----------|-----------|
| **devnet** | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` | — |
| **mainnet-beta** | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` |

---

## Demo

The `apps/demo` directory contains a full tip jar built with this SDK: [github.com/Venkat5599/Solana](https://github.com/Venkat5599/Solana)

---

## License

MIT
