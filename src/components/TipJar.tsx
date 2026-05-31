"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { toast } from "sonner";
import { ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";
import { LegionGasless } from "@/lib/legion-gasless";
import { LEGION_CONFIG, explorerUrl, truncateAddress } from "@/lib/solana";
import { isValidSolanaAddress, solToLamports } from "@/lib/utils";
import { cn } from "@/lib/cn";

const legionGasless = new LegionGasless(LEGION_CONFIG);

const QUICK_AMOUNTS = ["0.001", "0.01", "0.1", "1"];

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

  const touched = recipient.length > 0;
  const recipientValid = isValidSolanaAddress(recipient);
  const recipientError = touched && !recipientValid;
  const amount = parseFloat(amountSol);
  const amountValid = !isNaN(amount) && amount > 0;
  const canSend = connected && recipientValid && amountValid && !loading;

  const handleSend = useCallback(async () => {
    if (!canSend || !publicKey || !signTransaction) return;
    setLoading(true);
    setLastTxSig(null);

    try {
      const res = await fetch("/api/sponsor-pubkey");
      if (!res.ok) { toast.error("Sponsor service unavailable."); return; }
      const { publicKey: spk } = (await res.json()) as { publicKey: string };

      const tx = await legionGasless.buildGaslessTipTransaction({
        connection,
        sponsorPublicKey: new PublicKey(spk),
        senderPublicKey: publicKey,
        recipientPublicKey: new PublicKey(recipient),
        tipAmountLamports: solToLamports(amount),
      });

      const signed = await signTransaction(tx);
      const b64 = signed.serialize({ requireAllSignatures: false }).toString("base64");

      const sponsorRes = await fetch("/api/sponsor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction: b64 }),
      });
      const sponsorData = (await sponsorRes.json()) as { transaction?: string; error?: string };
      if (!sponsorRes.ok || !sponsorData.transaction) {
        toast.error(sponsorData.error ?? "Sponsor signing failed.");
        return;
      }

      const finalTx = Transaction.from(Buffer.from(sponsorData.transaction, "base64"));
      const sig = await connection.sendRawTransaction(finalTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });
      await connection.confirmTransaction(sig, "confirmed");
      setLastTxSig(sig);

      toast.success(
        <span className="flex flex-col gap-0.5">
          <span className="font-medium" style={{ fontFamily: "var(--font-heading)" }}>Tip sent.</span>
          <a href={explorerUrl(sig)} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs opacity-60 hover:opacity-100 underline">
            {truncateAddress(sig)} <ExternalLink className="w-3 h-3" />
          </a>
        </span>,
        { icon: <CheckCircle2 className="w-4 h-4" />, duration: 8000 }
      );
      setAmountSol("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const friendly =
        msg.includes("User rejected") || msg.includes("WalletSignTransactionError")
          ? "Transaction rejected."
          : msg.includes("insufficient funds")
          ? "Insufficient USDC balance for fee."
          : msg.includes("Blockhash not found") || msg.includes("block height exceeded")
          ? "Transaction expired — try again."
          : `Error: ${msg.slice(0, 80)}`;
      toast.error(friendly, { icon: <AlertCircle className="w-4 h-4" /> });
    } finally {
      setLoading(false);
    }
  }, [canSend, publicKey, signTransaction, connection, recipient, amount]);

  return (
    <div className="border border-[#e8e8e8] rounded-2xl p-6 sm:p-8 bg-white">
      <p
        className="text-[11px] uppercase tracking-widest text-[#aaa] mb-6"
        style={{ letterSpacing: "0.1em" }}
      >
        Send a tip
      </p>

      <div className="space-y-5">
        {/* Recipient */}
        <div>
          <label className="block text-sm font-medium text-black mb-2" style={{ fontFamily: "var(--font-heading)" }}>
            Recipient address
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            disabled={!!prefillRecipient || loading}
            placeholder="Solana wallet address (base58)"
            className={cn(
              "w-full bg-[#fafafa] border rounded-lg px-4 py-3 text-sm font-mono text-black placeholder-[#ccc] outline-none transition-all duration-150",
              recipientError
                ? "border-red-300 ring-2 ring-red-100"
                : "border-[#e8e8e8] focus:border-black focus:ring-2 focus:ring-black/5",
              (!!prefillRecipient || loading) && "opacity-50 cursor-not-allowed"
            )}
          />
          {recipientError && (
            <p className="flex items-center gap-1.5 text-red-500 text-xs mt-1.5">
              <AlertCircle className="w-3 h-3" /> Invalid Solana address
            </p>
          )}
          {prefillRecipient && recipientValid && (
            <p className="flex items-center gap-1.5 text-[#22c55e] text-xs mt-1.5">
              <CheckCircle2 className="w-3 h-3" /> Tipping {truncateAddress(prefillRecipient)}
            </p>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-black mb-2" style={{ fontFamily: "var(--font-heading)" }}>
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
              className="w-full bg-[#fafafa] border border-[#e8e8e8] rounded-lg px-4 py-3 text-sm font-mono text-black placeholder-[#ccc] outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all duration-150 pr-14 disabled:opacity-50"
            />
            <span
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#999]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              SOL
            </span>
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2 mt-2">
            {QUICK_AMOUNTS.map((val) => (
              <button
                key={val}
                onClick={() => setAmountSol(val)}
                disabled={loading}
                className={cn(
                  "flex-1 py-1.5 text-xs rounded-lg border transition-colors duration-150 font-mono",
                  amountSol === val
                    ? "bg-black text-white border-black"
                    : "bg-white text-[#888] border-[#e8e8e8] hover:border-black hover:text-black"
                )}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        {amountValid && (
          <div className="bg-[#fafafa] border border-[#f0f0f0] rounded-xl p-4 space-y-2">
            {[
              ["Tip amount", `${amount} SOL`],
              ["Gasless fee", "$0.05 USDC"],
              ["SOL gas", "Free (sponsored)"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center">
                <span className="text-xs text-[#999]">{k}</span>
                <span
                  className={cn(
                    "text-xs font-mono",
                    k === "SOL gas" ? "text-[#22c55e]" : "text-black"
                  )}
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            "w-full py-3.5 px-6 rounded-xl text-sm font-medium transition-all duration-150",
            canSend
              ? "bg-black text-white hover:opacity-75"
              : "bg-[#f0f0f0] text-[#bbb] cursor-not-allowed"
          )}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {loading
            ? "Submitting..."
            : !connected
            ? "Connect wallet to send"
            : "Send tip →"}
        </button>

        {/* Last tx */}
        {lastTxSig && (
          <a
            href={explorerUrl(lastTxSig)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs text-[#999] hover:text-black transition-colors underline underline-offset-2"
          >
            View last transaction <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
