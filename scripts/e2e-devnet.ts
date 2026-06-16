/**
 * Headless end-to-end proof of the gasless flow on devnet.
 *
 * Exercises the EXACT SDK path the browser uses:
 *   build (LegionGasless) → user signs → sponsor signs → submit → confirm
 * but with a local "user" keypair instead of Phantom, so it runs without a
 * browser. If this prints an Explorer link, the on-chain mechanism works.
 *
 *   bun scripts/e2e-devnet.ts
 *
 * Prereqs:
 *   - SPONSOR_PRIVATE_KEY in .env.local, sponsor funded with devnet SOL
 *   - The user keypair (printed on first run, saved to .devnet-user.json)
 *     funded with devnet USDC via https://faucet.circle.com — and 0 SOL,
 *     to prove the sponsor really covers gas.
 */
import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { LegionGasless } from "@legion/gasless";
import bs58 from "bs58";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Load .env.local manually (no Next.js runtime here).
const ENV = join(import.meta.dir, "..", ".env.local");
for (const line of readFileSync(ENV, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}

const RPC = "https://api.devnet.solana.com";
const USDC_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const conn = new Connection(RPC, "confirmed");

// Sponsor (feePayer, covers gas)
const sponsor = Keypair.fromSecretKey(
  bs58.decode(process.env.SPONSOR_PRIVATE_KEY!)
);

// User (the "fan" — has USDC, ideally 0 SOL). Persisted so you can fund it once.
const USER_PATH = join(import.meta.dir, "..", ".devnet-user.json");
let user: Keypair;
if (existsSync(USER_PATH)) {
  user = Keypair.fromSecretKey(bs58.decode(readFileSync(USER_PATH, "utf8").trim()));
} else {
  user = Keypair.generate();
  writeFileSync(USER_PATH, bs58.encode(user.secretKey));
  console.log("Created user keypair → .devnet-user.json");
}

// Creator (tip recipient) — a throwaway address is fine.
const creator = Keypair.generate().publicKey;

const config = {
  gasless: {
    fees: [{ token: "USDC", mintAddress: USDC_DEVNET, amount: 0.05 }],
    defaultFeeToken: "USDC",
  },
};

async function main() {
  console.log("Sponsor :", sponsor.publicKey.toBase58());
  console.log("User    :", user.publicKey.toBase58());
  console.log("Creator :", creator.toBase58());

  const sponsorSol = await conn.getBalance(sponsor.publicKey);
  console.log(`\nSponsor SOL: ${(sponsorSol / LAMPORTS_PER_SOL).toFixed(4)}`);
  if (sponsorSol < 0.01 * LAMPORTS_PER_SOL) {
    throw new Error("Sponsor underfunded. Run: bun scripts/airdrop.ts " + sponsor.publicKey.toBase58());
  }

  // Check user USDC
  const usdc = new PublicKey(USDC_DEVNET);
  const userAta = await getAssociatedTokenAddress(usdc, user.publicKey);
  try {
    const acct = await getAccount(conn, userAta);
    console.log(`User USDC  : ${(Number(acct.amount) / 1e6).toFixed(2)}`);
  } catch {
    throw new Error(
      `User has no USDC. Fund this address at https://faucet.circle.com (devnet, Solana):\n  ${user.publicKey.toBase58()}`
    );
  }

  // Build via the SDK — same code the app calls.
  const legion = new LegionGasless(config);
  const { transaction } = await legion.buildGaslessTipTransaction({
    connection: conn,
    sponsorPublicKey: sponsor.publicKey,
    senderPublicKey: user.publicKey,
    recipientPublicKey: creator,
    tipAmountRaw: 0.1 * 1e6, // 0.1 USDC
  });

  // User signs (Phantom does this in the browser), then sponsor co-signs.
  transaction.partialSign(user);
  transaction.partialSign(sponsor);

  const sig = await conn.sendRawTransaction(transaction.serialize());
  console.log("\nSubmitted:", sig, "— confirming...");
  await conn.confirmTransaction(sig, "confirmed");

  console.log("\n✅ USDC tip landed. Sponsor paid the gas; user paid 0 SOL.");
  console.log("Explorer: https://explorer.solana.com/tx/" + sig + "?cluster=devnet");
}

main().catch((e) => {
  console.error("\n❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
