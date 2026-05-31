# Solana Gasless Tip Jar

Send on-chain SOL tips without holding SOL. Users pay a small USDC fee instead of gas — the sponsor wallet covers Solana transaction fees atomically.

Built for the [Superteam Earn Grant — Ideas → Prompt → Prod](https://earn.superteam.fun).

## Demo

1. Share your tip jar: `https://your-deploy.vercel.app/?to=YOUR_WALLET_ADDRESS`
2. Fan opens link, connects Phantom/Solflare
3. Fan enters amount, clicks "Send Tip"
4. Tip confirmed on-chain in ~2s — no SOL required

## How It Works

```
User wallet signs:
  [0] Transfer 0.05 USDC → sponsor wallet  (fee for gas coverage)
  [1] Transfer X SOL    → creator wallet   (the tip)

Sponsor wallet co-signs as feePayer, covering SOL gas.
Both instructions are atomic — all or nothing.
```

## Quickstart

### Prerequisites

- [Bun](https://bun.sh) installed
- [Phantom](https://phantom.app) or [Solflare](https://solflare.com) wallet
- A funded devnet wallet for the sponsor

### 1. Clone and install

```bash
git clone https://github.com/Venkat5599/Solana
cd Solana
bun install
```

### 2. Set up environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```bash
NEXT_PUBLIC_SOLANA_NETWORK=devnet
SPONSOR_PRIVATE_KEY=your_sponsor_wallet_private_key_base58
```

### 3. Generate a sponsor wallet

```bash
bun -e "
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const kp = Keypair.generate();
console.log('Public key:', kp.publicKey.toBase58());
console.log('Private key (put in SPONSOR_PRIVATE_KEY):', bs58.default.encode(kp.secretKey));
"
```

### 4. Fund the sponsor wallet with devnet SOL

```bash
# Airdrop 2 SOL to your sponsor wallet
bun -e "
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
const pubkey = new PublicKey('YOUR_SPONSOR_PUBLIC_KEY');
conn.requestAirdrop(pubkey, 2 * LAMPORTS_PER_SOL).then(sig => {
  console.log('Airdrop tx:', sig);
});
"
```

Or use the [Solana Devnet Faucet](https://faucet.solana.com).

### 5. Get devnet USDC for testing

Your test wallet needs devnet USDC. Use the [Circle devnet faucet](https://faucet.circle.com) or:

```bash
# Mint devnet USDC to your wallet (requires spl-token CLI)
# Devnet USDC mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

### 6. Run

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 7. Test the gasless flow

1. Open `http://localhost:3000/?to=YOUR_CREATOR_WALLET_ADDRESS`
2. Connect your test wallet in Phantom (switch to devnet)
3. Ensure your test wallet has devnet USDC but no SOL
4. Enter `0.001` as tip amount
5. Click "Send Tip" → approve in Phantom
6. Watch the Explorer link appear in the success toast

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SOLANA_NETWORK` | Yes | `devnet` or `mainnet-beta` |
| `SPONSOR_PRIVATE_KEY` | Yes | Base58 sponsor keypair secret (server-only, never exposed to client) |

## Deploy to Vercel

```bash
# Install Vercel CLI
bun add -g vercel

# Deploy
vercel

# Set env vars
vercel env add NEXT_PUBLIC_SOLANA_NETWORK
vercel env add SPONSOR_PRIVATE_KEY
```

## Mainnet

Switch to mainnet by changing one env var:

```bash
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
```

The app automatically uses mainnet USDC (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`) and mainnet RPC.

Ensure your mainnet sponsor wallet has SOL. At ~5000 lamports/tx, 0.1 SOL covers ~20,000 tips.

## Security

- Sponsor private key is **never exposed to the client** — only accessed in `src/app/api/sponsor/route.ts`
- API route validates the USDC fee instruction before co-signing
- Rate limited to 10 requests/minute per IP
- Sponsor balance checked on every request — returns 503 if insufficient SOL

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 App Router |
| Language | TypeScript (strict) |
| Wallet | @solana/wallet-adapter-react |
| Gasless | Custom Legion-compatible implementation on @solana/web3.js |
| Styling | Tailwind CSS v3 |
| Runtime | Bun |
| Network | Solana (devnet / mainnet-beta) |

## License

MIT
