"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { toast } from "sonner";
import { Send, Loader2, ExternalLink } from "lucide-react";
import { LegionGasless } from "@/lib/legion-gasless";
import { LEGION_CONFIG, explorerUrl, truncateAddress, SOLANA_NETWORK } from "@/lib/solana";
import { isValidSolanaAddress, solToLamports } from "@/lib/utils";

const legionGasless = new LegionGasless(LEGION_CONFIG);

interface TipJarProps {
  prefillRecipient?: string;
}

export function TipJar({ prefillRecipient }: TipJarProps) {
  const { connection } = useConnection();
  const { publicKey, signTransaction, connected } = useWallet();

  const [recipient, setRecipient] = useState(prefillRecipient ?? "");
  const [amountSol, setAmountSol] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (prefillRecipient) setRecipient(prefillRecipient);
  }, [prefillRecipient]);

  const recipientValid = isValidSolanaAddress(recipient);
  const amount = parseFloat(amountSol);
  const amountValid = !isNaN(amount) && amount > 0;
  const canSend = connected && recipientValid && amountValid && !loading;

  const handleSend = useCallback(async () => {
    if (!canSend || !publicKey || !signTransaction) return;

    setLoading(true);
    try {
      const sponsorRes = await fetch("/api/sponsor-pubkey");
      if (!sponsorRes.ok) {
        toast.error("Could not reach sponsor service.");
        return;
      }
      const { publicKey: sponsorPubkeyStr } = await sponsorRes.json() as { publicKey: string };
      const sponsorPublicKey = new PublicKey(sponsorPubkeyStr);
      const recipientPublicKey = new PublicKey(recipient);

      const tx = await legionGasless.buildGaslessTipTransaction({
        connection,
        sponsorPublicKey,
        senderPublicKey: publicKey,
        recipientPublicKey,
        tipAmountLamports: solToLamports(amount),
      });

      // User partially signs (approves USDC fee + tip)
      const userSignedTx = await signTransaction(tx);
      const txBase64 = userSignedTx.serialize({ requireAllSignatures: false }).toString("base64");

      // Sponsor co-signs server-side
      const sponsorRes2 = await fetch("/api/sponsor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction: txBase64 }),
      });

      const sponsorData = await sponsorRes2.json() as { transaction?: string; error?: string; code?: string };

      if (!sponsorRes2.ok || !sponsorData.transaction) {
        const msg = sponsorData.error ?? "Sponsor signing failed.";
        toast.error(msg);
        return;
      }

      // Submit dual-signed tx
      const signedBuffer = Buffer.from(sponsorData.transaction, "base64");
      const signedTx = Transaction.from(signedBuffer);
      const rawTx = signedTx.serialize();

      const signature = await connection.sendRawTransaction(rawTx, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      await connection.confirmTransaction(signature, "confirmed");

      const url = explorerUrl(signature);
      toast.success(
        <span>
          Tip sent!{" "}
          <a href={url} target="_blank" rel="noopener noreferrer" className="underline flex items-center gap-1 inline-flex">
            View on Explorer <ExternalLink className="w-3 h-3" />
          </a>
        </span>
      );

      setAmountSol("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("User rejected") || message.includes("WalletSignTransactionError")) {
        toast.error("Transaction rejected.");
      } else if (message.includes("insufficient funds")) {
        toast.error("Insufficient USDC balance for fee.");
      } else if (message.includes("Blockhash not found") || message.includes("block height exceeded")) {
        toast.error("Transaction expired — please try again.");
      } else {
        toast.error(`Transaction failed: ${message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [canSend, publicKey, signTransaction, connection, recipient, amount]);

  return (
    <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-2xl p-6 w-full max-w-md mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Send a Tip</h2>
        <p className="text-sm text-gray-400">
          No SOL required — fee paid in USDC on{" "}
          <span className="text-[#14F195] font-medium">{SOLANA_NETWORK}</span>
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            disabled={!!prefillRecipient || loading}
            placeholder="Solana wallet address (base58)"
            className={`w-full bg-[#0f0f13] border rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 transition-colors ${
              recipient && !recipientValid
                ? "border-red-500 focus:ring-red-500/30"
                : "border-[#2a2a3a] focus:ring-[#9945FF]/40 focus:border-[#9945FF]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          />
          {recipient && !recipientValid && (
            <p className="text-red-400 text-xs mt-1">Invalid Solana address</p>
          )}
          {prefillRecipient && recipientValid && (
            <p className="text-[#14F195] text-xs mt-1">
              Tipping {truncateAddress(prefillRecipient)}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Amount (SOL)
          </label>
          <div className="relative">
            <input
              type="number"
              value={amountSol}
              onChange={(e) => setAmountSol(e.target.value)}
              disabled={loading}
              placeholder="0.001"
              min="0.000001"
              step="0.001"
              className="w-full bg-[#0f0f13] border border-[#2a2a3a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#9945FF]/40 focus:border-[#9945FF] transition-colors disabled:opacity-50 pr-14"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
              SOL
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-1">+ 0.05 USDC gasless fee</p>
        </div>

        <button
          onClick={handleSend}
          disabled={!canSend}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#9945FF] to-[#7c3aed] hover:from-[#8b3cf7] hover:to-[#6d28d9] disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 text-sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              {connected ? "Send Tip" : "Connect Wallet to Send"}
            </>
          )}
        </button>

        {!connected && (
          <p className="text-center text-gray-500 text-xs">
            Connect your wallet above to send a tip
          </p>
        )}
      </div>
    </div>
  );
}
