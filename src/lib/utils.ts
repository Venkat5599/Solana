import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export function solToLamports(sol: number): number {
  return Math.round(sol * LAMPORTS_PER_SOL);
}

const USDC_DECIMALS = 6;

/** Convert a human USDC amount (e.g. 1.5) to raw token units (1_500_000). */
export function usdcToRaw(usdc: number): number {
  return Math.round(usdc * 10 ** USDC_DECIMALS);
}

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

export function formatSol(lamports: number): string {
  return `${lamportsToSol(lamports).toFixed(4)} SOL`;
}

export function formatTimestamp(unixTs: number): string {
  return new Date(unixTs * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
