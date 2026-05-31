import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export interface LegionFeeToken {
  token: string;
  mintAddress: string;
  /** Amount in token units (e.g. 0.05 = $0.05 USDC) */
  amount: number;
}

export interface LegionGaslessConfig {
  gasless: {
    fees: LegionFeeToken[];
    defaultFeeToken: string;
  };
}

export interface BuildGaslessTxParams {
  connection: Connection;
  sponsorPublicKey: PublicKey;
  senderPublicKey: PublicKey;
  recipientPublicKey: PublicKey;
  /** Tip amount in lamports */
  tipAmountLamports: number;
  feeToken?: string;
}

const USDC_DECIMALS = 6;

export class LegionGasless {
  private readonly config: LegionGaslessConfig;

  constructor(config: LegionGaslessConfig) {
    this.config = config;
  }

  getFeeForToken(tokenName: string): LegionFeeToken {
    const fee = this.config.gasless.fees.find(
      (f) => f.token.toUpperCase() === tokenName.toUpperCase()
    );
    if (!fee) {
      throw new Error(
        `Fee token "${tokenName}" not found in Legion config. Available: ${this.config.gasless.fees.map((f) => f.token).join(", ")}`
      );
    }
    return fee;
  }

  get defaultFeeToken(): string {
    return this.config.gasless.defaultFeeToken;
  }

  /**
   * Build a gasless tip transaction.
   *
   * Transaction structure:
   *   feePayer = sponsorPublicKey (covers SOL network fee)
   *   instruction[0]: SPL token transfer — sender pays USDC fee to sponsor
   *   instruction[1]: SOL system transfer — sender tips recipient
   *
   * The caller must:
   *   1. Have the user partially sign this tx (user approves USDC fee + tip)
   *   2. Send to /api/sponsor for sponsor co-signature
   *   3. Submit the dual-signed tx to the network
   */
  async buildGaslessTipTransaction(
    params: BuildGaslessTxParams
  ): Promise<Transaction> {
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

    // Fee amount in smallest token unit (USDC uses 6 decimals)
    const feeAmountRaw = Math.round(feeConfig.amount * 10 ** USDC_DECIMALS);

    // Get/derive ATA addresses for fee transfer
    const senderAta = await getAssociatedTokenAddress(
      mintPubkey,
      senderPublicKey,
      false,
      TOKEN_PROGRAM_ID
    );
    const sponsorAta = await getAssociatedTokenAddress(
      mintPubkey,
      sponsorPublicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");

    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: sponsorPublicKey,
    });

    // instruction[0]: USDC fee — user → sponsor
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

    // instruction[1]: SOL tip — user → recipient
    tx.add(
      SystemProgram.transfer({
        fromPubkey: senderPublicKey,
        toPubkey: recipientPublicKey,
        lamports: tipAmountLamports,
      })
    );

    // Attach lastValidBlockHeight so callers can detect expiry
    (tx as Transaction & { lastValidBlockHeight: number }).lastValidBlockHeight =
      lastValidBlockHeight;

    return tx;
  }
}
