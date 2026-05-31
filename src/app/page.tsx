import { Suspense } from "react";

export const dynamic = "force-dynamic";
import { SolanaWalletProvider } from "@/components/WalletProvider";
import { TipJarPage } from "@/components/TipJarPage";
import { Toaster } from "sonner";

export default function Home() {
  return (
    <SolanaWalletProvider>
      <Toaster
        position="top-center"
        richColors
        theme="dark"
        toastOptions={{ duration: 6000 }}
      />
      <Suspense fallback={null}>
        <TipJarPage />
      </Suspense>
    </SolanaWalletProvider>
  );
}
