// FarmConfig from our deployed contracts
export interface FarmConfig {
  name: string
  farmOwner: string
  treeCount: bigint
  targetAPY: bigint
  maturityPeriod: bigint
  bondValue: bigint
  collateralRatio: bigint
  minInvestment: bigint
  maxInvestment: bigint
  farmCap: bigint
  totalInvested: bigint
  investorCount: bigint
  shareTokenAddress: string
  active: boolean
  createdTimestamp: bigint
  maturityTimestamp: bigint
}

export interface Farm {
  id: string
  name: string
  location: string
  description: string
  imageUrl: string
  totalValue: bigint
  availableShares: bigint
  totalShares: bigint
  pricePerShare: bigint // Deprecated - use pricePerTree instead
  pricePerTree: bigint // New field for price per coffee tree
  totalCoffeeTrees: bigint // New field for total number of coffee trees
  apy: number
  riskLevel: "Low" | "Medium" | "High"
  harvestSeason: string
  farmType: "Coffee" | "Cocoa" | "Tea" | "Mixed"
  isActive: boolean
  manager: string
  createdAt: number
  lastHarvest: number
  // Additional fields from our contract
  farmOwner: string
  treeCount: bigint
  targetAPY: bigint
  maturityPeriod: bigint
  bondValue: bigint
  collateralRatio: bigint
  minInvestment: bigint
  maxInvestment: bigint
  farmCap: bigint
  totalInvested: bigint
  investorCount: bigint
  shareTokenAddress: string
  createdTimestamp: bigint
  maturityTimestamp: bigint
}

export interface Bond {
  id: string
  farmId: string
  investor: string
  amount: bigint
  shares: bigint
  purchasePrice: bigint
  purchaseDate: number
  maturityDate: number
  isRedeemed: boolean
  currentValue: bigint
  yieldEarned: bigint
}

export interface Investment {
  bondId: string
  farmName: string
  amount: bigint
  shares: bigint
  purchaseDate: number
  currentValue: bigint
  totalReturn: bigint
  apy: number
  status: "Active" | "Matured" | "Redeemed"
}

export interface Portfolio {
  totalInvested: bigint
  currentValue: bigint
  totalReturns: bigint
  investments: Investment[]
  averageApy: number
}

export interface ContractAddresses {
  // Main Vault System Contracts
  mttrVault: `0x${string}` // MochaTreeRightsToken (ERC4626 Vault)
  diamond: `0x${string}` // TreeFarmDiamond (Main Diamond)
  mbtToken: `0x${string}` // MochaBeanToken (ERC20)
  mltToken: `0x${string}` // MochaLandToken (ERC721)
  mttToken: `0x${string}` // MochaTreeToken (ERC6960)
  
  // Diamond Facets
  vaultFacet: `0x${string}` // MultiTrancheVaultFacet
  diamondCutFacet: `0x${string}` // DiamondCutFacet
  
  // Libraries
  bondLib: `0x${string}` // MTTRBondLib
  farmLib: `0x${string}` // MTTRFarmLib
  yieldLib: `0x${string}` // MTTRYieldLib
}

export interface TransactionStatus {
  hash?: string
  status: "idle" | "pending" | "success" | "error"
  error?: string
}