import { createSponsorRoute } from "gasless-sol/server";
import { LEGION_CONFIG } from "@/lib/solana";

export const { GET, POST } = createSponsorRoute({
  privateKeyEnvVar: "SPONSOR_PRIVATE_KEY",
  rateLimit: 10,
  minSolBalance: 0.01,
  // Enforce that every sponsored tx actually pays the configured fee.
  feeConfig: LEGION_CONFIG,
});
