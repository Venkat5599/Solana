"use client";

import { useEffect, useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { ConfirmedSignatureInfo } from "@solana/web3.js";
import { ExternalLink, Clock } from "lucide-react";
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
      const sigs = await connection.getSignaturesForAddress(publicKey, {
        limit: 10,
      });
      setSignatures(sigs);
    } catch {
      // silently fail — history is optional
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
    <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-2xl p-6 w-full max-w-md mx-auto mt-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-300">Recent Transactions</h3>
      </div>

      {loading && (
        <div className="text-center py-4 text-gray-500 text-sm">Loading...</div>
      )}

      {!loading && signatures.length === 0 && (
        <div className="text-center py-4 text-gray-600 text-sm">
          No transactions yet
        </div>
      )}

      {!loading && signatures.length > 0 && (
        <div className="space-y-2">
          {signatures.map((sig) => (
            <div
              key={sig.signature}
              className="flex items-center justify-between py-2 border-b border-[#2a2a3a] last:border-0"
            >
              <div className="flex flex-col">
                <span className="text-xs text-gray-400 font-mono">
                  {truncateAddress(sig.signature)}
                </span>
                {sig.blockTime && (
                  <span className="text-xs text-gray-600 mt-0.5">
                    {formatTimestamp(sig.blockTime)}
                  </span>
                )}
              </div>
              <a
                href={explorerUrl(sig.signature)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#9945FF] hover:text-[#14F195] transition-colors ml-2 flex-shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={fetchHistory}
        disabled={loading}
        className="mt-3 text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
      >
        Refresh
      </button>
    </div>
  );
}
