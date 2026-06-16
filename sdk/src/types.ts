import type { Connection, PublicKey, Transaction } from "@solana/web3.js";

// ─── Config ─────────────────────────────────────────────────────────────────

export interface LegionFeeToken {
  /** Display name, e.g. "USDC" */
  token: string;
  /** SPL token mint address (base58) */
  mintAddress: string;
  /** Fee amount in token units, e.g. 0.05 = $0.05 USDC */
  amount: number;
}

/**
 * Legion Gasless SDK configuration.
 *
 * @example
 * ```ts
 * const config: LegionGaslessConfig = {
 *   gasless: {
 *     fees: [
 *       { token: "USDC", mintAddress: "EPjFWdd5...", amount: 0.05 },
 *       { token: "USDT", mintAddress: "Es9vMFrz...", amount: 0.10 },
 *     ],
 *     defaultFeeToken: "USDC",
 *   },
 * };
 * ```
 */
export interface LegionGaslessConfig {
  gasless: {
    fees: LegionFeeToken[];
    defaultFeeToken: string;
  };
}

// ─── Transaction building ────────────────────────────────────────────────────

export interface BuildGaslessTxParams {
  connection: Connection;
  /** Sponsor keypair's public key — the account that will pay SOL gas */
  sponsorPublicKey: PublicKey;
  /** Wallet that is sending the tip and paying the USDC fee */
  senderPublicKey: PublicKey;
  /** Wallet that receives the token tip */
  recipientPublicKey: PublicKey;
  /** Tip amount in raw token units (USDC: 1_000_000 = 1 USDC) */
  tipAmountRaw: number;
  /** Override the default fee token. Must exist in config.gasless.fees */
  feeToken?: string;
}

export interface GaslessTransaction {
  /** The partially-built transaction — feePayer = sponsor, user has NOT signed yet */
  transaction: Transaction;
  /** Unix timestamp after which the blockhash expires (~120s) */
  expiresAt: number;
}

// ─── Sponsor API ─────────────────────────────────────────────────────────────

export interface SponsorRequest {
  /** Base64-encoded partially-signed transaction (user-signed) */
  transaction: string;
}

export interface SponsorResponse {
  /** Base64-encoded dual-signed transaction, ready to submit */
  transaction: string;
}

export interface SponsorErrorResponse {
  error: string;
  code: SponsorErrorCode;
}

export type SponsorErrorCode =
  | "MISSING_ENV"
  | "INVALID_KEY"
  | "INSUFFICIENT_SPONSOR_SOL"
  | "INVALID_TRANSACTION"
  | "RATE_LIMITED"
  | "SIGN_FAILED"
  | "METHOD_NOT_ALLOWED";

// ─── React hook ──────────────────────────────────────────────────────────────

export type GaslessTxStatus =
  | "idle"
  | "building"
  | "signing"
  | "sponsoring"
  | "submitting"
  | "confirming"
  | "confirmed"
  | "error";

export interface UseGaslessTransactionResult {
  status: GaslessTxStatus;
  signature: string | null;
  error: string | null;
  isLoading: boolean;
  sendGaslessTip: (params: SendGaslessTipParams) => Promise<string | null>;
  reset: () => void;
}

export interface SendGaslessTipParams {
  recipientAddress: string;
  /** Tip amount in raw token units (USDC: 1_000_000 = 1 USDC) */
  tipAmountRaw: number;
  feeToken?: string;
  /** URL of the sponsor API endpoint. Default: "/api/sponsor" */
  sponsorApiUrl?: string;
  /** URL to fetch sponsor public key. Default: "/api/sponsor-pubkey" */
  sponsorPubkeyUrl?: string;
}

// ─── Server route factory ────────────────────────────────────────────────────

export interface SponsorRouteConfig {
  /** Env var name holding the sponsor private key (base58). Default: "SPONSOR_PRIVATE_KEY" */
  privateKeyEnvVar?: string;
  /** Solana network. Default: value of NEXT_PUBLIC_SOLANA_NETWORK env var, or "devnet" */
  network?: "devnet" | "mainnet-beta";
  /** Max requests per IP per minute. Default: 10 */
  rateLimit?: number;
  /** Minimum sponsor SOL balance to accept requests (SOL). Default: 0.01 */
  minSolBalance?: number;
  /**
   * Fee config the client builds against. When provided, the route REJECTS any
   * transaction that does not pay the expected fee to the sponsor — this is what
   * stops the sponsor from co-signing (and paying gas for) arbitrary transactions.
   * Strongly recommended in production.
   */
  feeConfig?: LegionGaslessConfig;
  /** Max instructions allowed in a sponsored tx. Default: 6 (2 ATAs + fee + tip + slack). */
  maxInstructions?: number;
}
