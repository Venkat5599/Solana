import {
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
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
 * - instruction[0] = idempotent create of the sponsor's fee ATA
 * - instruction[1] = SPL token fee transfer: sender → sponsor
 * - instruction[2] = idempotent create of the recipient's token ATA
 * - instruction[3] = SPL token tip transfer: sender → recipient
 *
 * Both fee and tip are paid in the same SPL token (e.g. USDC), so the sender
 * needs ZERO SOL — gas is sponsored, everything else is token.
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
 *   tipAmountRaw: 1_000_000,
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
   * instruction[0]: create ATA (idem.)  ← ensures sponsor fee ATA exists
   * instruction[1]: SPL transfer        ← sender pays USDC fee to sponsor
   * instruction[2]: create ATA (idem.)  ← ensures recipient token ATA exists
   * instruction[3]: SPL transfer        ← sender tips recipient in USDC
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
      tipAmountRaw,
      feeToken,
    } = params;

    const tokenName = feeToken ?? this.defaultFeeToken;
    const feeConfig = this.getFeeForToken(tokenName);
    const mintPubkey = new PublicKey(feeConfig.mintAddress);

    // Fee in raw token units (USDC: 6 decimals)
    const feeAmountRaw = Math.round(feeConfig.amount * 10 ** USDC_DECIMALS);

    const [senderAta, sponsorAta, recipientAta] = await Promise.all([
      getAssociatedTokenAddress(mintPubkey, senderPublicKey, false, TOKEN_PROGRAM_ID),
      getAssociatedTokenAddress(mintPubkey, sponsorPublicKey, false, TOKEN_PROGRAM_ID),
      getAssociatedTokenAddress(mintPubkey, recipientPublicKey, false, TOKEN_PROGRAM_ID),
    ]);

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");

    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: sponsorPublicKey,
    });

    // instruction[0]: ensure the sponsor's fee ATA exists (idempotent no-op if
    // already created). Sponsor is feePayer, so the sponsor pays the rent — a
    // fresh sponsor wallet can still receive the very first fee without a
    // manual setup step.
    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(
        sponsorPublicKey, // payer (feePayer covers rent)
        sponsorAta,
        sponsorPublicKey, // owner
        mintPubkey,
        TOKEN_PROGRAM_ID
      )
    );

    // instruction[1]: USDC fee — sender → sponsor
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

    // instruction[2]: ensure the recipient's token ATA exists (idempotent).
    // Sponsor pays the rent so the fan never needs SOL — even to tip a brand
    // new creator who has never received this token before.
    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(
        sponsorPublicKey, // payer (feePayer covers rent)
        recipientAta,
        recipientPublicKey, // owner
        mintPubkey,
        TOKEN_PROGRAM_ID
      )
    );

    // instruction[3]: the tip itself — SPL token transfer sender → recipient.
    // Denominated in the same token as the fee (USDC), so the fan needs ZERO
    // SOL: gas is sponsored, fee + tip are both paid in token.
    tx.add(
      createTransferInstruction(
        senderAta,
        recipientAta,
        senderPublicKey,
        tipAmountRaw,
        [],
        TOKEN_PROGRAM_ID
      )
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
