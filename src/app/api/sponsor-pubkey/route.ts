import { createSponsorPubkeyRoute } from "@legion/gasless/server";

export const { GET } = createSponsorPubkeyRoute({
  privateKeyEnvVar: "SPONSOR_PRIVATE_KEY",
});
