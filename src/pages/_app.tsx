import type { AppProps } from "next/app";
import "@/styles/globals.css";
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '../lib/config';
import { Providers } from "@/components/providers/openfortProviders";

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Providers>
          <Component {...pageProps} />
        </Providers>
      </QueryClientProvider>
    </WagmiProvider>
  );
}