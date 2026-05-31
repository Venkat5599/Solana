# Product Requirements Document — Solana Gasless Tip Jar

**Version:** 1.0  
**Status:** Approved for Build  
**Target:** Superteam Earn Grant Submission  

---

## Problem

Sending tips on Solana requires users to hold SOL for gas fees. For a first-time user who only has USDC or USDT — the most common on-ramp from Coinbase, Binance, or any fiat gateway — tipping a creator is impossible without first acquiring SOL from an exchange. This friction is a dead end that kills mainstream adoption.

The industry has a name for this: the "gas problem." Ethereum solved it partially with ERC-4337 account abstraction. Solana's solution is sponsor transactions — where a third party (the app operator) covers SOL gas fees and recovers costs via an atomic SPL token fee. Until now, implementing this required either a running Rust server (Kora) or deep Solana transaction knowledge.

**This product makes gasless tipping as simple as a config object.**

---

## Solution

A web application where creators share a tip jar link and fans send on-chain tips without holding SOL. The operator's sponsor wallet covers SOL gas atomically; fans pay a small USDC fee instead. Built with the Legion Gasless pattern — a TypeScript-native gasless transaction builder that wraps Solana's sponsor co-signing protocol into a clean, config-driven API.

**The experience:**
1. Creator shares: `https://tipjar.app/?to=7xKXtg...` 
2. Fan opens link, connects Phantom or Solflare
3. Fan enters tip amount (SOL), clicks "Send Tip"
4. Wallet prompts for signature — no SOL required
5. Tip lands on-chain in ~2 seconds, Explorer link appears

---

## Features

### F1: Gasless Tip Sending
Users send SOL tips without holding SOL. The Legion Gasless implementation builds an atomic transaction:
- Instruction 0: USDC fee transfer (user → sponsor, $0.05 default)
- Instruction 1: SOL tip transfer (user → creator/recipient)

Both instructions succeed or both fail — protocol-level atomicity.

**Acceptance:** User with 0 SOL and 1 USDC can send a 0.001 SOL tip. Transaction confirmed on-chain.

### F2: Shareable Tip Jar URL
Creators share a URL containing their wallet address as a query parameter (`?to=<address>`). When a fan opens the link, the recipient field is pre-filled and locked.

**Acceptance:** `/?to=7xKXtg2R...` pre-fills and locks recipient. Tip sends to that address.

### F3: Wallet Connection
Supports Phantom and Solflare via Solana Wallet Adapter. After connecting, the user's truncated address appears in the header. Disconnect available at any time.

**Acceptance:** Phantom connects on devnet. Address shown as `7xKX...tg2R`. Disconnect clears state.

### F4: Tip History
After connecting, the last 10 confirmed transactions for the connected wallet appear below the tip form. Each entry shows timestamp, amount indicator, and a Solana Explorer link.

**Acceptance:** On wallet connect, transaction list loads within 3s and shows ≥1 entry for a used devnet wallet.

### F5: Sponsor API Route
A Next.js API route receives the user-signed transaction and co-signs with the sponsor keypair. The sponsor private key never leaves the server.

**Acceptance:** `POST /api/sponsor` returns a dual-signed tx. `GET /api/sponsor` returns 405. `NEXT_PUBLIC_SPONSOR_PRIVATE_KEY` does not exist (key is unprefixed).

### F6: Network Configuration
A single environment variable (`NEXT_PUBLIC_SOLANA_NETWORK=devnet|mainnet-beta`) controls all network behavior — RPC endpoint, USDC token address, Solana Explorer URL. No code changes for mainnet.

**Acceptance:** Setting `NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta` switches the app to mainnet USDC mint without code changes.

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first tip | < 60s from page open | Manual demo stopwatch |
| Transaction confirmation | < 5s on devnet | Explorer timestamp delta |
| Zero-SOL tip success rate | 100% (given devnet USDC) | Devnet test run |
| Build success | `bun run build` exits 0 | CI check |
| TypeScript errors | 0 | `bun run type-check` |
| Sponsor key client exposure | 0 occurrences | `grep -r SPONSOR_PRIVATE_KEY .next/` |
| Grant second tranche | Approved | Superteam Earn review |

---

## Non-Goals (Out of Scope v1.0)

- Custom Solana smart contract / on-chain program
- Multi-recipient or split tips
- Fiat on-ramp integration
- NFT or token rewards for tippers
- Analytics dashboard
- Mobile native app
- Authentication / user accounts
- Tip amounts in USDC (tips are denominated in SOL; fee is in USDC)

---

## Technical Constraints

- **Runtime:** Bun (never npm/npx)
- **Framework:** Next.js 14 App Router
- **Language:** TypeScript strict mode
- **Gasless layer:** Custom Legion-compatible implementation over `@solana/web3.js`
- **Wallet:** `@solana/wallet-adapter-react` (Phantom + Solflare)
- **Styling:** Tailwind CSS v3
- **Devnet:** All development and testing on Solana devnet

---

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Sponsor wallet SOL depletion | Medium | Balance check in API route + README warning |
| Devnet RPC outage | Low | Fallback RPC endpoint in env |
| Blockhash expiry (>120s flow) | Low | Fetch blockhash immediately before sign |
| USDC devnet address mismatch | High (common mistake) | Env-driven, documented in README |
