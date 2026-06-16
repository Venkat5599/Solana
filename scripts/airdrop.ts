/**
 * Airdrops devnet SOL to an address.
 *
 *   bun scripts/airdrop.ts <PUBKEY> [amountSol=2]
 *
 * Public devnet faucet is rate-limited; if this returns 429, use the web
 * faucet at https://faucet.solana.com instead.
 */
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const [addr, amountArg] = process.argv.slice(2);
if (!addr) {
  console.error("Usage: bun scripts/airdrop.ts <PUBKEY> [amountSol]");
  process.exit(1);
}
const amount = Number(amountArg ?? "2");
const conn = new Connection("https://api.devnet.solana.com", "confirmed");
const pubkey = new PublicKey(addr);

const before = await conn.getBalance(pubkey);
console.log(`Balance before: ${(before / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

try {
  const sig = await conn.requestAirdrop(pubkey, amount * LAMPORTS_PER_SOL);
  console.log("Airdrop tx:", sig, "— confirming...");
  await conn.confirmTransaction(sig, "confirmed");
  const after = await conn.getBalance(pubkey);
  console.log(`Balance after:  ${(after / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
} catch (err) {
  console.error("Airdrop failed:", err instanceof Error ? err.message : err);
  console.error("→ Use the web faucet: https://faucet.solana.com (paste the address above)");
  process.exit(1);
}
