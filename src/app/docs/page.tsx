"use client";

import Link from "next/link";
import { useState } from "react";
import { Copy, Check, ArrowLeft, ArrowUpRight } from "lucide-react";

const NPM_URL = "https://www.npmjs.com/package/gasless-sol";
const GITHUB_URL = "https://github.com/Venkat5599/Solana";

function CodeBlock({ code, lang = "ts" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });

  return (
    <div className="relative group my-4">
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-[#666] font-mono select-none">
          {lang}
        </span>
        <button
          onClick={copy}
          aria-label="Copy code"
          className="text-[#888] hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#4ade80]" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <pre className="bg-[#0a0a0a] text-[#e8e8e8] rounded-xl p-4 pr-20 overflow-x-auto text-[13px] leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const SECTIONS = [
  ["install", "Install"],
  ["quickstart", "Quickstart"],
  ["config", "Configuration"],
  ["server", "Server route"],
  ["react", "React hook"],
  ["core", "Core builder"],
  ["env", "Environment"],
  ["anatomy", "How it works"],
];

function H({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="text-2xl tracking-tight text-black mt-14 mb-4 scroll-mt-20"
      style={{ fontFamily: "var(--font-heading)" }}
    >
      {children}
    </h2>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-10 bg-white border-b border-[#f0f0f0]">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-[#666] hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Tip Jar
          </Link>
          <div className="flex items-center gap-2">
            <span
              className="text-[15px] tracking-tight text-black"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              gasless-sol
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 border border-[#e0e0e0] text-[#888] rounded">
              docs
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-14 flex gap-12">
        {/* Sidebar */}
        <aside className="hidden lg:block w-44 flex-shrink-0">
          <nav className="sticky top-20 py-12 space-y-1">
            <p className="text-[11px] uppercase tracking-widest text-[#aaa] mb-3">
              On this page
            </p>
            {SECTIONS.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="block text-sm text-[#888] hover:text-black transition-colors py-1"
              >
                {label}
              </a>
            ))}
            <div className="pt-4 mt-4 border-t border-[#f0f0f0] space-y-2">
              <a href={NPM_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-[#888] hover:text-black transition-colors">
                npm <ArrowUpRight className="w-3 h-3" />
              </a>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-[#888] hover:text-black transition-colors">
                GitHub <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 py-12 pb-32">
          <p className="text-[13px] tracking-widest uppercase text-[#999] mb-4">
            Developer Documentation
          </p>
          <h1
            className="text-[clamp(32px,5vw,52px)] leading-[1.05] tracking-tight text-black mb-5"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Integrate gasless Solana payments
          </h1>
          <p className="text-[17px] text-[#555] leading-relaxed max-w-xl">
            <code className="text-black font-mono text-[15px]">gasless-sol</code> lets a sponsor
            wallet cover SOL gas while your users pay a small USDC fee — fee and
            transfer land atomically in one transaction, so the user never needs SOL.
            Pure TypeScript over <code className="font-mono text-[15px]">@solana/web3.js</code>; no
            on-chain program to deploy.
          </p>

          {/* Install */}
          <H id="install">Install</H>
          <p className="text-[15px] text-[#555] leading-relaxed">
            Install the SDK alongside its peer dependencies.
          </p>
          <CodeBlock lang="bash" code={`bun add gasless-sol @solana/web3.js @solana/spl-token @solana/wallet-adapter-react`} />
          <p className="text-[14px] text-[#888] leading-relaxed">
            Ships as ESM with full TypeScript types. Three entry points:{" "}
            <code className="font-mono text-black">gasless-sol</code> (core),{" "}
            <code className="font-mono text-black">gasless-sol/react</code> (hook),{" "}
            <code className="font-mono text-black">gasless-sol/server</code> (API route).
          </p>

          {/* Quickstart */}
          <H id="quickstart">Quickstart</H>
          <p className="text-[15px] text-[#555] leading-relaxed">
            Three files and you have gasless payments: a shared config, two API
            routes, and a button. Each is covered in detail below.
          </p>
          <ol className="mt-4 space-y-2 text-[15px] text-[#555]">
            <li><span className="font-mono text-black">1.</span> Define a <a href="#config" className="underline underline-offset-2">config</a> (fee token + amount).</li>
            <li><span className="font-mono text-black">2.</span> Add the <a href="#server" className="underline underline-offset-2">sponsor API routes</a>.</li>
            <li><span className="font-mono text-black">3.</span> Call the <a href="#react" className="underline underline-offset-2">React hook</a> from a button.</li>
          </ol>

          {/* Config */}
          <H id="config">Configuration</H>
          <p className="text-[15px] text-[#555] leading-relaxed">
            One config object drives everything. Share it between the client and the
            sponsor route so both agree on the fee.
          </p>
          <CodeBlock code={`// lib/gasless.ts
import type { LegionGaslessConfig } from "gasless-sol";

export const gaslessConfig: LegionGaslessConfig = {
  gasless: {
    fees: [
      // Devnet USDC mint. Swap for mainnet USDC on mainnet-beta.
      { token: "USDC", mintAddress: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", amount: 0.05 },
    ],
    defaultFeeToken: "USDC",
  },
};`} />

          {/* Server */}
          <H id="server">Sponsor API routes</H>
          <p className="text-[15px] text-[#555] leading-relaxed">
            The sponsor co-signs server-side so the private key never reaches the
            client. <code className="font-mono text-black">createSponsorRoute</code> validates
            that every transaction pays the configured fee before signing — without{" "}
            <code className="font-mono text-black">feeConfig</code> the sponsor would
            pay gas for arbitrary transactions, so always pass it.
          </p>
          <CodeBlock code={`// app/api/sponsor/route.ts
import { createSponsorRoute } from "gasless-sol/server";
import { gaslessConfig } from "@/lib/gasless";

export const { GET, POST } = createSponsorRoute({
  privateKeyEnvVar: "SPONSOR_PRIVATE_KEY", // server-only, never NEXT_PUBLIC
  feeConfig: gaslessConfig,                // enforces fee-to-sponsor on every tx
  rateLimit: 10,                           // requests/min/IP
  minSolBalance: 0.01,                     // reject if sponsor underfunded
});`} />
          <CodeBlock code={`// app/api/sponsor-pubkey/route.ts
import { createSponsorPubkeyRoute } from "gasless-sol/server";

export const { GET } = createSponsorPubkeyRoute();`} />

          {/* React */}
          <H id="react">React hook</H>
          <p className="text-[15px] text-[#555] leading-relaxed">
            <code className="font-mono text-black">useGaslessTransaction</code> handles the full
            flow: build → user signs → sponsor co-signs → submit → confirm. It reads
            the connected wallet from <code className="font-mono text-black">@solana/wallet-adapter-react</code>.
            Amounts are in raw token units (USDC has 6 decimals, so 1 USDC ={" "}
            <code className="font-mono text-black">1_000_000</code>).
          </p>
          <CodeBlock lang="tsx" code={`"use client";
import { useGaslessTransaction } from "gasless-sol/react";
import { gaslessConfig } from "@/lib/gasless";

export function TipButton({ creator }: { creator: string }) {
  const { sendGaslessTip, status, signature, error, isLoading } =
    useGaslessTransaction(gaslessConfig);

  return (
    <button
      disabled={isLoading}
      onClick={() =>
        sendGaslessTip({
          recipientAddress: creator,
          tipAmountRaw: 1_000_000, // 1 USDC
        })
      }
    >
      {isLoading ? status : "Send 1 USDC"}
    </button>
  );
}`} />
          <p className="text-[14px] text-[#888] leading-relaxed">
            Returned <code className="font-mono text-black">status</code> cycles through{" "}
            <code className="font-mono text-black">idle → building → signing → sponsoring → submitting → confirming → confirmed</code>{" "}
            (or <code className="font-mono text-black">error</code>). On success,{" "}
            <code className="font-mono text-black">signature</code> holds the tx hash for an Explorer link.
          </p>

          {/* Core */}
          <H id="core">Core builder (advanced)</H>
          <p className="text-[15px] text-[#555] leading-relaxed">
            Need to drive the flow yourself (non-React, custom signing)? Use the
            builder directly. It returns an unsigned transaction with the sponsor as
            fee payer — you handle user-sign, POST to your sponsor route, and submit.
          </p>
          <CodeBlock code={`import { LegionGasless } from "gasless-sol";
import { Connection, PublicKey } from "@solana/web3.js";
import { gaslessConfig } from "@/lib/gasless";

const legion = new LegionGasless(gaslessConfig);

const { transaction } = await legion.buildGaslessTipTransaction({
  connection: new Connection("https://api.devnet.solana.com"),
  sponsorPublicKey: new PublicKey(sponsorPubkey),
  senderPublicKey: new PublicKey(userPubkey),
  recipientPublicKey: new PublicKey(creatorPubkey),
  tipAmountRaw: 1_000_000, // 1 USDC
});
// → user partial-signs → POST to /api/sponsor → sponsor co-signs → submit`} />

          {/* Env */}
          <H id="env">Environment</H>
          <p className="text-[15px] text-[#555] leading-relaxed">
            Two variables. The sponsor key is server-only — never prefix it with{" "}
            <code className="font-mono text-black">NEXT_PUBLIC_</code>.
          </p>
          <CodeBlock lang="bash" code={`# .env.local
NEXT_PUBLIC_SOLANA_NETWORK=devnet
SPONSOR_PRIVATE_KEY=<base58 secret of a funded devnet wallet>`} />
          <p className="text-[14px] text-[#888] leading-relaxed">
            Fund the sponsor with devnet SOL (<a href="https://faucet.solana.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">faucet.solana.com</a>);
            users need devnet USDC (<a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">faucet.circle.com</a>) but zero SOL.
            Switch <code className="font-mono text-black">NEXT_PUBLIC_SOLANA_NETWORK</code> to{" "}
            <code className="font-mono text-black">mainnet-beta</code> and the config to the
            mainnet USDC mint for production.
          </p>

          {/* Anatomy */}
          <H id="anatomy">How it works</H>
          <p className="text-[15px] text-[#555] leading-relaxed">
            Each tip is a single atomic transaction with the sponsor as fee payer.
            No custom program — just the SPL Token and System programs.
          </p>
          <CodeBlock lang="text" code={`feePayer: sponsor            ← covers ~5000 lamports SOL gas
  ix[0] create ATA (idem.)   ← ensure sponsor's USDC account exists
  ix[1] USDC transfer        ← user pays the fee to sponsor
  ix[2] create ATA (idem.)   ← ensure recipient's USDC account exists
  ix[3] USDC transfer        ← user tips the recipient

All-or-nothing: fee + tip succeed together or the tx fails.
User holds 0 SOL the entire time.`} />
          <p className="text-[14px] text-[#888] leading-relaxed mt-6">
            See it live on the{" "}
            <Link href="/" className="underline underline-offset-2 text-black">tip jar demo</Link>.
          </p>
        </main>
      </div>
    </div>
  );
}
