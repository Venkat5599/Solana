"use client";

import { useSearchParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import { TipJar } from "./TipJar";
import { TipHistory } from "./TipHistory";
import { truncateAddress, SOLANA_NETWORK } from "@/lib/solana";
import { useState, useEffect } from "react";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);

const FEATURES = [
  { label: "No SOL required", sub: "Gas covered by sponsor wallet, atomically" },
  { label: "Fee in USDC", sub: "0.05 USDC per transaction, nothing else" },
  { label: "On-chain always", sub: "Every tip is a real Solana transaction" },
];

export function TipJarPage() {
  const searchParams = useSearchParams();
  const prefillRecipient = searchParams.get("to") ?? undefined;
  const { publicKey, connected } = useWallet();

  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const tipJarUrl =
    typeof window !== "undefined" && publicKey
      ? `${window.location.origin}/?to=${publicKey.toBase58()}`
      : null;

  const handleCopy = () => {
    if (!tipJarUrl) return;
    navigator.clipboard.writeText(tipJarUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-10 bg-white border-b border-[#f0f0f0]">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className="text-[18px] tracking-tight text-black leading-none select-none"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Tip Jar(R)
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 border border-[#e0e0e0] text-[#888] rounded uppercase tracking-wider">
              {SOLANA_NETWORK}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {connected && publicKey && (
              <span className="hidden sm:block text-sm text-[#888] font-mono tracking-tight">
                {truncateAddress(publicKey.toBase58())}
              </span>
            )}
            <WalletMultiButton />
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <main className="flex-1 pt-14">
        <section className="max-w-5xl mx-auto px-5 sm:px-8 pt-20 pb-16">
          <div
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(12px)",
              transition: "opacity 0.5s ease, transform 0.5s ease",
            }}
          >
            {/* Label */}
            <p
              className="text-[13px] tracking-widest uppercase text-[#999] mb-6 select-none"
              style={{ letterSpacing: "0.12em" }}
            >
              Solana · Gasless Protocol
            </p>

            {/* Headline */}
            <h1
              className="text-[clamp(42px,8vw,96px)] leading-[0.95] tracking-tight text-black mb-8 max-w-3xl"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Tip without
              <br />
              <span className="text-[#999]">holding SOL.</span>
            </h1>

            {/* Sub */}
            <p className="text-[clamp(15px,2vw,18px)] text-[#555] leading-relaxed max-w-lg mb-10">
              Send on-chain USDC tips with zero SOL in your wallet. The sponsor
              wallet covers Solana gas atomically — no exchange, no friction.
            </p>

            {/* Feature tags */}
            <div className="flex flex-wrap gap-2 mb-16">
              {FEATURES.map(({ label, sub }) => (
                <div
                  key={label}
                  className="inline-flex items-center gap-2 border border-[#e8e8e8] rounded-full px-4 py-2 text-sm text-black bg-[#fafafa] hover:border-black transition-colors duration-200 cursor-default"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-black flex-shrink-0" />
                  <span style={{ fontFamily: "var(--font-heading)" }}>{label}</span>
                  <span className="text-[#aaa] text-xs hidden sm:block">— {sub}</span>
                </div>
              ))}
            </div>

            {/* ── Two-col layout ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12 items-start">

              {/* Left: tip form */}
              <div>
                <TipJar prefillRecipient={prefillRecipient} />
              </div>

              {/* Right: sidebar */}
              <div className="space-y-5">

                {/* How it works */}
                <div className="border border-[#e8e8e8] rounded-xl p-5">
                  <p className="text-[11px] uppercase tracking-widest text-[#aaa] mb-4" style={{ letterSpacing: "0.1em" }}>
                    How it works
                  </p>
                  <ol className="space-y-4">
                    {[
                      ["Connect wallet", "Phantom or Solflare — no SOL needed"],
                      ["Enter tip amount", "In USDC, any value above 0"],
                      ["Sign once", "Wallet prompts for USDC fee + tip approval"],
                      ["Confirmed", "On-chain in ~2 seconds on Solana"],
                    ].map(([step, desc], i) => (
                      <li key={step} className="flex gap-4">
                        <span className="text-[11px] text-[#ccc] font-mono mt-0.5 w-4 flex-shrink-0">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-black leading-tight" style={{ fontFamily: "var(--font-heading)" }}>
                            {step}
                          </p>
                          <p className="text-xs text-[#999] mt-0.5">{desc}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Fee breakdown */}
                <div className="border border-[#e8e8e8] rounded-xl p-5">
                  <p className="text-[11px] uppercase tracking-widest text-[#aaa] mb-4" style={{ letterSpacing: "0.1em" }}>
                    Fee breakdown
                  </p>
                  <div className="space-y-2.5">
                    {[
                      ["Solana network fee", "~$0.0007", "black"],
                      ["Covered by sponsor", "✓", "green"],
                      ["You pay (USDC)", "$0.05", "black"],
                    ].map(([label, val, color]) => (
                      <div key={label} className="flex justify-between items-center">
                        <span className="text-sm text-[#666]">{label}</span>
                        <span
                          className="text-sm font-mono"
                          style={{
                            fontFamily: "var(--font-heading)",
                            color: color === "green" ? "#22c55e" : "#0a0a0a",
                          }}
                        >
                          {val}
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-[#f0f0f0] pt-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-black font-medium" style={{ fontFamily: "var(--font-heading)" }}>
                          Total cost to sender
                        </span>
                        <span className="text-sm font-mono" style={{ fontFamily: "var(--font-heading)" }}>
                          $0.05 USDC
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Share link */}
                {connected && publicKey && tipJarUrl && (
                  <div className="border border-[#e8e8e8] rounded-xl p-5">
                    <p className="text-[11px] uppercase tracking-widest text-[#aaa] mb-3" style={{ letterSpacing: "0.1em" }}>
                      Your tip jar link
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1 min-w-0 bg-[#f9f9f9] border border-[#eeeeee] rounded-lg px-3 py-2">
                        <p className="text-xs font-mono text-[#444] truncate">{tipJarUrl}</p>
                      </div>
                      <button
                        onClick={handleCopy}
                        className="flex-shrink-0 px-3 py-2 rounded-lg border border-[#e8e8e8] text-xs text-black hover:bg-black hover:text-white hover:border-black transition-colors duration-200 font-medium"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {copied ? "✓" : "Copy"}
                      </button>
                    </div>
                  </div>
                )}

                {/* History */}
                <TipHistory />
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer divider + info ─────────────────────────────────────── */}
        <footer className="border-t border-[#f0f0f0] px-5 sm:px-8 py-6">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-[#bbb]">
              Built for Superteam Earn · Legion Gasless Protocol on Solana
            </p>
            <a
              href="https://github.com/Venkat5599/Solana"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#bbb] hover:text-black transition-colors underline underline-offset-2"
            >
              github.com/Venkat5599/Solana
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
