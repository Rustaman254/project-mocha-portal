
"use client"

import { useState, useEffect } from "react"
import { Search, Filter, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Info, MoreHorizontal, RefreshCw, Coffee, AlertTriangle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useAccount, useReadContract, useReadContracts, useWriteContract, useBalance, usePublicClient, useWatchContractEvent } from "wagmi"
import { formatEther, parseUnits, formatUnits } from "viem"
import { scrollSepolia } from "viem/chains"
import Header from "@/components/@shared-components/header"
import StatCard from "@/components/@shared-components/statCard"
import { TREE_CONTRACT_ABI, TREE_CONTRACT_ADDRESS, MBT_ADDRESS, eventsAbi } from "@/config/constants"
import Link from "next/link"
import { Toaster, toast } from "sonner"
import { FarmsTable } from "@/components/@shared-components/FarmsTable"
import { ChartLineDefault } from "@/components/@shared-components/charts/chart-line"
import { ChartRadialShape } from "@/components/@shared-components/charts/chat-radial"

const MOCHA_TREE_CONTRACT_ADDRESS = TREE_CONTRACT_ADDRESS;
const MOCHA_TREE_CONTRACT_ABI = TREE_CONTRACT_ABI;
const MBT_TOKEN_ADDRESS = MBT_ADDRESS;
const BOND_PRICE_USD = 100;
const MBT_PRICE_USD = 25;
const BOND_MBT = BOND_PRICE_USD / MBT_PRICE_USD; // 4 MBT per full Tree
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
  const [purchaseSuccessDetails, setPurchaseSuccessDetails] = useState<{ Trees: number; farmName: string; txHash: string } | null>(null)
  const [transactions, setTransactions] = useState([])
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(5)

  const [previousTotalBonds, setPreviousTotalBonds] = useState(0);
  const [previousAnnualInterest, setPreviousAnnualInterest] = useState(0);
  const [previousCumulativeReturn, setPreviousCumulativeReturn] = useState(0);

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

  const firstAvailableFarm = farms.find(
    farm => farm.config?.active && farm.config?.treeCount > 0
  );

  console.log("First available farm:", firstAvailableFarm);

  // Calculate total Trees owned and interest
  const totalBondsOwned = farms.reduce((sum, { balance }) => sum + Number(balance), 0);
  const annualInterestUSD = formatUnits(totalBondsOwned * 10, MBT_DECIMALS); // 10% of $100 per Tree
  const annualInterestMBT = annualInterestUSD * 0.04; // $1 = 0.04 MBT
  const cumulativeReturnUSD = annualInterestUSD * 5; // 5-year term
  const cumulativeReturnMBT = cumulativeReturnUSD * 0.04; // $1 = 0.04 MBT

  // Write contract hooks
  const { writeContractAsync: writeApprove, isPending: isApprovePending, isSuccess: isApproveSuccess } = useWriteContract();
  const { writeContractAsync: writePurchase, isPending: isPurchasePending, isSuccess: isPurchaseSuccess } = useWriteContract();

  // Pagination calculations
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentTxs = transactions.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(transactions.length / rowsPerPage);

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

  const logs = publicClient?.getLogs({
    address: MOCHA_TREE_CONTRACT_ADDRESS,
    toBlock: 'latest',
    topics: [
      null,
      [userAddress],
    ],
  });

  // Handle Tree purchase
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
      // Purchase Trees
      const txHash = await writePurchase({
        address: MOCHA_TREE_CONTRACT_ADDRESS,
        abi: MOCHA_TREE_CONTRACT_ABI,
        functionName: 'purchaseBond',
        args: [BigInt(selectedFarmId), totalCost],
      });

      const Trees = mbtAmountNum / BOND_MBT;
      setPurchaseSuccessDetails({ Trees, farmName: selectedFarmName, txHash });
      setPurchaseError("");
      toast.success(`Successfully purchased ${Trees.toFixed(2)} Trees for ${selectedFarmName}! Transaction: ${txHash}`);

      // Force recalculation of trends by updating previous values
      setPreviousTotalBonds(totalBondsOwned);
      setPreviousAnnualInterest(annualInterestMBT);
      setPreviousCumulativeReturn(cumulativeReturnMBT);
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

  // Handle buy more click (from table)
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

  const handleQuickBuyClick = () => {
    const availableFarm = farms.find(farm => farm.config?.active && farm.config?.treeCount > 0);
    if (availableFarm) {
      setSelectedFarmId(availableFarm.farmId.toString());
      setSelectedFarmName(availableFarm.config?.name || "Unknown Farm");
      setMbtAmount(Number(formatUnits(availableFarm.config?.minInvestment || BigInt(0), MBT_DECIMALS)).toFixed(2));
      setIsPurchaseModalOpen(true);
    } else {
      setPurchaseError("No more Trees available to buy in any farm. Please check back later.");
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

  useEffect(() => {
    if (!isLoadingBalances && !isLoadingFarmConfigs && totalBondsOwned > 0) {
      // Calculate percentage changes
      const totalBondsChange = previousTotalBonds > 0
        ? ((totalBondsOwned - previousTotalBonds) / previousTotalBonds) * 100
        : 0;

      const annualInterestChange = previousAnnualInterest > 0
        ? ((annualInterestMBT - previousAnnualInterest) / previousAnnualInterest) * 100
        : 0;

      const cumulativeReturnChange = previousCumulativeReturn > 0
        ? ((cumulativeReturnMBT - previousCumulativeReturn) / previousCumulativeReturn) * 100
        : 0;

      // Update statCards with calculated trends
      setStatCards([
        {
          title: "Locked MBTs",
          value: `${formatEther(totalBondsOwned)}`,
          isLoading: isLoadingBalances || isLoadingFarmConfigs,
          iconColor: totalBondsChange >= 0 ? "green" : "red",
          icon: "Coffee",
          trend: {
            value: `${totalBondsChange >= 0 ? '+' : ''}${totalBondsChange.toFixed(1)}%`,
            isPositive: totalBondsChange >= 0
          },
          footerLine1: "Growing steadily",
          footerLine2: "Based on your current holdings"
        },
        {
          title: "Avalable MBTs",
          value: `${annualInterestMBT.toFixed(2)} MBT`,
          isLoading: isLoadingBalances || isLoadingFarmConfigs,
          iconColor: annualInterestChange >= 0 ? "green" : "red",
          icon: "DollarSign",
          trend: {
            value: `${annualInterestChange >= 0 ? '+' : ''}${annualInterestChange.toFixed(1)}%`,
            isPositive: annualInterestChange >= 0
          },
          footerLine1: "Estimated yearly return",
          footerLine2: "At current rates"
        },
        {
          title: "MBT Cumulative Return",
          value: `${cumulativeReturnMBT.toFixed(2)} MBT`,
          isLoading: isLoadingBalances || isLoadingFarmConfigs,
          iconColor: cumulativeReturnChange >= 0 ? "green" : "red",
          icon: "TrendingUp",
          trend: {
            value: `${cumulativeReturnChange >= 0 ? '+' : ''}${cumulativeReturnChange.toFixed(1)}%`,
            isPositive: cumulativeReturnChange >= 0
          },
          footerLine1: "5-year projection",
          footerLine2: "Based on current holdings"
        },
      ]);

      // Update previous values
      setPreviousTotalBonds(totalBondsOwned);
      setPreviousAnnualInterest(annualInterestMBT);
      setPreviousCumulativeReturn(cumulativeReturnMBT);
    }
  }, [totalBondsOwned, annualInterestMBT, cumulativeReturnMBT, isLoadingBalances, isLoadingFarmConfigs]);

  const [statCards, setStatCards] = useState([
    {
      title: "Locked MBTs",
      value: `${formatEther(totalBondsOwned)}`,
      isLoading: isLoadingBalances || isLoadingFarmConfigs,
      iconColor: "green",
      icon: "Coffee",
      trend: {
        value: "+0.0%",
        isPositive: true
      },
      footerLine1: "Growing steadily",
      footerLine2: "Based on your current holdings"
    },
    {
      title: "Avalable MBTs",
      value: `${annualInterestMBT.toFixed(2)} MBT`,
      isLoading: isLoadingBalances || isLoadingFarmConfigs,
      iconColor: "red",
      icon: "DollarSign",
      trend: {
        value: "+0.0%",
        isPositive: true
      },
      footerLine1: "Estimated yearly return",
      footerLine2: "At current rates"
    },
    {
      title: "MBT Cumulative Return",
      value: `${cumulativeReturnMBT.toFixed(2)} MBT`,
      isLoading: isLoadingBalances || isLoadingFarmConfigs,
      iconColor: "yellow",
      icon: "TrendingUp",
      trend: {
        value: "+0.0%",
        isPositive: true
      },
      footerLine1: "5-year projection",
      footerLine2: "Based on current holdings"
    },
  ]);

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

  // Farm name map
  const farmNameMap = new Map(farms.map((farm) => [farm.farmId.toString(), farm.config?.name || 'Unknown']))

  return (
    <div className="min-h-screen bg-[#E6E6E6] dark:bg-gray-900 transition-colors duration-200 text-gray-900 dark:text-white">
      <Toaster richColors position="bottom-right" />
      <Header />
      <div className="pt-[72px]">
        <div className="mx-auto py-6 px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 max-w-[1800px]">
          {/* Header Section */}
          <div className="mb-6">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">MOCHA ASSET-BACKED INVESTMENTS</div>
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
                    trend={card.trend}
                    footerLine1={card.footerLine1}
                    footerLine2={card.footerLine2}
                  />
                ))}
              </div>

              {/* Tabs for Trees and Transactions */}
              <Tabs defaultValue="Trees" className="space-y-4">
                <TabsList className="rounded-full bg-white dark:bg-gray-800 p-1">
                  <TabsTrigger
                    value="Trees"
                    className="rounded-full data-[state=active]:bg-[#522912] data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-[#522912]"
                  >
                    Investments
                  </TabsTrigger>
                  <TabsTrigger
                    value="transactions"
                    className="rounded-full data-[state=active]:bg-[#522912] data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-[#522912]"
                  >
                    Transactions
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="Trees" className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold dark:text-white">Your Investments</h2>
                    <p className="text-gray-500 dark:text-gray-400">Manage your MBT holdings</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg dark:border-gray-700 overflow-x-auto">
                    {!isConnected ? (
                      <div className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                        Connect wallet to view your Trees
                      </div>
                    ) : farms.filter(({ balance }) => balance > 0).length === 0 ? (
                      <div className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                        No Trees yet. <Link href="/marketplace" className="text-[#7A5540] dark:text-amber-600 hover:underline">Buy Trees</Link>
                      </div>
                    ) : (
                      <FarmsTable
                        data={farms
                          .filter(({ balance }) => balance > 0)
                          .map(({ farmId, config, balance }) => ({
                            id: farmId.toString(),
                            name: config?.name || "N/A",
                            farmOwner: truncateAddress(config?.farmOwner),
                            bondsOwned: formatEther(balance),
                            annualInterest: `${(Number(formatEther(balance)) * 0.4).toFixed(2)} MBT`,
                            status: config?.active ? "Active" : "Inactive",
                          }))}
                        onBuyMore={(farmId, farmName) => {
                          const farm = farms.find(f => f.farmId.toString() === farmId);
                          if (farm && farm.config) {
                            handleBuyMoreClick(farmId, farmName, farm.config.minInvestment);
                          }
                        }}
                        isLoading={isLoadingBalances || isLoadingFarmConfigs}
                        showCheckbox={false}
                        showActions={false}
                        showBuyMoreLink={true}
                        showTabs={false}
                        showFilter={false}
                      />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="transactions" className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold dark:text-white">Your Transactions</h2>
                    <p className="text-gray-500 dark:text-gray-400">Track all your Tree-related transactions</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg dark:border-gray-700 overflow-x-auto">
                    {transactions.length === 0 ? (
                      <div className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">Transaction section coming soon</div>
                    ) : (
                      <FarmsTable
                        data={currentTxs.map((tx) => ({
                          id: tx.farmId.toString(),
                          name: (farmNameMap.get(tx.farmId) || 'Unknown Farm') as string,
                          farmOwner: truncateAddress(tx.txHash),
                          bondsOwned: (parseFloat(tx.amount) / BOND_MBT).toFixed(2),
                          annualInterest: `${((parseFloat(tx.amount) / BOND_MBT) * 0.4).toFixed(2)} MBT`,
                          status: tx.type as string,
                        }))}
                        onBuyMore={(farmId, farmName) => {
                          const farm = farms.find(f => f.farmId.toString() === farmId);
                          if (farm && farm.config) {
                            handleBuyMoreClick(farmId, farmName, farm.config.minInvestment);
                          }
                        }}
                        isLoading={isLoadingTransactions}
                        showCheckbox={false}
                        showActions={false}
                        showBuyMoreLink={false}
                        showTabs={false}
                        showFilter={false}
                      />
                    )}

                    {/* Pagination */}
                    {transactions.length > 0 && (
                      <div className="flex justify-between items-center p-4 border-t dark:border-gray-800">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(p => p - 1)}
                          className="bg-white dark:bg-gray-800 border-none"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(p => p + 1)}
                          className="bg-white dark:bg-gray-800 border-none"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Column (Quick Actions) - Sticky */}
            <div className="lg:col-span-1 sticky top-[72px] self-start">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 space-y-6 border dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400">QUICK ACTIONS</div>
                  <div className="bg-[#7A5540] dark:bg-amber-700 text-white text-xs px-2 py-1 rounded-full">1/1</div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg p-4">
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
                    <div className="text-lg font-medium dark:text-white">{annualInterestMBT.toFixed(2)} MBT</div>
                  </div>
                </div>

                <Button
                  className="w-full bg-[#7A5540] hover:bg-[#6A4A36] text-white"
                  onClick={handleQuickBuyClick}
                >
                  <Coffee className="mr-2 h-4 w-4" />
                  Invest Now
                </Button>

                <div className="text-center">
                  {/* <Link href="/farm-reports" className="text-sm text-[#7A5540] dark:text-amber-600 font-medium flex items-center justify-center w-full hover:underline">
                    View Farm Reports
                    <ChevronRight className="ml-1 w-4 h-4" />
                  </Link> */}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Trees Modal */}
        <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
          <DialogContent className="bg-gray-50 dark:bg-gray-800 border-none p-6 text-gray-500 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold dark:text-white">
                {/* Purchase Trees for {selectedFarmName || "Selected Farm"} */}
                Invest in a Tree
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {!isConnected ? (
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Please connect your wallet to purchase Trees.
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
                    You have purchased {purchaseSuccessDetails.Trees.toFixed(2)} Trees for {purchaseSuccessDetails.farmName}.
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Transaction Hash: {truncateAddress(purchaseSuccessDetails.txHash)}
                  </p>
                </div>
              ) : selectedFarmId ? (
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
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Tree Cost:</span>
                      <span className="text-sm text-gray-700 dark:text-gray-200">{BOND_MBT} MBT per Tree</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total MBT Cost:</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {mbtAmountNum.toFixed(2)} MBT
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Tree to invest in:</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {bondCount.toFixed(2)} trees
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
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-blue-800">
                      <p className="text-yellow-600 dark:text-yellow-400 text-sm">Purchase transaction pending...</p>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                    <p className="mb-1">
                      <strong>Important:</strong> By proceeding, you agree to:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Complete KYC/AML verification if required</li>
                      <li>Receive digital Tree tokens upon successful payment</li>
                      <li>Terms and conditions of the Tree purchase agreement</li>
                    </ul>
                    <p className="mt-2">
                      Note: 1 Tree is equivalent to $100 and requires {BOND_MBT} MBT (since 1 MBT = 1kg roasted coffee ≈ $25). Fractional ownership is supported, with minimum $1 investment (0.04 MBT for 0.01 Tree or 1% of a full Tree). This enables micro-investing in agricultural assets.
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <AlertTriangle className="w-12 h-12 text-yellow-600 dark:text-yellow-400 mx-auto mb-2" />
                    <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                      No farm selected. Please select a farm from your Trees list or the marketplace.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {isConnected && (
              <DialogFooter className="mt-6 flex justify-end space-x-2">
                <Button
                  variant="outline"
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-300 border-none"
                  onClick={() => {
                    setIsPurchaseModalOpen(false);
                    setPurchaseSuccessDetails(null);
                    setSelectedFarmId("");
                    setSelectedFarmName("");
                    setMbtAmount("");
                    setPurchaseError("");
                  }}
                  disabled={isApprovePending || isPurchasePending || isApproving}
                >
                  {purchaseSuccessDetails ? "Close" : "Cancel"}
                </Button>
                {!purchaseSuccessDetails && selectedFarmId && (
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
                        {isPurchasePending ? "Purchasing..." : `Purchase ${bondCount.toFixed(2)} Trees`}
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