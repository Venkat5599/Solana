"use client";

import { useEffect, useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import type { ConfirmedSignatureInfo } from "@solana/web3.js";
import { ExternalLink, Clock, RefreshCw } from "lucide-react";
import { explorerUrl, truncateAddress } from "@/lib/solana";
import { formatTimestamp } from "@/lib/utils";

export function TipHistory() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [signatures, setSignatures] = useState<ConfirmedSignatureInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const sigs = await connection.getSignaturesForAddress(publicKey, { limit: 10 });
      setSignatures(sigs);
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchHistory();
    } else {
      setSignatures([]);
    }
  }, [connected, publicKey, fetchHistory]);

  if (!connected) return null;

  return (
    <div className="glass rounded-2xl border border-[#1e1e2e]">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#8b8b9e]" />
          <h3 className="text-sm font-semibold text-white">Recent Transactions</h3>
        </div>
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="text-[#8b8b9e] hover:text-white transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="px-5 pb-5">
        {loading && signatures.length === 0 && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-lg bg-[#1e1e2e]/60 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && signatures.length === 0 && (
          <div className="text-center py-6 text-[#3a3a52] text-sm">
            No transactions yet
          </div>
        )}

        {signatures.length > 0 && (
          <div className="space-y-1">
            {signatures.map((sig, i) => (
              <a
                key={sig.signature}
                href={explorerUrl(sig.signature)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-[#9945FF]/06 border border-transparent hover:border-[#9945FF]/15 transition-all duration-150 group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${i === 0 ? "bg-[#14F195]" : "bg-[#2a2a3e]"}`} />
                  <div>
                    <p className="text-xs font-mono text-white group-hover:text-[#9945FF] transition-colors">
                      {truncateAddress(sig.signature)}
                    </p>
                    {sig.blockTime && (
                      <p className="text-[10px] text-[#3a3a52] mt-0.5">
                        {formatTimestamp(sig.blockTime)}
                      </p>
                    )}
                  </div>
                </div>
                <ExternalLink className="w-3 h-3 text-[#3a3a52] group-hover:text-[#9945FF] transition-colors flex-shrink-0" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
