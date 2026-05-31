import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type {
  LegionGaslessConfig,
  LegionFeeToken,
  BuildGaslessTxParams,
  GaslessTransaction,
} from "./types";

const USDC_DECIMALS = 6;

/**
 * Legion Gasless SDK — core transaction builder.
 *
 * Constructs atomic Solana transactions where:
 * - `feePayer` = sponsor wallet (covers SOL network gas)
 * - instruction[0] = SPL token fee transfer: sender → sponsor
 * - instruction[1] = SOL tip transfer: sender → recipient
 *
 * @example
 * ```ts
 * import { LegionGasless } from "@legion/gasless";
 *
 * const legion = new LegionGasless({
 *   gasless: {
 *     fees: [{ token: "USDC", mintAddress: "EPjFWdd5...", amount: 0.05 }],
 *     defaultFeeToken: "USDC",
 *   },
 * });
 *
 * const { transaction } = await legion.buildGaslessTipTransaction({
 *   connection,
 *   sponsorPublicKey,
 *   senderPublicKey,
 *   recipientPublicKey,
 *   tipAmountLamports: 100_000,
 * });
 *
 * const userSigned = await wallet.signTransaction(transaction);
 * // → POST to /api/sponsor → sponsor co-signs → submit
 * ```
 */
export class LegionGasless {
  private readonly config: LegionGaslessConfig;

  constructor(config: LegionGaslessConfig) {
    this.validateConfig(config);
    this.config = config;
  }

  /** Returns fee config for the given token name (case-insensitive). */
  getFeeForToken(tokenName: string): LegionFeeToken {
    const fee = this.config.gasless.fees.find(
      (f) => f.token.toUpperCase() === tokenName.toUpperCase()
    );
    if (!fee) {
      const available = this.config.gasless.fees.map((f) => f.token).join(", ");
      throw new Error(
        `[LegionGasless] Fee token "${tokenName}" not in config. Available: ${available}`
      );
    }
    return fee;
  }

  get defaultFeeToken(): string {
    return this.config.gasless.defaultFeeToken;
  }

  get supportedTokens(): string[] {
    return this.config.gasless.fees.map((f) => f.token);
  }

  /**
   * Build a gasless tip transaction.
   *
   * Transaction anatomy:
   * ```
   * feePayer: sponsorPublicKey          ← covers ~5000 lamports SOL gas
   * instruction[0]: SPL transfer        ← sender pays USDC fee to sponsor
   * instruction[1]: System transfer     ← sender tips recipient in SOL
   * ```
   *
   * After calling this:
   * 1. Have the user sign via `wallet.signTransaction(tx)` (partial sign)
   * 2. POST serialized tx to your sponsor API endpoint
   * 3. Sponsor co-signs and returns the dual-signed tx
   * 4. Submit via `connection.sendRawTransaction()`
   */
  async buildGaslessTipTransaction(
    params: BuildGaslessTxParams
  ): Promise<GaslessTransaction> {
    const {
      connection,
      sponsorPublicKey,
      senderPublicKey,
      recipientPublicKey,
      tipAmountLamports,
      feeToken,
    } = params;

    const tokenName = feeToken ?? this.defaultFeeToken;
    const feeConfig = this.getFeeForToken(tokenName);
    const mintPubkey = new PublicKey(feeConfig.mintAddress);

    // Fee in raw token units (USDC: 6 decimals)
    const feeAmountRaw = Math.round(feeConfig.amount * 10 ** USDC_DECIMALS);

    const [senderAta, sponsorAta] = await Promise.all([
      getAssociatedTokenAddress(mintPubkey, senderPublicKey, false, TOKEN_PROGRAM_ID),
      getAssociatedTokenAddress(mintPubkey, sponsorPublicKey, false, TOKEN_PROGRAM_ID),
    ]);

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");

    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: sponsorPublicKey,
    });

    // instruction[0]: USDC fee — sender → sponsor
    tx.add(
      createTransferInstruction(
        senderAta,
        sponsorAta,
        senderPublicKey,
        feeAmountRaw,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // instruction[1]: SOL tip — sender → recipient
    tx.add(
      SystemProgram.transfer({
        fromPubkey: senderPublicKey,
        toPubkey: recipientPublicKey,
        lamports: tipAmountLamports,
      })
    );

    return {
      transaction: tx,
      expiresAt: Date.now() + 90_000, // conservative 90s (blockhash valid ~120s)
    };
  }

  private validateConfig(config: LegionGaslessConfig): void {
    if (!config?.gasless?.fees?.length) {
      throw new Error("[LegionGasless] config.gasless.fees must be a non-empty array");
    }
    const hasDefault = config.gasless.fees.some(
      (f) => f.token.toUpperCase() === config.gasless.defaultFeeToken.toUpperCase()
    );
    if (!hasDefault) {
      throw new Error(
        `[LegionGasless] defaultFeeToken "${config.gasless.defaultFeeToken}" not found in fees array`
      );
    }
  }
}
