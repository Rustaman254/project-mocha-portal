"use client"

import { useState, useEffect } from "react"
import { Search, Filter, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Info, MoreHorizontal, RefreshCw, Coffee, AlertTriangle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
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

export default function Dashboard() {
  const { address: userAddress, isConnected } = useAccount()
  const publicClient = usePublicClient({ chainId: scrollSepolia.id });
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState("asc")
  const [searchQuery, setSearchQuery] = useState("")
  const [darkMode, setDarkMode] = useState(false)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [selectedFarmId, setSelectedFarmId] = useState("")
  const [selectedFarmName, setSelectedFarmName] = useState("")
  const [mbtAmount, setMbtAmount] = useState("")
  const [purchaseError, setPurchaseError] = useState("")
  const [isApproving, setIsApproving] = useState(false)
  const [approvalTxHash, setApprovalTxHash] = useState("")
  const [purchaseSuccessDetails, setPurchaseSuccessDetails] = useState<{ bonds: number; farmName: string; txHash: string } | null>(null)

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

  const { data: mbtAllowance, refetch: refetchAllowance } = useReadContract({
    address: MBT_TOKEN_ADDRESS,
    abi: MBT_TOKEN_ABI,
    functionName: 'allowance',
    args: [userAddress, MOCHA_TREE_CONTRACT_ADDRESS],
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
  const totalBondsOwned = farms.reduce((sum, { balance }) => sum + Number(balance), 0);
  const annualInterest = totalBondsOwned * 10; // 10% of $100 per bond
  const cumulativeReturn = annualInterest * 5; // 5-year term

  // Define stat cards data
  const statCards = [
    {
      title: "Total Bonds",
      value: `${formatEther(totalBondsOwned)}`,
      isLoading: isLoadingBalances || isLoadingFarmConfigs,
      iconColor: "green",
      icon: "Coffee",
    },
    {
      title: "Annual Interest",
      value: `$ ${formatEther(annualInterest)}`,
      isLoading: isLoadingBalances || isLoadingFarmConfigs,
      iconColor: "red",
      icon: "DollarSign",
    },
    {
      title: "Cumulative Return",
      value: `$ ${formatEther(cumulativeReturn)}`,
      isLoading: isLoadingBalances || isLoadingFarmConfigs,
      iconColor: "yellow",
      icon: "TrendingUp",
    },
  ];

  // Write contract hooks
  const { writeContractAsync: writeApprove, isPending: isApprovePending, isSuccess: isApproveSuccess } = useWriteContract();
  const { writeContractAsync: writePurchase, isPending: isPurchasePending, isSuccess: isPurchaseSuccess } = useWriteContract();

  // Handle MBT token approval
  const approveTokens = async (amount: bigint) => {
    if (!isConnected) {
      setPurchaseError("Please connect your wallet");
      return false;
    }

    try {
      setIsApproving(true);
      setPurchaseError("");

      const txHash = await writeApprove({
        address: MBT_TOKEN_ADDRESS,
        abi: MBT_TOKEN_ABI,
        functionName: 'approve',
        args: [MOCHA_TREE_CONTRACT_ADDRESS, amount],
      });

      setApprovalTxHash(txHash);
      return true;
    } catch (err: any) {
      setPurchaseError(`Approval failed: ${err.message || err.toString()}`);
      return false;
    } finally {
      setIsApproving(false);
    }
  };

  // Handle bond purchase
  const handlePurchase = async () => {
    if (!isConnected) {
      setPurchaseError("Please connect your wallet");
      return;
    }

    if (!publicClient) {
      setPurchaseError("Public client not available");
      return;
    }

    setPurchaseError("");
    const amount = mbtAmountNum;

    // Validation
    if (!selectedFarmId) {
      setPurchaseError("No farm selected");
      return;
    }

    const minInvestmentNum = Number(formatUnits(minInvestment, MBT_DECIMALS));
    const maxInvestmentNum = Number(formatUnits(maxInvestment, MBT_DECIMALS));

    if (amount < minInvestmentNum) {
      setPurchaseError(`MBT amount must be at least ${minInvestmentNum.toFixed(2)} MBT`);
      return;
    }
    if (amount > maxInvestmentNum) {
      setPurchaseError(`MBT amount must not exceed ${maxInvestmentNum.toFixed(2)} MBT`);
      return;
    }

    const totalCost = parseUnits(amount.toString(), MBT_DECIMALS);
    
    if (!mbtBalance || BigInt(mbtBalance as bigint) < totalCost) {
      setPurchaseError(`Insufficient MBT balance. You need ${formatUnits(totalCost, MBT_DECIMALS)} MBT`);
      return;
    }

    try {
      // Purchase bonds
      const txHash = await writePurchase({
        address: MOCHA_TREE_CONTRACT_ADDRESS,
        abi: MOCHA_TREE_CONTRACT_ABI,
        functionName: 'purchaseBond',
        args: [BigInt(selectedFarmId), totalCost],
      });

      const bonds = mbtAmountNum / BOND_MBT;
      setPurchaseSuccessDetails({ bonds, farmName: selectedFarmName, txHash });
      setPurchaseError("");
      toast.success(`Successfully purchased ${bonds.toFixed(2)} bonds for ${selectedFarmName}! Transaction: ${txHash}`);
    } catch (err: any) {
      setPurchaseError(`Transaction failed: ${err.message || err.toString()}`);
    }
  };

  // Handle approve click
  const handleApprove = async () => {
    const totalCost = parseUnits(mbtAmountNum.toString(), MBT_DECIMALS);
    await approveTokens(totalCost);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await refetchAllowance();
  };

  // Handle wallet connection
  const handleConnectWallet = () => {
    if (typeof (window as any).openfort !== 'undefined') {
      (window as any).openfort.connect();
    } else {
      console.error("Openfort SDK not loaded");
      setPurchaseError("Wallet connection failed. Please try again.");
    }
  };

  // Handle buy more click
  const handleBuyMoreClick = (farmId: string, farmName: string, minInvestment: bigint) => {
    if (!isConnected) {
      handleConnectWallet();
    } else {
      setSelectedFarmId(farmId);
      setSelectedFarmName(farmName);
      setMbtAmount(Number(formatUnits(minInvestment, MBT_DECIMALS)).toFixed(2));
      setIsPurchaseModalOpen(true);
    }
  };

  // Effects
  useEffect(() => {
    if (isPurchaseSuccess) {
      setMbtAmount("");
      setSelectedFarmId("");
      setSelectedFarmName("");
      refetchMbtBalance();
      refetchAllowance();
    }
  }, [isPurchaseSuccess, refetchMbtBalance, refetchAllowance]);

  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
    }
  }, [isApproveSuccess, refetchAllowance]);

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

  // Purchase calculations
  const selectedFarm = farms.find(farm => farm.farmId.toString() === selectedFarmId);
  const minInvestment = selectedFarm?.config?.minInvestment || BigInt(0);
  const maxInvestment = selectedFarm?.config?.maxInvestment || BigInt(0);
  const minInvestmentNum = Number(formatUnits(minInvestment, MBT_DECIMALS));
  const maxInvestmentNum = Number(formatUnits(maxInvestment, MBT_DECIMALS));
  const mbtAmountNum = parseFloat(mbtAmount || "0");
  const maxMbtAllowed = maxInvestmentNum;
  const isValidAmount = mbtAmountNum >= minInvestmentNum && mbtAmountNum <= maxMbtAllowed;
  const totalCost = parseUnits(mbtAmountNum.toString(), MBT_DECIMALS);
  const bondCount = mbtAmountNum / BOND_MBT;
  const hasSufficientBalance = mbtBalance ? BigInt(mbtBalance as bigint) >= totalCost : false;
  const needsApproval = mbtAllowance ? BigInt(mbtAllowance as bigint) < totalCost : true;
  const canProceed = isValidAmount && hasSufficientBalance;

  // Handle MBT amount change
  const handleMbtAmountChange = (value: string) => {
    if (value === '' || (/^\d*\.?\d*$/.test(value) && parseFloat(value) >= 0 && parseFloat(value) <= maxMbtAllowed)) {
      setMbtAmount(value);
      setPurchaseError("");
    } else if (parseFloat(value) < minInvestmentNum) {
      setPurchaseError(`MBT amount must be at least ${minInvestmentNum.toFixed(2)} MBT`);
    } else if (parseFloat(value) > maxInvestmentNum) {
      setPurchaseError(`MBT amount must not exceed ${maxInvestmentNum.toFixed(2)} MBT`);
    }
  };

  // Handle decrement
  const decrementAmount = () => {
    const newAmount = Math.max(minInvestmentNum, mbtAmountNum - 1).toFixed(2);
    setMbtAmount(newAmount);
    setPurchaseError("");
  };

  // Handle increment
  const incrementAmount = () => {
    const newAmount = Math.min(maxMbtAllowed, mbtAmountNum + 1).toFixed(2);
    setMbtAmount(newAmount);
    setPurchaseError("");
  };

  // Handle max
  const setMaxAmount = () => {
    const newAmount = maxMbtAllowed.toFixed(2);
    setMbtAmount(newAmount);
    setPurchaseError("");
  };

  return (
    <div className="min-h-screen bg-[#E6E6E6] dark:bg-gray-900 transition-colors duration-200 text-gray-900 dark:text-white">
      <Toaster richColors position="bottom-right-right" />
      <Header />
      <div className="pt-[72px]">
        <div className="mx-auto py-6 px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 max-w-[1800px]">
          {/* Header Section */}
          <div className="mb-6">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">MOCHA ASSET-BACKED BONDS</div>
            <h1 className="text-2xl sm:text-3xl font-bold dark:text-white">Dashboard</h1>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column (Stats + Tables) */}
            <div className="lg:col-span-2 space-y-6">
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
                    // compact={window.innerWidth < 768} // Compact on mobile
                  />
                ))}
              </div>

              {/* Bonds Content */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold dark:text-white">Your Bonds</h2>
                  <p className="text-gray-500 dark:text-gray-400">Manage your bond holdings</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg dark:border-gray-700 overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b dark:border-gray-800">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Farm</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Bonds Owned</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Annual Interest</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingFarmConfigs || isLoadingBalances ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">Loading bonds...</td>
                        </tr>
                      ) : farmConfigsError || balanceError ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-4 text-center text-red-600 dark:text-red-400">Error loading bonds</td>
                        </tr>
                      ) : farms.filter(({ balance }) => balance > 0).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                            No bonds owned. <Link href="/marketplace" className="text-[#522912] dark:text-[#7A5540] cursor-pointer">Buy bonds now</Link>
                          </td>
                        </tr>
                      ) : (
                        farms
                          .filter(({ balance }) => balance > 0)
                          .map(({ farmId, config, balance }) => (
                            <tr
                              key={farmId.toString()}
                              className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            >
                              <td className="px-4 py-2">
                                <div className="flex flex-col">
                                  <span className="font-medium dark:text-white">{config?.name || "N/A"}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">Farm Owner: {truncateAddress(config?.farmOwner)}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2 text-right text-sm dark:text-white">
                                {formatEther(balance)}
                              </td>
                              <td className="px-4 py-2 text-right text-sm dark:text-white">
                                ${(Number(formatEther(balance)) * 10).toLocaleString()}
                              </td>

                              <td className="px-4 py-2 text-right text-sm dark:text-white">
                                {config?.active ? 
                                  <span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full dark:bg-green-900 dark:text-green-300">Active</span>
 : <span className="bg-red-100 text-red-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full dark:bg-red-900 dark:text-red-300">Inactive</span>}
                              </td>

                              <td className="px-4 py-2 text-right">
                                <Button 
                                  size="sm" 
                                  className="text-[#7A5540] bg-transparent cursor-pointer font-bold hover:bg-[#6A4A36]"
                                  onClick={() => config && handleBuyMoreClick(farmId.toString(), config.name, config.minInvestment)}
                                >
                                  Buy More
                                </Button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column (Quick Actions) */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 sm:p-6 space-y-6">
              <div className="flex justify-between items-center">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">QUICK ACTIONS</div>
                <div className="bg-[#7A5540] dark:bg-amber-700 text-white text-xs px-2 py-1 rounded-full">1/1</div>
              </div>
              
              <div className="bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Next Interest Payment</div>
                    <div className="text-lg sm:text-xl font-bold dark:text-white">June 15, 2026</div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-600 p-2 rounded-lg">
                    <RefreshCw className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t dark:border-gray-600">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Estimated Interest</div>
                  <div className="text-lg font-medium dark:text-white">${formatEther(annualInterest)}</div>
                </div>
              </div>
              
              <Link href="/marketplace">
                <Button className="w-full bg-[#7A5540] hover:bg-[#6A4A36] text-white">
                  <Coffee className="mr-2 h-4 w-4" />
                  Buy Bonds
                </Button>
              </Link>
              
              <div className="text-center">
                <button className="text-sm text-[#7A5540] dark:text-amber-600 font-medium flex items-center justify-center w-full">
                  View Farm Reports
                  <ChevronRight className="ml-1 w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Bonds Modal */}
        <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
          <DialogContent className="bg-gray-50 dark:bg-gray-800 border-none p-6 text-gray-500 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold dark:text-white">
                Purchase Bondsfor {selectedFarmName || "Selected Farm"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {!isConnected ? (
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Please connect your wallet to purchase bonds.
                  </p>
                  <Button
                    className="bg-[#7A5540] hover:bg-[#6A4A36] text-white border-none"
                    onClick={handleConnectWallet}
                  >
                    Connect Wallet
                  </Button>
                </div>
              ) : purchaseSuccessDetails ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2 dark:text-white">Purchase Successful!</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    You have purchased {purchaseSuccessDetails.bonds.toFixed(2)} bonds for {purchaseSuccessDetails.farmName}.
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Transaction Hash: {truncateAddress(purchaseSuccessDetails.txHash)}
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Your MBT Balance:</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{formatMbtBalance()} MBT</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Min Investment:</span>
                      <span className="text-sm text-gray-700 dark:text-gray-200">{minInvestmentNum.toFixed(2)} MBT</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Max Investment:</span>
                      <span className="text-sm text-gray-700 dark:text-gray-200">{maxInvestmentNum.toFixed(2)} MBT</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">
                      MBT Amount ({minInvestmentNum.toFixed(2)}–{maxInvestmentNum.toFixed(2)} MBT)
                    </label>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={decrementAmount} 
                        disabled={mbtAmountNum <= minInvestmentNum}
                        className="bg-white dark:bg-gray-800 border-none"
                      >
                        -
                      </Button>
                      <Input
                        type="text"
                        value={mbtAmount}
                        onChange={(e) => handleMbtAmountChange(e.target.value)}
                        className="bg-white dark:bg-gray-800 border-none text-center"
                        placeholder={minInvestmentNum.toFixed(2)}
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={incrementAmount} 
                        disabled={mbtAmountNum >= maxMbtAllowed}
                        className="bg-white dark:bg-gray-800 border-none"
                      >
                        +
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={setMaxAmount}
                        disabled={maxMbtAllowed <= minInvestmentNum}
                        className="text-sm text-[#7A5540] dark:text-[#A57A5F]"
                      >
                        Max
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Bond Cost:</span>
                      <span className="text-sm text-gray-700 dark:text-gray-200">{BOND_MBT} MBT per bond</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total MBT Cost:</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {mbtAmountNum.toFixed(2)} MBT
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Bonds to Purchase:</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {bondCount.toFixed(2)} bonds
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">USD Equivalent:</span>
                      <span className="text-sm text-gray-700 dark:text-gray-200">
                        ${(mbtAmountNum * MBT_PRICE_USD).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {!hasSufficientBalance && mbtAmount && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800 flex items-center">
                      <AlertTriangle className="w-5 h-5 mr-2 text-red-600 dark:text-red-400" />
                      <p className="text-red-600 dark:text-red-400 text-sm">Insufficient MBT balance</p>
                    </div>
                  )}

                  {needsApproval && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center">
                        <AlertTriangle className="w-5 h-5 mr-2 text-yellow-800 dark:text-yellow-200" />
                        <div className="text-yellow-800 dark:text-yellow-200 text-sm">
                          Approval required: Approve {mbtAmountNum.toFixed(2)} MBT for spending
                        </div>
                      </div>
                    </div>
                  )}

                  {purchaseError && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-red-600 dark:text-red-400 text-sm">{purchaseError}</p>
                    </div>
                  )}

                  {isApproving && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-blue-600 dark:text-blue-400 text-sm">Approving MBT tokens...</p>
                    </div>
                  )}

                  {isApprovePending && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-yellow-600 dark:text-yellow-400 text-sm">Approval transaction pending...</p>
                    </div>
                  )}

                  {isPurchasePending && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-yellow-600 dark:text-yellow-400 text-sm">Purchase transaction pending...</p>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                    <p className="mb-1">
                      <strong>Important:</strong> By proceeding, you agree to:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Complete KYC/AML verification if required</li>
                      <li>Receive digital bond tokens upon successful payment</li>
                      <li>Terms and conditions of the bond purchase agreement</li>
                    </ul>
                    <p className="mt-2">
                      Note: 1 bond is equivalent to $100 and requires {BOND_MBT} MBT (since 1 MBT = 1kg roasted coffee ≈ $25). Fractional ownership is supported, with minimum $1 investment (0.04 MBT for 0.01 bond or 1% of a full bond). This enables micro-investing in agricultural assets.
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
                    setIsPurchaseModalOpen(false);
                  }}
                  disabled={isApprovePending || isPurchasePending || isApproving}
                >
                  {purchaseSuccessDetails ? "Close" : "Cancel"}
                </Button>
                {!purchaseSuccessDetails && (
                  <>
                    {needsApproval ? (
                      <Button
                        className="bg-[#7A5540] hover:bg-[#6A4A36] text-white border-none"
                        onClick={handleApprove}
                        disabled={!canProceed || isApproving || isApprovePending || isPurchasePending}
                      >
                        {isApproving || isApprovePending ? "Approving..." : `Approve ${mbtAmountNum.toFixed(2)} MBT`}
                      </Button>
                    ) : (
                      <Button
                        className="bg-[#7A5540] hover:bg-[#6A4A36] text-white border-none"
                        onClick={handlePurchase}
                        disabled={!canProceed || isApproving || isApprovePending || isPurchasePending}
                      >
                        {isPurchasePending ? "Purchasing..." : `Purchase ${bondCount.toFixed(2)} Bonds`}
                      </Button>
                    )}
                  </>
                )}
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}