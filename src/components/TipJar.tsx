"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { toast } from "sonner";
import { Send, Loader2, ExternalLink, AlertCircle, CheckCircle2, Zap } from "lucide-react";
import { LegionGasless } from "@/lib/legion-gasless";
import { LEGION_CONFIG, explorerUrl, truncateAddress, SOLANA_NETWORK } from "@/lib/solana";
import { isValidSolanaAddress, solToLamports } from "@/lib/utils";
import { cn } from "@/lib/cn";

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
  const [lastTxSig, setLastTxSig] = useState<string | null>(null);

  useEffect(() => {
    if (prefillRecipient) setRecipient(prefillRecipient);
  }, [prefillRecipient]);

  const recipientTouched = recipient.length > 0;
  const recipientValid = isValidSolanaAddress(recipient);
  const recipientError = recipientTouched && !recipientValid;

  const amount = parseFloat(amountSol);
  const amountValid = !isNaN(amount) && amount > 0;
  const canSend = connected && recipientValid && amountValid && !loading;

  const handleSend = useCallback(async () => {
    if (!canSend || !publicKey || !signTransaction) return;
    setLoading(true);
    setLastTxSig(null);

    try {
      const sponsorRes = await fetch("/api/sponsor-pubkey");
      if (!sponsorRes.ok) {
        toast.error("Sponsor service unavailable.", { icon: <AlertCircle className="w-4 h-4" /> });
        return;
      }
      const { publicKey: sponsorPubkeyStr } = (await sponsorRes.json()) as { publicKey: string };
      const sponsorPublicKey = new PublicKey(sponsorPubkeyStr);
      const recipientPublicKey = new PublicKey(recipient);

      const tx = await legionGasless.buildGaslessTipTransaction({
        connection,
        sponsorPublicKey,
        senderPublicKey: publicKey,
        recipientPublicKey,
        tipAmountLamports: solToLamports(amount),
      });

      const userSignedTx = await signTransaction(tx);
      const txBase64 = userSignedTx
        .serialize({ requireAllSignatures: false })
        .toString("base64");

      const sponsorResponse = await fetch("/api/sponsor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction: txBase64 }),
      });

      const sponsorData = (await sponsorResponse.json()) as {
        transaction?: string;
        error?: string;
        code?: string;
      };

      if (!sponsorResponse.ok || !sponsorData.transaction) {
        toast.error(sponsorData.error ?? "Sponsor signing failed.", {
          icon: <AlertCircle className="w-4 h-4" />,
        });
        return;
      }

      const signedBuffer = Buffer.from(sponsorData.transaction, "base64");
      const signedTx = Transaction.from(signedBuffer);
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      await connection.confirmTransaction(signature, "confirmed");
      setLastTxSig(signature);

      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Tip sent! ⚡</span>
          <a
            href={explorerUrl(signature)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs opacity-70 hover:opacity-100 underline"
          >
            {truncateAddress(signature)} <ExternalLink className="w-3 h-3" />
          </a>
        </div>,
        { icon: <CheckCircle2 className="w-4 h-4 text-[#14F195]" />, duration: 8000 }
      );

      setAmountSol("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const friendly = message.includes("User rejected") || message.includes("WalletSignTransactionError")
        ? "Transaction rejected."
        : message.includes("insufficient funds")
        ? "Insufficient USDC balance for fee."
        : message.includes("Blockhash not found") || message.includes("block height exceeded")
        ? "Transaction expired — please try again."
        : `Error: ${message.slice(0, 60)}`;
      toast.error(friendly, { icon: <AlertCircle className="w-4 h-4" /> });
    } finally {
      setLoading(false);
    }
  }, [canSend, publicKey, signTransaction, connection, recipient, amount]);

  return (
    <div className="glass gradient-border rounded-2xl p-6 shadow-card">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-[#9945FF]" />
          <h2 className="text-lg font-bold text-white">Send a Tip</h2>
        </div>
        <p className="text-sm text-[#8b8b9e]">
          Gas covered by sponsor · 0.05 USDC fee · {SOLANA_NETWORK}
        </p>
      </div>

      {/* Form */}
      <div className="space-y-4">
        {/* Recipient */}
        <div>
          <label className="block text-xs font-semibold text-[#8b8b9e] uppercase tracking-wider mb-2">
            Recipient
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            disabled={!!prefillRecipient || loading}
            placeholder="Solana wallet address"
            className={cn(
              "input-field font-mono text-xs",
              recipientError && "error",
              prefillRecipient && "opacity-60 cursor-not-allowed"
            )}
          />
          {recipientError && (
            <p className="flex items-center gap-1 text-red-400 text-xs mt-1.5">
              <AlertCircle className="w-3 h-3" /> Invalid Solana address
            </p>
          )}
          {prefillRecipient && recipientValid && (
            <p className="flex items-center gap-1 text-[#14F195] text-xs mt-1.5">
              <CheckCircle2 className="w-3 h-3" />
              Tipping {truncateAddress(prefillRecipient)}
            </p>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-[#8b8b9e] uppercase tracking-wider mb-2">
            Amount
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
              className="input-field pr-16"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8b8b9e] tracking-wide">
              SOL
            </span>
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2 mt-2">
            {["0.001", "0.01", "0.1", "1"].map((val) => (
              <button
                key={val}
                onClick={() => setAmountSol(val)}
                disabled={loading}
                className="flex-1 py-1.5 text-xs rounded-lg border border-[#1e1e2e] bg-[#0d0d14] text-[#8b8b9e] hover:border-[#9945FF]/50 hover:text-white hover:bg-[#9945FF]/08 transition-all duration-200 disabled:opacity-40"
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        {amountValid && (
          <div className="rounded-xl bg-[#0d0d14] border border-[#1e1e2e] p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-[#8b8b9e]">Tip amount</span>
              <span className="text-white font-mono font-medium">{amount} SOL</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#8b8b9e]">Gasless fee (USDC)</span>
              <span className="text-white font-mono">$0.05</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#8b8b9e]">SOL gas</span>
              <span className="text-[#14F195] font-medium">Free (sponsored)</span>
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            "btn-primary w-full flex items-center justify-center gap-2 text-sm",
            loading && "opacity-80 cursor-wait"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting to Solana...
            </>
          ) : !connected ? (
            "Connect wallet to send"
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send Tip
            </>
          )}
        </button>

        {/* Last tx */}
        {lastTxSig && (
          <a
            href={explorerUrl(lastTxSig)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs text-[#14F195] hover:text-white transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            View last transaction on Explorer
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
