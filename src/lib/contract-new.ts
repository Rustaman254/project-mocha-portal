// ABI definitions for our deployed Mocha Coffee Vault System contracts

// Diamond Facet ABI (MultiTrancheVaultFacet functions)
export const DIAMOND_VAULT_ABI = [
  // Investment Functions
  {
    inputs: [
      { name: "farmId", type: "uint256" },
      { name: "mbtAmount", type: "uint256" },
    ],
    name: "purchaseFarmBond",
    outputs: [{ name: "bondId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "bondId", type: "uint256" }],
    name: "redeemMatureBond",
    outputs: [{ name: "redemptionAmount", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "bondId", type: "uint256" }],
    name: "redeemBondEarly",
    outputs: [{ name: "redemptionAmount", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  // View Functions
  {
    inputs: [{ name: "farmId", type: "uint256" }],
    name: "getVaultFarmInfo",
    outputs: [
      { name: "name", type: "string" },
      { name: "farmOwner", type: "address" },
      { name: "treeCount", type: "uint256" },
      { name: "targetAPY", type: "uint256" },
      { name: "maturityPeriod", type: "uint256" },
      { name: "shareTokenAddress", type: "address" },
      { name: "active", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "investor", type: "address" },
      { name: "bondId", type: "uint256" },
    ],
    name: "getBondInfo",
    outputs: [
      { name: "farmId", type: "uint256" },
      { name: "depositAmount", type: "uint256" },
      { name: "shareTokenAmount", type: "uint256" },
      { name: "depositTimestamp", type: "uint256" },
      { name: "maturityTimestamp", type: "uint256" },
      { name: "redeemed", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getUserBonds",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getVaultInfo",
    outputs: [
      { name: "mttrVault", type: "address" },
      { name: "mbtToken", type: "address" },
      { name: "initialized", type: "bool" },
      { name: "totalFarms", type: "uint256" },
      { name: "totalActiveBonds", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  // Admin Functions
  {
    inputs: [
      { name: "farmId", type: "uint256" },
      { name: "farmTokenBoundAccount", type: "address" },
      { name: "targetAPY", type: "uint256" },
      { name: "maturityPeriod", type: "uint256" },
      { name: "minInvestment", type: "uint256" },
      { name: "maxInvestment", type: "uint256" },
      { name: "farmCap", type: "uint256" },
      { name: "farmName", type: "string" },
      { name: "shareTokenName", type: "string" },
      { name: "shareTokenSymbol", type: "string" },
    ],
    name: "addFarmToVault",
    outputs: [{ name: "farmId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "farmId", type: "uint256" },
      { name: "targetAPY", type: "uint256" },
      { name: "maturityPeriod", type: "uint256" },
      { name: "minInvestment", type: "uint256" },
      { name: "maxInvestment", type: "uint256" },
      { name: "farmCap", type: "uint256" },
      { name: "active", type: "bool" },
    ],
    name: "updateFarm",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const

// MochaTreeRightsToken (ERC4626 Vault) ABI
export const MTTR_VAULT_ABI = [
  // ERC4626 Standard Functions
  {
    inputs: [],
    name: "asset",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "shares", type: "uint256" }],
    name: "convertToAssets",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "assets", type: "uint256" }],
    name: "convertToShares",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalAssets",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  
  // Mocha Coffee Vault Specific Functions
  {
    inputs: [{ name: "farmId", type: "uint256" }],
    name: "getFarmConfig",
    outputs: [
      {
        components: [
          { name: "name", type: "string" },
          { name: "farmOwner", type: "address" },
          { name: "treeCount", type: "uint256" },
          { name: "targetAPY", type: "uint256" },
          { name: "maturityPeriod", type: "uint256" },
          { name: "bondValue", type: "uint256" },
          { name: "collateralRatio", type: "uint256" },
          { name: "minInvestment", type: "uint256" },
          { name: "maxInvestment", type: "uint256" },
          { name: "farmCap", type: "uint256" },
          { name: "totalInvested", type: "uint256" },
          { name: "investorCount", type: "uint256" },
          { name: "shareTokenAddress", type: "address" },
          { name: "active", type: "bool" },
          { name: "createdTimestamp", type: "uint256" },
          { name: "maturityTimestamp", type: "uint256" },
        ],
        name: "farmConfig",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getActiveFarms",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "farmId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    name: "purchaseBond",
    outputs: [{ name: "bondId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "bondId", type: "uint256" }],
    name: "redeemBond",
    outputs: [{ name: "amount", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "bondId", type: "uint256" },
      { name: "newFarmId", type: "uint256" },
    ],
    name: "rolloverBond",
    outputs: [{ name: "newBondId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "bondId", type: "uint256" }],
    name: "redeemBondEarly",
    outputs: [{ name: "amount", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "investor", type: "address" }],
    name: "getInvestorBonds",
    outputs: [
      {
        components: [
          { name: "id", type: "uint256" },
          { name: "farmId", type: "uint256" },
          { name: "investor", type: "address" },
          { name: "depositAmount", type: "uint256" },
          { name: "shareTokenAmount", type: "uint256" },
          { name: "depositTimestamp", type: "uint256" },
          { name: "maturityTimestamp", type: "uint256" },
          { name: "redeemed", type: "bool" },
        ],
        name: "bonds",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "bondId", type: "uint256" }],
    name: "getBondInfo",
    outputs: [
      {
        components: [
          { name: "id", type: "uint256" },
          { name: "farmId", type: "uint256" },
          { name: "investor", type: "address" },
          { name: "depositAmount", type: "uint256" },
          { name: "shareTokenAmount", type: "uint256" },
          { name: "depositTimestamp", type: "uint256" },
          { name: "maturityTimestamp", type: "uint256" },
          { name: "redeemed", type: "bool" },
        ],
        name: "bond",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const

// MochaBeanToken (ERC20) ABI
export const MBT_TOKEN_ABI = [
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const

// MochaLandToken (ERC721) ABI
export const MLT_TOKEN_ABI = [
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const

// MochaTreeToken (ERC6960) ABI
export const MTT_TOKEN_ABI = [
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const

// Diamond Facet ABI (for admin functions)
export const DIAMOND_FACET_ABI = [
  {
    inputs: [
      { name: "farmOwner", type: "address" },
      { name: "treeCount", type: "uint256" },
      { name: "targetAPY", type: "uint256" },
      { name: "maturityPeriod", type: "uint256" },
      { name: "bondValue", type: "uint256" },
      { name: "collateralRatio", type: "uint256" },
      { name: "minInvestment", type: "uint256" },
      { name: "maxInvestment", type: "uint256" },
      { name: "farmCap", type: "uint256" },
      { name: "farmName", type: "string" },
      { name: "shareTokenName", type: "string" },
      { name: "shareTokenSymbol", type: "string" },
    ],
    name: "addFarmToVault",
    outputs: [{ name: "farmId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "farmId", type: "uint256" },
      { name: "newAPY", type: "uint256" },
      { name: "newMinInvestment", type: "uint256" },
      { name: "newMaxInvestment", type: "uint256" },
      { name: "newFarmCap", type: "uint256" },
    ],
    name: "updateFarm",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const
