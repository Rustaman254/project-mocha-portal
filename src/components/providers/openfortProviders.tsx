import React from 'react'
import { OpenfortKitProvider, getDefaultConfig, RecoveryMethod, AuthProvider, OpenfortWalletConfig } from '@openfort/openfort-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig } from 'wagmi'
import { scroll } from 'viem/chains'

const config = createConfig(
  getDefaultConfig({
    appName: 'OpenfortKit demo',
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? (() => { throw new Error('NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID is not defined'); })(),
    chains: [scroll], 
  })
);

const queryClient = new QueryClient()

const walletConfig: OpenfortWalletConfig = {
  createEmbeddedSigner: true,
  embeddedSignerConfiguration: {
    shieldPublishableKey: process.env.NEXT_PUBLIC_SHIELD_PUBLISHABLE_KEY ?? (() => { throw new Error('NEXT_PUBLIC_SHIELD_PUBLISHABLE_KEY is not defined'); })(),
    recoveryMethod: RecoveryMethod.PASSWORD,
    shieldEncryptionKey: process.env.NEXT_PUBLIC_SHIELD_ENCRYPTION_SHARE ?? (() => { throw new Error('NEXT_PUBLIC_SHIELD_ENCRYPTION_SHARE is not defined'); })()
  }
}

const authProviders: AuthProvider[] = [
  AuthProvider.WALLET,
  // AuthProvider.GOOGLE,
  // AuthProvider.TWITTER,
]

export function Providers({ children }: { children?: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OpenfortKitProvider
          // Set the publishable key of your OpenfortKit account. This field is required.
          publishableKey={process.env.NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY ?? (() => { throw new Error('NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY is not defined'); })()}

          options={{
            authProviders,
          }}

          theme="auto"

          walletConfig={walletConfig}
        >
          {children}
        </OpenfortKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
