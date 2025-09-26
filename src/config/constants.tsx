import { http, createPublicClient, parseAbi } from 'viem'
import { scroll } from 'viem/chains'
import vault from "@/ABI/MochaTreeRightsABI.json"
import ico from "@/ABI/ICO.json"

export const MBT_TOKEN_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "success", type: "bool" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "success", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ name: "remaining", type: "uint256" }],
    type: "function",
  },
] as const;


export const TREE_CONTRACT_ADDRESS = "0x3BE94b5CcfDd92bBE2e08E43D01900F36eeB3100" as const;
export const MBT_ADDRESS = "0xA5ea95B787629Feb727D25A7c6bFb01f0eE2cBD1" as const;
export const ICO_ADDRESS = '0xe9A1a4F88e5a7935afF783a4E5087ddDD4Cb60a4' as const;
export const TREE_CONTRACT_ABI = vault.abi;
export const ICO_ABI = ico.abi;


export const MBT_DECIMALS = 18;

// prev tree contract = 0x4b02Bada976702E83Cf91Cd0B896852099099352

export const eventsAbi = parseAbi([
  'event FarmAdded(uint256 indexed farmId, string name, address indexed farmOwner, uint256 treeCount, uint256 bondValue, address shareTokenAddress)',
  'event BondPurchased(address indexed investor, uint256 indexed farmId, uint256 indexed bondId, uint256 mbtAmount, uint256 shareTokenAmount)',
  'event YieldDistributed(uint256 indexed farmId, uint256 yieldAmount, uint256 timestamp)',
  'event BondRedeemed(address indexed investor, uint256 indexed bondId, uint256 redemptionAmount, uint256 timestamp)',
  'event CollateralUpdated(uint256 indexed farmId, uint256 valuationPerTree, uint256 coverageRatio, uint256 timestamp)',
  'event FarmSettled(uint256 indexed farmId, uint256 totalYield, uint256 timestamp)',
  'event BondRedeemed(address indexed investor, uint256 indexed farmId, uint256 indexed bondId, uint256 principalAmount, uint256 yieldAmount)',
  'event YieldDistributed(uint256 indexed farmId, uint256 totalYield, uint256 distributedAmount, uint256 timestamp)',
  'event FarmMatured(uint256 indexed farmId, uint256 totalPrincipal, uint256 totalYield, uint256 timestamp)',
]);