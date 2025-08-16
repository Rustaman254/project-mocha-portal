// lib/config.ts
import { createConfig, http } from 'wagmi';
import { scroll, scrollSepolia } from 'wagmi/chains';

export const config = createConfig({
  chains: [scrollSepolia],
  transports: {
      [scrollSepolia.id]: http(),
  },
});