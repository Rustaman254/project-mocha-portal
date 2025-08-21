"use client"

import { useState, useEffect } from "react"
import { Search, Filter, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Info, MoreHorizontal, RefreshCw, Coffee, AlertTriangle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAccount, useReadContract, useReadContracts, useWriteContract, useBalance, usePublicClient } from "wagmi"
import { parseEther, formatEther, parseUnits, formatUnits } from "viem"
import { scrollSepolia } from "viem/chains"
import Header from "@/components/@shared-components/header"
import StatCard from "@/components/@shared-components/statCard"
import { TREE_CONTRACT_ABI, TREE_CONTRACT_ADDRESS, MBT_ADDRESS } from "@/config/constants"
import Link from "next/link"
import { Toaster, toast } from "sonner"

const MOCHA_TREE_CONTRACT_ADDRESS =  TREE_CONTRACT_ADDRESS;
const MOCHA_TREE_CONTRACT_ABI = TREE_CONTRACT_ABI;
const MBT_TOKEN_ADDRESS = MBT_ADDRESS;
const BOND_PRICE_USD = 100;
const MBT_PRICE_USD = 25;
const BOND_MBT = BOND_PRICE_USD / MBT_PRICE_USD; // 4 MBT per full bond
const MBT_DECIMALS = 18;

// MBT Token ABI
const MBT_TOKEN_ABI = [
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

export default function Investments() {
  const { address: userAddress, isConnected } = useAccount()
  const publicClient = usePublicClient({ chainId: scrollSepolia.id });
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState("asc")
  const [searchQuery, setSearchQuery] = useState("")
  const [darkMode, setDarkMode] = useState(false)
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false)
  const [selectedFarmId, setSelectedFarmId] = useState("")
  const [selectedFarmName, setSelectedFarmName] = useState("")
  const [redeemAmount, setRedeemAmount] = useState("")
  const [redeemError, setRedeemError] = useState("")
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [redeemSuccessDetails, setRedeemSuccessDetails] = useState<{ bonds: number; farmName: string; txHash: string } | null>(null)

  // Fetch contract data
  const { data: activeFarmIds, isLoading: isLoadingActiveFarmIds, error: activeFarmIdsError } = useReadContract({
    address: MOCHA_TREE_CONTRACT_ADDRESS,
    abi: MOCHA_TREE_CONTRACT_ABI,
    functionName: 'getActiveFarmIds',
    chainId: scrollSepolia.id,
  });

  // Batch fetch farm configurations
  const farmConfigContracts = activeFarmIds
    ? activeFarmIds.map((farmId) => ({
        address: MOCHA_TREE_CONTRACT_ADDRESS,
        abi: MOCHA_TREE_CONTRACT_ABI,
        functionName: 'getFarmConfig',
        args: [farmId],
        chainId: scrollSepolia.id,
      }))
    : [];

  const { data: farmConfigsData, isLoading: isLoadingFarmConfigs, error: farmConfigsError } = useReadContracts({
    contracts: farmConfigContracts,
  });

  // Fetch user balances for each farm's share token (MABB)
  const balanceContracts = farmConfigsData
    ? farmConfigsData.map((result, index) => ({
        address: result.status === 'success' ? result.result.shareTokenAddress : MOCHA_TREE_CONTRACT_ADDRESS,
        abi: MOCHA_TREE_CONTRACT_ABI,
        functionName: 'balanceOf',
        args: [userAddress],
        chainId: scrollSepolia.id,
      }))
    : [];

  const { data: balanceData, isLoading: isLoadingBalances, error: balanceError } = useReadContracts({
    contracts: balanceContracts,
  });

  // MBT Token balance and allowance
  const { data: mbtBalance, refetch: refetchMbtBalance } = useReadContract({
    address: MBT_TOKEN_ADDRESS,
    abi: MBT_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [userAddress],
    chainId: scrollSepolia.id,
    query: { enabled: isConnected },
  });

  // Process farm and balance data
  const farms = farmConfigsData
    ? farmConfigsData.map((result, index) => ({
        farmId: activeFarmIds[index],
        config: result.status === 'success' ? result.result : null,
        balance: balanceData && balanceData[index]?.status === 'success' ? balanceData[index].result : BigInt(0),
        error: result.status === 'failure' ? result.error : null,
      }))
    : [];

  // Calculate total bonds owned and interest
  const totalBondsOwned = farms.reduce((sum, { balance }) => sum + balance, 0n);
  const bondsOwned = formatEther(totalBondsOwned);
  const annualInterest = (Number(bondsOwned) * 10).toFixed(2);
  const cumulativeReturn = (Number(annualInterest) * 5).toFixed(2);

  // Define stat cards data
  const statCards = [
    {
      title: "Total Bonds",
      value: `${bondsOwned}`,
      isLoading: isLoadingBalances || isLoadingFarmConfigs,
      iconColor: "green",
      icon: "Coffee",
    },
    {
      title: "Annual Interest",
      value: `$ ${annualInterest}`,
      isLoading: isLoadingBalances || isLoadingFarmConfigs,
      iconColor: "red",
      icon: "DollarSign",
    },
    {
      title: "Cumulative Return",
      value: `$ ${cumulativeReturn}`,
      isLoading: isLoadingBalances || isLoadingFarmConfigs,
      iconColor: "yellow",
      icon: "TrendingUp",
    },
  ];

  // Write contract hooks
  const { writeContractAsync: writeRedeem, isPending: isRedeemPending, isSuccess: isRedeemSuccess } = useWriteContract();

  // Handle bond redemption
  const handleRedeem = async () => {
    if (!isConnected) {
      setRedeemError("Please connect your wallet");
      return;
    }

    if (!publicClient) {
      setRedeemError("Public client not available");
      return;
    }

    setRedeemError("");
    const amount = parseFloat(redeemAmount || "0");

    // Validation
    if (!selectedFarmId) {
      setRedeemError("No farm selected");
      return;
    }

    if (amount <= 0) {
      setRedeemError("Please enter a valid amount to redeem");
      return;
    }

    const selectedFarm = farms.find(farm => farm.farmId.toString() === selectedFarmId);
    if (!selectedFarm || amount > Number(formatEther(selectedFarm.balance))) {
      setRedeemError("You don't have enough bonds to redeem");
      return;
    }

    try {
      // Redeem bonds
      const txHash = await writeRedeem({
        address: MOCHA_TREE_CONTRACT_ADDRESS,
        abi: MOCHA_TREE_CONTRACT_ABI,
        functionName: 'redeemBond',
        args: [BigInt(selectedFarmId), parseEther(amount.toString())],
      });

      setRedeemSuccessDetails({ bonds: amount, farmName: selectedFarmName, txHash });
      setRedeemError("");
      toast.success(`Successfully redeemed ${amount.toFixed(2)} bonds for ${selectedFarmName}! Transaction: ${txHash}`);
    } catch (err: any) {
      setRedeemError(`Transaction failed: ${err.message || err.toString()}`);
    }
  };

  // Handle redeem click
  const handleRedeemClick = (farmId: string, farmName: string, balance: bigint) => {
    if (!isConnected) {
      handleConnectWallet();
    } else {
      setSelectedFarmId(farmId);
      setSelectedFarmName(farmName);
      setRedeemAmount(Number(formatEther(balance)).toFixed(2));
      setIsRedeemModalOpen(true);
    }
  };

  // Handle wallet connection
  const handleConnectWallet = () => {
    if (typeof (window as any).openfort !== 'undefined') {
      (window as any).openfort.connect();
    } else {
      console.error("Openfort SDK not loaded");
      setRedeemError("Wallet connection failed. Please try again.");
    }
  };

  // Effects
  useEffect(() => {
    if (isRedeemSuccess) {
      setRedeemAmount("");
      setSelectedFarmId("");
      setSelectedFarmName("");
    }
  }, [isRedeemSuccess]);

  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode")
    if (savedMode !== null) {
      setDarkMode(savedMode === "true")
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      setDarkMode(prefersDark)
    }
  }, [])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
    localStorage.setItem("darkMode", darkMode.toString())
  }, [darkMode])

  const truncateAddress = (address) => {
    if (!address) return "N/A"
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
  }

  const formatMbtBalance = (): string => {
    if (!mbtBalance) return "0.00";
    return Number(formatUnits(mbtBalance as bigint, MBT_DECIMALS)).toFixed(2);
  };

  // Redeem calculations
  const selectedFarm = farms.find(farm => farm.farmId.toString() === selectedFarmId);
  const maxRedeemable = selectedFarm ? Number(formatEther(selectedFarm.balance)) : 0;
  const redeemAmountNum = parseFloat(redeemAmount || "0");
  const isValidAmount = redeemAmountNum > 0 && redeemAmountNum <= maxRedeemable;

  return (
    <div className="min-h-screen bg-[#E6E6E6] dark:bg-gray-900 transition-colors duration-200 text-gray-900 dark:text-white">
      <Toaster richColors position="bottom-right-right" />
      <Header />
      <div className="pt-[72px]">
        <div className="mx-auto py-6 px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 max-w-[1800px]">
          {/* Header Section */}
          <div className="mb-6">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">MOCHA ASSET-BACKED BONDS</div>
            <h1 className="text-2xl sm:text-3xl font-bold dark:text-white">Investments</h1>
          </div>

          {/* Main Content Grid */}
          <div className="space-y-6">
            {/* Stats Cards - Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {statCards.map((card, index) => (
                <StatCard
                  key={index}
                  title={card.title}
                  value={card.value}
                  isLoading={card.isLoading}
                  iconColor={card.iconColor}
                  icon={card.icon}
                />
              ))}
            </div>

            {/* Bonds Content */}
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-bold dark:text-white">Your Bond Investments</CardTitle>
                <CardDescription className="text-gray-500 dark:text-gray-400">
                  Tree-Secured Fixed Income Investment | Manage your bond holdings and redemption options
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Farm</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Bonds Owned</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Value</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Annual Interest</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingFarmConfigs || isLoadingBalances ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">Loading bonds...</td>
                        </tr>
                      ) : farmConfigsError || balanceError ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-4 text-center text-red-600 dark:text-red-400">Error loading bonds</td>
                        </tr>
                      ) : farms.filter(({ balance }) => balance > 0).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                            No bonds owned. <Link href="/marketplace" className="text-[#522912] dark:text-[#7A5540] cursor-pointer">Buy bonds now</Link>
                          </td>
                        </tr>
                      ) : (
                        farms
                          .filter(({ balance }) => balance > 0)
                          .map(({ farmId, config, balance }) => (
                            <tr
                              key={farmId.toString()}
                              className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                              <td className="px-4 py-4">
                                <div className="flex flex-col">
                                  <span className="font-medium dark:text-white">{config?.name || "N/A"}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">Farm Owner: {truncateAddress(config?.farmOwner)}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-right text-sm dark:text-white">
                                {formatEther(balance)}
                              </td>
                              <td className="px-4 py-4 text-right text-sm dark:text-white">
                                ${(Number(formatEther(balance)) * 100).toLocaleString()}
                              </td>
                              <td className="px-4 py-4 text-right text-sm dark:text-white">
                                ${(Number(formatEther(balance)) * 10).toLocaleString()}
                              </td>
                              <td className="px-4 py-4 text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="border-[#7A5540] text-[#7A5540] hover:bg-[#7A5540] hover:text-white"
                                    onClick={() => config && handleRedeemClick(farmId.toString(), config.name, balance)}
                                  >
                                    Redeem
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Redeem Bonds Modal */}
        <Dialog open={isRedeemModalOpen} onOpenChange={setIsRedeemModalOpen}>
          <DialogContent className="bg-gray-50 dark:bg-gray-800 border-none p-6 text-gray-500 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold dark:text-white">
                Redeem Bonds for {selectedFarmName || "Selected Farm"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {!isConnected ? (
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Please connect your wallet to redeem bonds.
                  </p>
                  <Button
                    className="bg-[#7A5540] hover:bg-[#6A4A36] text-white border-none"
                    onClick={handleConnectWallet}
                  >
                    Connect Wallet
                  </Button>
                </div>
              ) : redeemSuccessDetails ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2 dark:text-white">Redemption Successful!</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    You have redeemed {redeemSuccessDetails.bonds.toFixed(2)} bonds for {redeemSuccessDetails.farmName}.
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Transaction Hash: {truncateAddress(redeemSuccessDetails.txHash)}
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Bonds Owned:</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{maxRedeemable.toFixed(2)} Bonds</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Value:</span>
                      <span className="text-sm text-gray-700 dark:text-gray-200">${(maxRedeemable * 100).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">
                      Amount to Redeem (1–{maxRedeemable.toFixed(2)} Bonds)
                    </label>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setRedeemAmount(Math.max(1, redeemAmountNum - 1).toFixed(2))} 
                        disabled={redeemAmountNum <= 1}
                        className="bg-white dark:bg-gray-800 border-none"
                      >
                        -
                      </Button>
                      <Input
                        type="text"
                        value={redeemAmount}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || (/^\d*\.?\d*$/.test(value) && parseFloat(value) >= 0 && parseFloat(value) <= maxRedeemable)) {
                            setRedeemAmount(value);
                            setRedeemError("");
                          }
                        }}
                        className="bg-white dark:bg-gray-800 border-none text-center"
                        placeholder="1.00"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setRedeemAmount(Math.min(maxRedeemable, redeemAmountNum + 1).toFixed(2))} 
                        disabled={redeemAmountNum >= maxRedeemable}
                        className="bg-white dark:bg-gray-800 border-none"
                      >
                        +
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={() => setRedeemAmount(maxRedeemable.toFixed(2))}
                        className="text-sm text-[#7A5540] dark:text-[#A57A5F]"
                      >
                        Max
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Bond Value:</span>
                      <span className="text-sm text-gray-700 dark:text-gray-200">$100 per bond</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Value:</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        ${(redeemAmountNum * 100).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {redeemError && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-red-600 dark:text-red-400 text-sm">{redeemError}</p>
                    </div>
                  )}

                  {isRedeemPending && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-yellow-600 dark:text-yellow-400 text-sm">Transaction pending...</p>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                    <p className="mb-1">
                      <strong>Important:</strong> By proceeding, you agree to:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Redeem your bonds for their value</li>
                      <li>Terms and conditions of the bond agreement</li>
                    </ul>
                    <p className="mt-2">
                      Note: Full principal at maturity (Year 5).
                    </p>
                  </div>
                </>
              )}
            </div>
            
            {isConnected && (
              <DialogFooter className="mt-6 flex justify-end space-x-2">
                <Button
                  variant="outline"
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-300 border-none"
                  onClick={() => {
                    setIsRedeemModalOpen(false);
                  }}
                  disabled={isRedeemPending}
                >
                  {redeemSuccessDetails ? "Close" : "Cancel"}
                </Button>
                {!redeemSuccessDetails && (
                  <Button
                    className="bg-[#7A5540] hover:bg-[#6A4A36] text-white border-none"
                    onClick={handleRedeem}
                    disabled={!isValidAmount || isRedeemPending}
                  >
                    {isRedeemPending ? "Processing..." : `Redeem ${redeemAmountNum.toFixed(2)} Bonds`}
                  </Button>
                )}
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}