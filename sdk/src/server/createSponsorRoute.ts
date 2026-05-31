import {
  Keypair,
  Transaction,
  Connection,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import bs58 from "bs58";
import type { SponsorRouteConfig, SponsorErrorCode } from "../types.js";

// Simple in-process rate limiter (resets on server restart)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, maxPerMinute: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > maxPerMinute;
}

function errorJson(error: string, code: SponsorErrorCode, status: number) {
  return Response.json({ error, code }, { status });
}

/**
 * Creates a Next.js App Router route handler for the sponsor co-signing endpoint.
 *
 * @example
 * ```ts
 * // app/api/sponsor/route.ts
 * import { createSponsorRoute } from "@legion/gasless/server";
 *
 * export const { GET, POST } = createSponsorRoute({
 *   privateKeyEnvVar: "SPONSOR_PRIVATE_KEY",
 *   network: "devnet",
 *   rateLimit: 10,
 *   minSolBalance: 0.01,
 * });
 * ```
 *
 * The POST handler:
 * 1. Validates the sponsor private key from env
 * 2. Checks the sponsor SOL balance
 * 3. Deserializes the user-signed transaction
 * 4. Co-signs with the sponsor keypair
 * 5. Returns the dual-signed transaction
 */
export function createSponsorRoute(config: SponsorRouteConfig = {}) {
  const {
    privateKeyEnvVar = "SPONSOR_PRIVATE_KEY",
    rateLimit = 10,
    minSolBalance = 0.01,
  } = config;

  const GET = async () =>
    errorJson("Method not allowed", "METHOD_NOT_ALLOWED", 405);

  const POST = async (req: Request) => {
    // Rate limit
    const ip =
      (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
      "unknown";
    if (checkRateLimit(ip, rateLimit)) {
      return errorJson("Too many requests. Try again shortly.", "RATE_LIMITED", 429);
    }

    // Load sponsor key
    const privateKeyB58 = process.env[privateKeyEnvVar];
    if (!privateKeyB58) {
      console.error(`[LegionGasless] ${privateKeyEnvVar} env var not set`);
      return errorJson("Sponsor wallet not configured.", "MISSING_ENV", 500);
    }

    let sponsorKeypair: Keypair;
    try {
      sponsorKeypair = Keypair.fromSecretKey(bs58.decode(privateKeyB58));
    } catch {
      return errorJson("Sponsor key format invalid.", "INVALID_KEY", 500);
    }

    // Check balance
    const network =
      config.network ??
      ((process.env.NEXT_PUBLIC_SOLANA_NETWORK as "devnet" | "mainnet-beta") ??
        "devnet");
    const connection = new Connection(clusterApiUrl(network), "confirmed");
    const balance = await connection.getBalance(sponsorKeypair.publicKey);

    if (balance < minSolBalance * LAMPORTS_PER_SOL) {
      return errorJson(
        `Sponsor wallet insufficient SOL (${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL). Fund: ${sponsorKeypair.publicKey.toBase58()}`,
        "INSUFFICIENT_SPONSOR_SOL",
        503
      );
    }

    // Parse body
    let body: { transaction?: string };
    try {
      body = (await req.json()) as { transaction?: string };
    } catch {
      return errorJson("Invalid JSON body.", "INVALID_TRANSACTION", 400);
    }

    if (!body.transaction || typeof body.transaction !== "string") {
      return errorJson("Missing transaction field.", "INVALID_TRANSACTION", 400);
    }

    // Deserialize + co-sign
    let tx: Transaction;
    try {
      tx = Transaction.from(Buffer.from(body.transaction, "base64"));
    } catch {
      return errorJson("Could not deserialize transaction.", "INVALID_TRANSACTION", 400);
    }

    try {
      tx.partialSign(sponsorKeypair);
    } catch (err) {
      console.error("[LegionGasless] partialSign failed:", err);
      return errorJson("Sponsor signing failed.", "SIGN_FAILED", 500);
    }

    const signed = tx.serialize({ requireAllSignatures: false }).toString("base64");
    return Response.json({ transaction: signed });
  };

  return { GET, POST };
}

/**
 * Creates a route handler that returns the sponsor's public key.
 * Used by the client to build the gasless transaction.
 *
 * @example
 * ```ts
 * // app/api/sponsor-pubkey/route.ts
 * import { createSponsorPubkeyRoute } from "@legion/gasless/server";
 * export const { GET } = createSponsorPubkeyRoute();
 * ```
 */
export function createSponsorPubkeyRoute(
  config: Pick<SponsorRouteConfig, "privateKeyEnvVar"> = {}
) {
  const { privateKeyEnvVar = "SPONSOR_PRIVATE_KEY" } = config;

  const GET = async () => {
    const privateKeyB58 = process.env[privateKeyEnvVar];
    if (!privateKeyB58) {
      return errorJson("Sponsor wallet not configured.", "MISSING_ENV", 500);
    }
    try {
      const keypair = Keypair.fromSecretKey(bs58.decode(privateKeyB58));
      return Response.json({ publicKey: keypair.publicKey.toBase58() });
    } catch {
      return errorJson("Sponsor key format invalid.", "INVALID_KEY", 500);
    }
  };

  return { GET };
}
