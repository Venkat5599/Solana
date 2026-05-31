import { Connection, clusterApiUrl } from "@solana/web3.js";
import type { LegionGaslessConfig } from "./legion-gasless";

export type SolanaNetwork = "devnet" | "mainnet-beta";

export const SOLANA_NETWORK: SolanaNetwork =
  (process.env.NEXT_PUBLIC_SOLANA_NETWORK as SolanaNetwork) ?? "devnet";

const USDC_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const USDC_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT_MAINNET = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

export const LEGION_CONFIG: LegionGaslessConfig =
  SOLANA_NETWORK === "mainnet-beta"
    ? {
        gasless: {
          fees: [
            { token: "USDC", mintAddress: USDC_MAINNET, amount: 0.05 },
            { token: "USDT", mintAddress: USDT_MAINNET, amount: 0.05 },
          ],
          defaultFeeToken: "USDC",
        },
      }
    : {
        gasless: {
          fees: [{ token: "USDC", mintAddress: USDC_DEVNET, amount: 0.05 }],
          defaultFeeToken: "USDC",
        },
      };

let _connection: Connection | null = null;

export function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(clusterApiUrl(SOLANA_NETWORK), "confirmed");
  }
  return _connection;
}

export function explorerUrl(signature: string): string {
  const cluster = SOLANA_NETWORK === "devnet" ? "?cluster=devnet" : "";
  return `https://explorer.solana.com/tx/${signature}${cluster}`;
}

export function truncateAddress(address: string): string {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
