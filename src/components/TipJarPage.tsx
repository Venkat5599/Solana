"use client";

import { useSearchParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { TipJar } from "./TipJar";
import { TipHistory } from "./TipHistory";
import { truncateAddress, SOLANA_NETWORK } from "@/lib/solana";

export function TipJarPage() {
  const searchParams = useSearchParams();
  const prefillRecipient = searchParams.get("to") ?? undefined;
  const { publicKey, connected } = useWallet();

  return (
    <div className="min-h-screen bg-[#0f0f13] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#2a2a3a] px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <span className="font-bold text-white text-sm">Gasless Tip Jar</span>
            <span className="text-xs bg-[#1a1a24] border border-[#2a2a3a] text-[#14F195] px-2 py-0.5 rounded-full font-mono">
              {SOLANA_NETWORK}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {connected && publicKey && (
              <span className="text-xs text-gray-400 font-mono hidden sm:block">
                {truncateAddress(publicKey.toBase58())}
              </span>
            )}
            <WalletMultiButton
              style={{
                height: "36px",
                fontSize: "13px",
                padding: "0 16px",
                borderRadius: "8px",
              }}
            />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-start px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8 max-w-sm">
          <h1 className="text-3xl font-bold text-white mb-2">
            Tip without{" "}
            <span className="bg-gradient-to-r from-[#9945FF] to-[#14F195] bg-clip-text text-transparent">
              SOL
            </span>
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Send on-chain tips with just USDC. The sponsor wallet covers gas.
            No exchange required.
          </p>
        </div>

        {/* Tip form */}
        <TipJar prefillRecipient={prefillRecipient} />

        {/* History */}
        <TipHistory />

        {/* Share your link */}
        {connected && publicKey && (
          <div className="mt-6 w-full max-w-md">
            <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-2 font-medium">
                Share your tip jar link
              </p>
              <div className="flex gap-2">
                <code className="flex-1 text-xs bg-[#0f0f13] border border-[#2a2a3a] rounded-lg px-3 py-2 text-[#14F195] truncate">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/?to=${publicKey.toBase58()}`
                    : `/?to=${publicKey.toBase58()}`}
                </code>
                <button
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/?to=${publicKey.toBase58()}`
                      );
                    }
                  }}
                  className="px-3 py-2 bg-[#9945FF]/20 hover:bg-[#9945FF]/30 border border-[#9945FF]/40 text-[#9945FF] text-xs rounded-lg transition-colors font-medium flex-shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2a2a3a] px-4 py-3 text-center">
        <p className="text-xs text-gray-600">
          Built with the Legion Gasless pattern ·{" "}
          <a
            href="https://github.com/Venkat5599/Solana"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
