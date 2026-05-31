import { NextResponse } from "next/server";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

export async function GET(): Promise<NextResponse> {
  const privateKeyB58 = process.env.SPONSOR_PRIVATE_KEY;
  if (!privateKeyB58) {
    return NextResponse.json(
      { error: "Sponsor wallet not configured.", code: "MISSING_ENV" },
      { status: 500 }
    );
  }
  try {
    const keypair = Keypair.fromSecretKey(bs58.decode(privateKeyB58));
    return NextResponse.json({ publicKey: keypair.publicKey.toBase58() });
  } catch {
    return NextResponse.json(
      { error: "Invalid sponsor key format.", code: "INVALID_KEY" },
      { status: 500 }
    );
  }
}
