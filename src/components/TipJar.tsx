"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";
import { useGaslessTransaction } from "@legion/gasless/react";
import { LEGION_CONFIG, explorerUrl, truncateAddress } from "@/lib/solana";
import { isValidSolanaAddress, usdcToRaw } from "@/lib/utils";
import { cn } from "@/lib/cn";

const QUICK_AMOUNTS = ["0.5", "1", "5", "10"];

const STATUS_LABELS: Record<string, string> = {
  building:   "Building transaction...",
  signing:    "Sign in wallet...",
  sponsoring: "Sponsor co-signing...",
  submitting: "Submitting to Solana...",
  confirming: "Confirming...",
};

interface TipJarProps {
  prefillRecipient?: string;
}

export function TipJar({ prefillRecipient }: TipJarProps) {
  const { connected } = useWallet();
  const { sendGaslessTip, status, signature, error, reset, isLoading } =
    useGaslessTransaction(LEGION_CONFIG);

  const [recipient, setRecipient] = useState(prefillRecipient ?? "");
  const [amountUsdc, setAmountUsdc] = useState("");

  useEffect(() => {
    if (prefillRecipient) setRecipient(prefillRecipient);
  }, [prefillRecipient]);

  // Surface errors as toasts
  useEffect(() => {
    if (status === "error" && error) {
      toast.error(error, { icon: <AlertCircle className="w-4 h-4" /> });
      reset();
    }
  }, [status, error, reset]);

  // Surface success as toast
  useEffect(() => {
    if (status === "confirmed" && signature) {
      toast.success(
        <span className="flex flex-col gap-0.5">
          <span className="font-medium" style={{ fontFamily: "var(--font-heading)" }}>
            Tip sent.
          </span>
          <a
            href={explorerUrl(signature)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs opacity-60 hover:opacity-100 underline"
          >
            {truncateAddress(signature)} <ExternalLink className="w-3 h-3" />
          </a>
        </span>,
        { icon: <CheckCircle2 className="w-4 h-4" />, duration: 8000 }
      );
      setAmountUsdc("");
    }
  }, [status, signature]);

  const touched = recipient.length > 0;
  const recipientValid = isValidSolanaAddress(recipient);
  const recipientError = touched && !recipientValid;
  const amount = parseFloat(amountUsdc);
  const amountValid = !isNaN(amount) && amount > 0;
  const canSend = connected && recipientValid && amountValid && !isLoading;

  const handleSend = async () => {
    if (!canSend) return;
    await sendGaslessTip({
      recipientAddress: recipient,
      tipAmountRaw: usdcToRaw(amount),
    });
  };

  const buttonLabel = isLoading
    ? (STATUS_LABELS[status] ?? "Processing...")
    : !connected
    ? "Connect wallet to send"
    : "Send tip →";

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
          <label
            className="block text-sm font-medium text-black mb-2"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Recipient address
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            disabled={!!prefillRecipient || isLoading}
            placeholder="Solana wallet address (base58)"
            className={cn(
              "w-full bg-[#fafafa] border rounded-lg px-4 py-3 text-sm font-mono text-black placeholder-[#ccc] outline-none transition-all duration-150",
              recipientError
                ? "border-red-300 ring-2 ring-red-100"
                : "border-[#e8e8e8] focus:border-black focus:ring-2 focus:ring-black/5",
              (!!prefillRecipient || isLoading) && "opacity-50 cursor-not-allowed"
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
          <label
            className="block text-sm font-medium text-black mb-2"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Amount
          </label>
          <div className="relative">
            <input
              type="number"
              value={amountUsdc}
              onChange={(e) => setAmountUsdc(e.target.value)}
              disabled={isLoading}
              placeholder="1.00"
              min="0.000001"
              step="0.01"
              className="w-full bg-[#fafafa] border border-[#e8e8e8] rounded-lg px-4 py-3 text-sm font-mono text-black placeholder-[#ccc] outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all duration-150 pr-14 disabled:opacity-50"
            />
            <span
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#999]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              USDC
            </span>
          </div>

          <div className="flex gap-2 mt-2">
            {QUICK_AMOUNTS.map((val) => (
              <button
                key={val}
                onClick={() => setAmountUsdc(val)}
                disabled={isLoading}
                className={cn(
                  "flex-1 py-1.5 text-xs rounded-lg border transition-colors duration-150 font-mono",
                  amountUsdc === val
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
              ["Tip amount", `${amount} USDC`],
              ["Gasless fee", "0.05 USDC"],
              ["SOL gas", "Free (sponsored)"],
              ["Total", `${(amount + 0.05).toFixed(2)} USDC`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-xs text-[#999]">{k}</span>
                <span
                  className={cn("text-xs font-mono", k === "SOL gas" ? "text-[#22c55e]" : "text-black")}
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
          {buttonLabel}
        </button>

        {/* Last tx link */}
        {status === "confirmed" && signature && (
          <a
            href={explorerUrl(signature)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs text-[#999] hover:text-black transition-colors underline underline-offset-2"
          >
            View on Solana Explorer <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
