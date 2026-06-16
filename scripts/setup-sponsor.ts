/**
 * Generates a fresh devnet sponsor keypair and writes it to .env.local.
 * Prints ONLY the public key — the secret never leaves the file.
 *
 *   bun scripts/setup-sponsor.ts
 *
 * Re-running regenerates the key (old one is replaced). Devnet only —
 * generate a fresh, dedicated key for mainnet and fund it deliberately.
 */
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ENV_PATH = join(import.meta.dir, "..", ".env.local");
const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet";

const kp = Keypair.generate();
const secret = bs58.encode(kp.secretKey);
const pubkey = kp.publicKey.toBase58();

// Merge into existing .env.local, replacing the two managed keys.
let lines: string[] = existsSync(ENV_PATH)
  ? readFileSync(ENV_PATH, "utf8").split(/\r?\n/)
  : [];

const managed = new Map<string, string>([
  ["NEXT_PUBLIC_SOLANA_NETWORK", NETWORK],
  ["SPONSOR_PRIVATE_KEY", secret],
]);

const seen = new Set<string>();
lines = lines.map((line) => {
  const m = line.match(/^([A-Z0-9_]+)=/);
  if (m && managed.has(m[1])) {
    seen.add(m[1]);
    return `${m[1]}=${managed.get(m[1])}`;
  }
  return line;
});
for (const [k, v] of managed) {
  if (!seen.has(k)) lines.push(`${k}=${v}`);
}

writeFileSync(ENV_PATH, lines.filter((l, i) => l !== "" || i < lines.length - 1).join("\n").replace(/\n+$/, "") + "\n");

console.log("Sponsor keypair written to .env.local (gitignored).");
console.log("Network       :", NETWORK);
console.log("Sponsor pubkey:", pubkey);
console.log("\nNext: fund this address with devnet SOL →");
console.log("  bun scripts/airdrop.ts", pubkey);
