import { createSponsorPubkeyRoute } from "gasless-sol/server";

export const { GET } = createSponsorPubkeyRoute({
  privateKeyEnvVar: "SPONSOR_PRIVATE_KEY",
});
