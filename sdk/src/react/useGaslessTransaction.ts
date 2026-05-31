import { useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { LegionGasless } from "../LegionGasless";
import type {
  LegionGaslessConfig,
  GaslessTxStatus,
  UseGaslessTransactionResult,
  SendGaslessTipParams,
  SponsorResponse,
  SponsorErrorResponse,
} from "../types";

/**
 * React hook for sending gasless Solana tip transactions.
 *
 * Handles the full flow: build → user sign → sponsor co-sign → submit → confirm.
 *
 * @example
 * ```tsx
 * import { useGaslessTransaction } from "@legion/gasless/react";
 *
 * const LEGION_CONFIG = {
 *   gasless: {
 *     fees: [{ token: "USDC", mintAddress: "4zMMC9...", amount: 0.05 }],
 *     defaultFeeToken: "USDC",
 *   },
 * };
 *
 * function TipButton({ recipient }: { recipient: string }) {
 *   const { sendGaslessTip, status, signature, error } = useGaslessTransaction(LEGION_CONFIG);
 *
 *   return (
 *     <button
 *       onClick={() =>
 *         sendGaslessTip({ recipientAddress: recipient, tipAmountLamports: 100_000 })
 *       }
 *       disabled={status !== "idle"}
 *     >
 *       {status === "idle" ? "Send Tip" : status}
 *     </button>
 *   );
 * }
 * ```
 */
export function useGaslessTransaction(
  config: LegionGaslessConfig
): UseGaslessTransactionResult {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  const [status, setStatus] = useState<GaslessTxStatus>("idle");
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setSignature(null);
    setError(null);
  }, []);

  const sendGaslessTip = useCallback(
    async (params: SendGaslessTipParams): Promise<string | null> => {
      const {
        recipientAddress,
        tipAmountLamports,
        feeToken,
        sponsorApiUrl = "/api/sponsor",
        sponsorPubkeyUrl = "/api/sponsor-pubkey",
      } = params;

      if (!publicKey || !signTransaction) {
        setError("Wallet not connected.");
        setStatus("error");
        return null;
      }

      try {
        // 1. Fetch sponsor public key
        setStatus("building");
        const pkRes = await fetch(sponsorPubkeyUrl);
        if (!pkRes.ok) throw new Error("Could not reach sponsor service.");
        const { publicKey: sponsorPkStr } = (await pkRes.json()) as { publicKey: string };

        // 2. Build gasless transaction
        const legion = new LegionGasless(config);
        const { transaction } = await legion.buildGaslessTipTransaction({
          connection,
          sponsorPublicKey: new PublicKey(sponsorPkStr),
          senderPublicKey: publicKey,
          recipientPublicKey: new PublicKey(recipientAddress),
          tipAmountLamports,
          feeToken,
        });

        // 3. User partially signs (approves USDC fee + tip)
        setStatus("signing");
        const userSigned = await signTransaction(transaction);
        const txB64 = userSigned
          .serialize({ requireAllSignatures: false })
          .toString("base64");

        // 4. Sponsor co-signs
        setStatus("sponsoring");
        const sponsorRes = await fetch(sponsorApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transaction: txB64 }),
        });
        const sponsorData = (await sponsorRes.json()) as
          | SponsorResponse
          | SponsorErrorResponse;

        if (!sponsorRes.ok || !("transaction" in sponsorData)) {
          const errData = sponsorData as SponsorErrorResponse;
          throw new Error(errData.error ?? "Sponsor signing failed.");
        }

        // 5. Submit
        setStatus("submitting");
        const finalTx = Transaction.from(
          Buffer.from((sponsorData as SponsorResponse).transaction, "base64")
        );
        const sig = await connection.sendRawTransaction(finalTx.serialize(), {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        });

        // 6. Confirm
        setStatus("confirming");
        await connection.confirmTransaction(sig, "confirmed");

        setSignature(sig);
        setStatus("confirmed");
        return sig;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(humanizeError(msg));
        setStatus("error");
        return null;
      }
    },
    [config, connection, publicKey, signTransaction]
  );

  return {
    status,
    signature,
    error,
    isLoading: !["idle", "confirmed", "error"].includes(status),
    sendGaslessTip,
    reset,
  };
}

function humanizeError(msg: string): string {
  if (msg.includes("User rejected") || msg.includes("WalletSignTransactionError"))
    return "Transaction rejected by user.";
  if (msg.includes("insufficient funds"))
    return "Insufficient USDC balance for fee.";
  if (msg.includes("Blockhash not found") || msg.includes("block height exceeded"))
    return "Transaction expired — please try again.";
  return msg.slice(0, 120);
}
