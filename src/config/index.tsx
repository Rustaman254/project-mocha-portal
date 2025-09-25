import { cookieStorage, createStorage, http } from '@wagmi/core'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { scroll } from '@reown/appkit/networks'

export const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID
if (!projectId) {
  throw new Error('Project ID is not defined')
}

export const networks = [scroll]
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks
})

export const config = wagmiAdapter.wagmiConfig