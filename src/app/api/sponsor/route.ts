import { NextRequest, NextResponse } from "next/server";
import {
  Keypair,
  Transaction,
  Connection,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import bs58 from "bs58";

// In-memory rate limiter: IP → { count, resetAt }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, { status: 405 });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  const privateKeyB58 = process.env.SPONSOR_PRIVATE_KEY;
  if (!privateKeyB58) {
    console.error("SPONSOR_PRIVATE_KEY env var not set");
    return NextResponse.json(
      { error: "Sponsor wallet not configured.", code: "MISSING_ENV" },
      { status: 500 }
    );
  }

  let sponsorKeypair: Keypair;
  try {
    sponsorKeypair = Keypair.fromSecretKey(bs58.decode(privateKeyB58));
  } catch {
    console.error("Invalid SPONSOR_PRIVATE_KEY format");
    return NextResponse.json(
      { error: "Sponsor wallet configuration error.", code: "INVALID_KEY" },
      { status: 500 }
    );
  }

  // Check sponsor SOL balance
  const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet") as
    | "devnet"
    | "mainnet-beta";
  const connection = new Connection(clusterApiUrl(network), "confirmed");
  const balance = await connection.getBalance(sponsorKeypair.publicKey);
  const MIN_SOL = 0.01 * LAMPORTS_PER_SOL;
  if (balance < MIN_SOL) {
    return NextResponse.json(
      {
        error: `Sponsor wallet has insufficient SOL (${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL). Please fund: ${sponsorKeypair.publicKey.toBase58()}`,
        code: "INSUFFICIENT_SPONSOR_SOL",
      },
      { status: 503 }
    );
  }

  let body: { transaction?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  if (!body.transaction || typeof body.transaction !== "string") {
    return NextResponse.json(
      { error: "Missing transaction field.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  let tx: Transaction;
  try {
    const txBuffer = Buffer.from(body.transaction, "base64");
    tx = Transaction.from(txBuffer);
  } catch {
    return NextResponse.json(
      { error: "Could not deserialize transaction.", code: "INVALID_TRANSACTION" },
      { status: 400 }
    );
  }

  try {
    tx.partialSign(sponsorKeypair);
  } catch (err) {
    console.error("Sponsor partialSign failed:", err);
    return NextResponse.json(
      { error: "Sponsor signing failed.", code: "SIGN_FAILED" },
      { status: 500 }
    );
  }

  const signedBase64 = tx.serialize({ requireAllSignatures: false }).toString("base64");

  return NextResponse.json({ transaction: signedBase64 });
}
