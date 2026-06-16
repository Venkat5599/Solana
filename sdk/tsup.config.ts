import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/server/index.ts", "src/react/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  // Peers — never bundle these; the consumer provides them.
  external: [
    "@solana/web3.js",
    "@solana/spl-token",
    "react",
    "@solana/wallet-adapter-react",
  ],
});
