// lib/config.ts
import { createConfig, http } from 'wagmi';
import { scroll, scroll } from 'wagmi/chains';
import type { ContractAddresses } from "./types"

export const CONTRACT_ADDRESSES: ContractAddresses = {
  // Main Vault System Contracts
  mttrVault: "0x3BE94b5CcfDd92bBE2e08E43D01900F36eeB3100", // MochaTreeRightsToken (ERC4626 Vault)
  diamond: "0x31058580845A8ed67F404fF5863b30f1b8CF7412", // TreeFarmDiamond (Main Diamond)
  mbtToken: "0xA5ea95B787629Feb727D25A7c6bFb01f0eE2cBD1", // MochaBeanToken (ERC20) ✅ VERIFIED
  mltToken: "0x53815508558bF029ecBE190A4631876783ac27e6", // MochaLandToken (ERC721)
  mttToken: "0x52cEf0a50A38AD9468C5fde0292E7c2FbB0AaDb5", // MochaTreeToken (ERC6960)
  
  // Diamond Facets
  vaultFacet: "0xE617C8Dcc75604E86826eBdDc0352b7D3eb120CC", // MultiTrancheVaultFacet
  diamondCutFacet: "0x4322ec4FbA74e17dd4f7600b7aAdD6025F612917", // DiamondCutFacet
  
  // Libraries
  bondLib: "0xb9D9A6F6c3517861A5aa672B54d3E384A31Ce830", // MTTRBondLib
  farmLib: "0x7021819f84009935C25D60165A90e934046C2bbb", // MTTRFarmLib
  yieldLib: "0x96c0Fb5F1f4668e5Ce80A486a6aA50D93E1EFA9d", // MTTRYieldLib
}

// Admin address (deployer)
export const ADMIN_ADDRESS = "0x6ed208C1E6a012118194C4457fE8Dc3215ea971a"


export const config = createConfig({
  chains: [scroll],
  transports: {
      [scroll.id]: http(),
  },
});

export const SUPPORTED_CHAIN = scroll