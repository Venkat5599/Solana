"use client";

import { useEffect, useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import type { ConfirmedSignatureInfo } from "@solana/web3.js";
import { ExternalLink } from "lucide-react";
import { explorerUrl, truncateAddress } from "@/lib/solana";
import { formatTimestamp } from "@/lib/utils";

export function TipHistory() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [sigs, setSigs] = useState<ConfirmedSignatureInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const result = await connection.getSignaturesForAddress(publicKey, { limit: 10 });
      setSigs(result);
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  }, [publicKey, connection]);

  useEffect(() => {
    if (connected && publicKey) fetch();
    else setSigs([]);
  }, [connected, publicKey, fetch]);

  if (!connected) return null;

  return (
    <div className="border border-[#e8e8e8] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0]">
        <p
          className="text-[11px] uppercase tracking-widest text-[#aaa]"
          style={{ letterSpacing: "0.1em" }}
        >
          Recent transactions
        </p>
        <button
          onClick={fetch}
          disabled={loading}
          className="text-[11px] text-[#bbb] hover:text-black transition-colors underline underline-offset-2 disabled:opacity-40"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {loading && sigs.length === 0 && (
        <div className="p-5 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 rounded-lg bg-[#f5f5f5] animate-pulse" />
          ))}
        </div>
      )}

      {!loading && sigs.length === 0 && (
        <div className="px-5 py-8 text-center text-xs text-[#ccc]">
          No transactions yet
        </div>
      )}

      {sigs.length > 0 && (
        <div>
          {sigs.map((sig, i) => (
            <a
              key={sig.signature}
              href={explorerUrl(sig.signature)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-5 py-3 border-b border-[#f8f8f8] last:border-0 hover:bg-[#fafafa] group transition-colors"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: i === 0 ? "#22c55e" : "#e0e0e0" }}
                />
                <div>
                  <p className="text-xs font-mono text-[#444] group-hover:text-black transition-colors">
                    {truncateAddress(sig.signature)}
                  </p>
                  {sig.blockTime && (
                    <p className="text-[10px] text-[#bbb] mt-0.5">
                      {formatTimestamp(sig.blockTime)}
                    </p>
                  )}
                </div>
              </div>
              <ExternalLink className="w-3 h-3 text-[#ccc] group-hover:text-black transition-colors flex-shrink-0 ml-2" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
