"use client";

import { useSearchParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { TipJar } from "./TipJar";
import { TipHistory } from "./TipHistory";
import { truncateAddress, SOLANA_NETWORK } from "@/lib/solana";
import { Copy, Github, Zap } from "lucide-react";
import { useState } from "react";

export function TipJarPage() {
  const searchParams = useSearchParams();
  const prefillRecipient = searchParams.get("to") ?? undefined;
  const { publicKey, connected } = useWallet();
  const [copied, setCopied] = useState(false);

  const tipJarUrl =
    typeof window !== "undefined" && publicKey
      ? `${window.location.origin}/?to=${publicKey.toBase58()}`
      : null;

  const handleCopy = () => {
    if (!tipJarUrl) return;
    navigator.clipboard.writeText(tipJarUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#9945FF] rounded-full opacity-[0.06] blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#14F195] rounded-full opacity-[0.04] blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#9945FF] rounded-full opacity-[0.02] blur-[160px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(rgba(153,69,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(153,69,255,0.5) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-[#1e1e2e]/60 glass-strong">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#9945FF] to-[#14F195] flex items-center justify-center shadow-glow-purple">
              <Zap className="w-4 h-4 text-white" fill="white" />
            </div>
            <div>
              <span className="font-bold text-white text-sm tracking-tight">Gasless Tip Jar</span>
              <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded-full border border-[#14F195]/30 text-[#14F195] bg-[#14F195]/05">
                {SOLANA_NETWORK}
              </span>
            </div>
          </div>

          {/* Right: address + wallet btn */}
          <div className="flex items-center gap-3">
            {connected && publicKey && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#13131a] border border-[#1e1e2e]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#14F195] animate-pulse" />
                <span className="text-xs text-[#8b8b9e] font-mono">
                  {truncateAddress(publicKey.toBase58())}
                </span>
              </div>
            )}
            <WalletMultiButton
              style={{
                height: "40px",
                fontSize: "13px",
                padding: "0 18px",
                borderRadius: "12px",
                fontWeight: "600",
              }}
            />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        {/* Hero section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#9945FF]/30 bg-[#9945FF]/08 mb-6">
            <Zap className="w-3 h-3 text-[#9945FF]" />
            <span className="text-xs font-medium text-[#9945FF]">Powered by Legion Gasless Protocol</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4 tracking-tight leading-tight">
            Tip on Solana
            <br />
            <span className="gradient-text">without SOL</span>
          </h1>
          <p className="text-[#8b8b9e] text-lg max-w-md mx-auto leading-relaxed">
            Send on-chain tips using only USDC. Gas is covered by the sponsor wallet — atomically, in the same transaction.
          </p>
        </div>

        {/* Two-column layout on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* Left col: Tip form */}
          <div className="lg:col-span-3">
            <TipJar prefillRecipient={prefillRecipient} />
          </div>

          {/* Right col: Info + History */}
          <div className="lg:col-span-2 space-y-4">
            {/* How it works */}
            <div className="glass rounded-2xl p-5 border border-[#1e1e2e]">
              <h3 className="text-sm font-semibold text-white mb-4">How it works</h3>
              <div className="space-y-3">
                {[
                  { step: "1", label: "Connect wallet", sub: "Phantom or Solflare" },
                  { step: "2", label: "Enter tip amount", sub: "In SOL, any amount" },
                  { step: "3", label: "Sign once", sub: "No SOL needed — just USDC" },
                  { step: "4", label: "Confirmed on-chain", sub: "~2s on Solana devnet" },
                ].map(({ step, label, sub }) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#9945FF] to-[#7c3aed] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-white">{step}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{label}</p>
                      <p className="text-xs text-[#8b8b9e] mt-0.5">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fee breakdown */}
            <div className="glass rounded-2xl p-5 border border-[#1e1e2e]">
              <h3 className="text-sm font-semibold text-white mb-3">Fee breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#8b8b9e]">Solana network fee</span>
                  <span className="text-[#14F195] font-mono text-xs">~$0.0007 SOL</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#8b8b9e]">Covered by</span>
                  <span className="text-white font-medium text-xs">Sponsor wallet ✓</span>
                </div>
                <div className="h-px bg-[#1e1e2e] my-2" />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#8b8b9e]">You pay (USDC fee)</span>
                  <span className="text-white font-mono font-semibold">$0.05</span>
                </div>
              </div>
            </div>

            {/* Share tip jar */}
            {connected && publicKey && tipJarUrl && (
              <div className="glass rounded-2xl p-5 border border-[#9945FF]/20 bg-[#9945FF]/04">
                <h3 className="text-sm font-semibold text-white mb-1">Your tip jar link</h3>
                <p className="text-xs text-[#8b8b9e] mb-3">Share this — fans tip you directly</p>
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0 bg-[#0d0d14] border border-[#1e1e2e] rounded-lg px-3 py-2">
                    <p className="text-[#14F195] text-xs font-mono truncate">{tipJarUrl}</p>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex-shrink-0 px-3 py-2 rounded-lg border border-[#9945FF]/40 bg-[#9945FF]/10 hover:bg-[#9945FF]/20 text-[#9945FF] transition-all duration-200"
                  >
                    {copied ? (
                      <span className="text-xs font-medium text-[#14F195]">✓</span>
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* History */}
            <TipHistory />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#1e1e2e]/60 mt-16 py-6 glass-strong">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#3a3a52]">
            Built for Superteam Earn · Legion Gasless Protocol on Solana
          </p>
          <a
            href="https://github.com/Venkat5599/Solana"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-[#8b8b9e] hover:text-white transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            Venkat5599/Solana
          </a>
        </div>
      </footer>
    </div>
  );
}
