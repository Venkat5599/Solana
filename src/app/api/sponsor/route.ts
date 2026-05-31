import { createSponsorRoute } from "@legion/gasless/server";

export const { GET, POST } = createSponsorRoute({
  privateKeyEnvVar: "SPONSOR_PRIVATE_KEY",
  rateLimit: 10,
  minSolBalance: 0.01,
});
