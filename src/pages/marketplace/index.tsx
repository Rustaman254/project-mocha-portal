"use client"

import { useState, useEffect, useMemo } from "react"
import { Search, Filter, ArrowUp, ArrowDown, AlertTriangle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useAccount, useReadContract, useReadContracts, useWriteContract, usePublicClient } from "wagmi"
import { parseUnits, formatUnits } from "viem"
import { scrollSepolia } from "viem/chains"
import Header from "@/components/@shared-components/header"
import { Toaster, toast } from "sonner"
import { TREE_CONTRACT_ADDRESS, MBT_ADDRESS, TREE_CONTRACT_ABI } from "@/config/constants" 

// Types
interface FarmConfig {
  name: string;
  shareTokenSymbol: string;
  shareTokenAddress: `0x${string}`;
  farmOwner: `0x${string}`;
  treeCount: bigint;
  targetAPY: bigint;
  active: boolean;
  bondValue: bigint;
  collateralRatio: bigint;
  createdTimestamp: bigint;
  maturityPeriod: bigint;
  maturityTimestamp: bigint;
  maxInvestment: bigint;
  minInvestment: bigint;
}

interface Farm {
  farmId: bigint;
  data: FarmConfig | null;
  error: Error | null;
}

interface SelectedFarmData {
  farmId: bigint;
  data: FarmConfig;
  error: Error | null;
}

// Contract addresses and constants
const MOCHA_TREE_CONTRACT_ADDRESS = TREE_CONTRACT_ADDRESS;
const MBT_TOKEN_ADDRESS = MBT_ADDRESS;
const MOCHA_TREE_CONTRACT_ABI = TREE_CONTRACT_ABI;

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

const BOND_PRICE_USD = 100;
const MBT_PRICE_USD = 25;
const BOND_MBT = BOND_PRICE_USD / MBT_PRICE_USD; // 4 MBT per full bond
const MBT_DECIMALS = 18;

// Logging utility
const logAction = (action: string, details: Record<string, any> = {}) => {
  console.log(`[${new Date().toISOString()}] ${action}`, details);
};

export default function Marketplace() {
  const { address: userAddress, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: scrollSepolia.id });
  
  // State variables with proper typing
  const [marketTab, setMarketTab] = useState<"All" | "Active">("All");
  const [sortBy, setSortBy] = useState<"id" | "name" | "bonds" | "interest">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState<boolean>(false);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [selectedFarmName, setSelectedFarmName] = useState<string>("");
  const [mbtAmount, setMbtAmount] = useState<string>("");
  const [purchaseError, setPurchaseError] = useState<string>("");
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
  const [selectedFarmData, setSelectedFarmData] = useState<SelectedFarmData | null>(null);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [approvalTxHash, setApprovalTxHash] = useState<string>("");
  const [purchaseSuccessDetails, setPurchaseSuccessDetails] = useState<{ bonds: number; farmName: string; txHash: string } | null>(null);

  // Contract reads
  const { data: activeFarmIds, isLoading: isLoadingActiveFarmIds, error: activeFarmIdsError } = useReadContract({
    address: MOCHA_TREE_CONTRACT_ADDRESS,
    abi: MOCHA_TREE_CONTRACT_ABI,
    functionName: 'getActiveFarmIds',
    chainId: scrollSepolia.id,
  });

  const farmConfigContracts = activeFarmIds
    ? (activeFarmIds as bigint[]).map((farmId) => ({
        address: MOCHA_TREE_CONTRACT_ADDRESS,
        abi: MOCHA_TREE_CONTRACT_ABI,
        functionName: 'getFarmConfig',
        args: [farmId],
        chainId: scrollSepolia.id,
      }))
    : [];

  const { data: farmConfigsData, isLoading: isLoadingFarmConfigs, error: farmConfigsError } = useReadContracts({
    contracts: farmConfigContracts,
  })

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

  // Process farms data
  const farms: Farm[] = farmConfigsData && activeFarmIds
    ? farmConfigsData.map((result, index) => ({
        farmId: (activeFarmIds as bigint[])[index],
        data: result.status === 'success' ? (result.result as FarmConfig) : null,
        error: result.status === 'failure' ? (result.error as Error) : null,
      }))
    : [];


  // Filter and sort farms
  const filteredFarms = farms
    .filter(({ data }) => {
      if (!data) return false;
      if (marketTab === "Active") return data.active;
      return true;
    })
    .filter(({ data }) => {
      if (!searchQuery || !data) return true;
      return (
        data.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        data.shareTokenSymbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
    .sort((a, b) => {
      if (!a.data || !b.data) return 0;
      let comparison = 0;
      switch (sortBy) {
        case "id":
          comparison = Number(a.farmId) - Number(b.farmId);
          break;
        case "name":
          comparison = a.data.name.localeCompare(b.data.name);
          break;
        case "bonds":
          comparison = Number(a.data.treeCount) - Number(b.data.treeCount);
          break;
        case "interest":
          comparison = Number(a.data.targetAPY) - Number(b.data.targetAPY);
          break;
        default:
          comparison = a.data.name.localeCompare(b.data.name);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  // Write contract hooks
  const { writeContractAsync: writeApprove, isPending: isApprovePending, isSuccess: isApproveSuccess } = useWriteContract();
  const { writeContractAsync: writePurchase, isPending: isPurchasePending, isSuccess: isPurchaseSuccess } = useWriteContract();

  // Handle MBT token approval
  const approveTokens = async (amount: bigint) => {
    if (!isConnected) {
      setPurchaseError("Please connect your wallet");
      logAction("Approval Failed: Wallet not connected", { userAddress });
      return false;
    }

    try {
      setIsApproving(true);
      setPurchaseError("");
      logAction("Initiating MBT Approval", { userAddress, amount: formatUnits(amount, MBT_DECIMALS), contract: MOCHA_TREE_CONTRACT_ADDRESS });

      const txHash = await writeApprove({
        address: MBT_TOKEN_ADDRESS,
        abi: MBT_TOKEN_ABI,
        functionName: 'approve',
        args: [MOCHA_TREE_CONTRACT_ADDRESS, amount],
      });

      setApprovalTxHash(txHash);
      logAction("MBT Approval Successful", { userAddress, txHash, amount: formatUnits(amount, MBT_DECIMALS) });
      return true;
    } catch (err: any) {
      setPurchaseError(`Approval failed: ${err.message || err.toString()}`);
      logAction("MBT Approval Failed", { userAddress, error: err.message || err.toString(), amount: formatUnits(amount, MBT_DECIMALS) });
      return false;
    } finally {
      setIsApproving(false);
    }
  };

  // Handle bond purchase
  const handlePurchase = async () => {
    if (!isConnected) {
      setPurchaseError("Please connect your wallet");
      logAction("Purchase Failed: Wallet not connected", { userAddress });
      return;
    }

    if (!publicClient) {
      setPurchaseError("Public client not available");
      logAction("Purchase Failed: Public client not available", { userAddress });
      return;
    }

    setPurchaseError("");
    const amount = mbtAmountNum;

    // Validation
    if (!selectedFarmId) {
      setPurchaseError("No farm selected");
      logAction("Purchase Failed: No farm selected", { userAddress, mbtAmount: amount });
      return;
    }

    const minInvestmentNum = Number(formatUnits(minInvestment, MBT_DECIMALS));
    const maxInvestmentNum = Number(formatUnits(maxInvestment, MBT_DECIMALS));

    if (amount < minInvestmentNum) {
      setPurchaseError(`MBT amount must be at least ${minInvestmentNum.toFixed(2)} MBT`);
      logAction("Purchase Failed: Below minInvestment", { userAddress, mbtAmount: amount, minInvestment: minInvestmentNum });
      return;
    }
    if (amount > maxInvestmentNum) {
      setPurchaseError(`MBT amount must not exceed ${maxInvestmentNum.toFixed(2)} MBT`);
      logAction("Purchase Failed: Exceeds maxInvestment", { userAddress, mbtAmount: amount, maxInvestment: maxInvestmentNum });
      return;
    }

    const totalCost = parseUnits(amount.toString(), MBT_DECIMALS);
    
    if (!mbtBalance || BigInt(mbtBalance as bigint) < totalCost) {
      setPurchaseError(`Insufficient MBT balance. You need ${formatUnits(totalCost, MBT_DECIMALS)} MBT`);
      logAction("Purchase Failed: Insufficient MBT balance", { 
        userAddress, 
        balance: mbtBalance ? formatUnits(mbtBalance as bigint, MBT_DECIMALS) : "0", 
        required: formatUnits(totalCost, MBT_DECIMALS) 
      });
      return;
    }

    try {
      logAction("Initiating Bond Purchase", { userAddress, farmId: selectedFarmId, mbtAmount: amount, totalCost: formatUnits(totalCost, MBT_DECIMALS) });
      
      // Purchase bonds
      const txHash = await writePurchase({
        address: MOCHA_TREE_CONTRACT_ADDRESS,
        abi: MOCHA_TREE_CONTRACT_ABI,
        functionName: 'purchaseBond',
        args: [selectedFarmId, totalCost],
      });

      const bonds = mbtAmountNum / BOND_MBT;
      setPurchaseSuccessDetails({ bonds, farmName: selectedFarmName, txHash });
      setPurchaseError("");
      toast.success(`Successfully purchased ${bonds.toFixed(2)} bonds for ${selectedFarmName}! Transaction: ${txHash}`);
      logAction("Bond Purchase Successful", { 
        userAddress, 
        farmId: selectedFarmId, 
        txHash, 
        mbtAmount: amount 
      });
    } catch (err: any) {
      setPurchaseError(`Transaction failed: ${err.message || err.toString()}`);
      logAction("Bond Purchase Failed", { 
        userAddress, 
        farmId: selectedFarmId, 
        error: err.message || err.toString(), 
        mbtAmount: amount 
      });
    }
  };

  // Handle approve click
  const handleApprove = async () => {
    const totalCost = parseUnits(mbtAmountNum.toString(), MBT_DECIMALS);
    logAction("Approve Button Clicked", { userAddress, mbtAmount: mbtAmountNum, totalCost: formatUnits(totalCost, MBT_DECIMALS) });
    await approveTokens(totalCost);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await refetchAllowance();
  };

  // Handle wallet connection
  const handleConnectWallet = () => {
    logAction("Connect Wallet Initiated", { userAddress });
    if (typeof (window as any).openfort !== 'undefined') {
      (window as any).openfort.connect();
      logAction("Openfort Connect Called", { userAddress });
    } else {
      console.error("Openfort SDK not loaded");
      setPurchaseError("Wallet connection failed. Please try again.");
      logAction("Connect Wallet Failed: Openfort SDK not loaded", { userAddress });
    }
  };

  // Handle buy bonds button click
  const handleBuyBondsClick = (farmId: string, farmName: string, minInvestment: bigint) => {
    logAction("Buy Bonds Clicked", { userAddress, farmId, farmName });
    if (!isConnected) {
      handleConnectWallet();
    } else {
      setSelectedFarmId(farmId);
      setSelectedFarmName(farmName);
      setMbtAmount(Number(formatUnits(minInvestment, MBT_DECIMALS)).toFixed(2));
      setIsPurchaseModalOpen(true);
    }
  };

  // Handle row click
  const handleRowClick = (farm: Farm) => {
    if (farm.data) {
      setSelectedFarmData({
        farmId: farm.farmId,
        data: farm.data,
        error: farm.error
      });
      setIsDetailsModalOpen(true);
      logAction("Farm Details Modal Opened", { userAddress, farmId: farm.farmId.toString(), farmName: farm.data.name });
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
      logAction("Purchase Success: Resetting State", { userAddress });
    }
  }, [isPurchaseSuccess, refetchMbtBalance, refetchAllowance]);

  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
      logAction("Approval Success: Refetching Allowance", { userAddress, approvalTxHash });
    }
  }, [isApproveSuccess, refetchAllowance]);

  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode");
    if (savedMode !== null) {
      setDarkMode(savedMode === "true");
      logAction("Dark Mode Loaded from LocalStorage", { userAddress, darkMode: savedMode === "true" });
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDarkMode(prefersDark);
      logAction("Dark Mode Set from System Preference", { userAddress, darkMode: prefersDark });
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", darkMode.toString());
    logAction("Dark Mode Toggled", { userAddress, darkMode });
  }, [darkMode]);

  // Utility functions
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    logAction("Sort Order Toggled", { userAddress, newSortOrder: sortOrder === "asc" ? "desc" : "asc" });
  };

  const setSortByWrapper = (value: "id" | "name" | "bonds" | "interest") => {
    setSortBy(value);
    logAction("Sort By Changed", { userAddress, sortBy: value });
  };

  const setSearchQueryWrapper = (value: string) => {
    setSearchQuery(value);
    logAction("Search Query Changed", { userAddress, searchQuery: value });
  };

  const setMarketTabWrapper = (value: "All" | "Active") => {
    setMarketTab(value);
    logAction("Market Tab Changed", { userAddress, marketTab: value });
  };

  const setIsPurchaseModalOpenWrapper = (open: boolean) => {
    setIsPurchaseModalOpen(open);
    if (!open) {
      setMbtAmount("");
      setPurchaseError("");
      setPurchaseSuccessDetails(null);
    }
    logAction(`Purchase Modal ${open ? "Opened" : "Closed"}`, { userAddress, farmId: selectedFarmId, farmName: selectedFarmName });
  };

  const setIsDetailsModalOpenWrapper = (open: boolean) => {
    setIsDetailsModalOpen(open);
    logAction(`Farm Details Modal ${open ? "Opened" : "Closed"}`, { 
      userAddress, 
      farmId: selectedFarmData?.farmId.toString(), 
      farmName: selectedFarmData?.data?.name 
    });
  };

  const truncateAddress = (address: string | undefined): string => {
    if (!address) return "N/A";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatMbtBalance = (): string => {
    if (!mbtBalance) return "0.00";
    return Number(formatUnits(mbtBalance as bigint, MBT_DECIMALS)).toFixed(2);
  };

  const getCurrentAllowance = (): string => {
    if (!mbtAllowance) return "0.00";
    return Number(formatUnits(mbtAllowance as bigint, MBT_DECIMALS)).toFixed(2);
  };

  // Purchase calculations
  const selectedFarm = filteredFarms.find(farm => farm.farmId.toString() === selectedFarmId);
  const minInvestment = selectedFarm?.data?.minInvestment || BigInt(0);
  const maxInvestment = selectedFarm?.data?.maxInvestment || BigInt(0);
  const minInvestmentNum = Number(formatUnits(minInvestment, MBT_DECIMALS));
  const maxInvestmentNum = Number(formatUnits(maxInvestment, MBT_DECIMALS));
  const mbtAmountNum = useMemo(() => parseFloat(mbtAmount || "0"), [mbtAmount]);
  const maxMbtAllowed = maxInvestmentNum;
  const isValidAmount = mbtAmountNum >= minInvestmentNum && mbtAmountNum <= maxMbtAllowed;
  const totalCost = useMemo(() => parseUnits(mbtAmountNum.toString(), MBT_DECIMALS), [mbtAmountNum]);
  const bondCount = mbtAmountNum / BOND_MBT; // 1 bond = 4 MBT (1 MBT = $25, bond = $100)
  const hasSufficientBalance = useMemo(() => mbtBalance ? BigInt(mbtBalance as bigint) >= totalCost : false, [mbtBalance, totalCost]);
  const needsApproval = useMemo(() => mbtAllowance ? BigInt(mbtAllowance as bigint) < totalCost : true, [mbtAllowance, totalCost]);
  const canProceed = isValidAmount && hasSufficientBalance;

  // Handle MBT amount change
  const handleMbtAmountChange = (value: string) => {
    if (value === '' || (/^\d*\.?\d*$/.test(value) && parseFloat(value) >= 0 && parseFloat(value) <= maxMbtAllowed)) {
      setMbtAmount(value);
      setPurchaseError("");
      logAction("MBT Amount Changed", { userAddress, newAmount: value, farmId: selectedFarmId });
    } else if (parseFloat(value) < minInvestmentNum) {
      setPurchaseError(`MBT amount must be at least ${minInvestmentNum.toFixed(2)} MBT`);
      logAction("Invalid MBT Amount: Below minInvestment", { userAddress, newAmount: value, minInvestment: minInvestmentNum });
    } else if (parseFloat(value) > maxInvestmentNum) {
      setPurchaseError(`MBT amount must not exceed ${maxInvestmentNum.toFixed(2)} MBT`);
      logAction("Invalid MBT Amount: Exceeds maxInvestment", { userAddress, newAmount: value, maxInvestment: maxInvestmentNum });
    }
  };

  // Handle decrement
  const decrementAmount = () => {
    const newAmount = Math.max(minInvestmentNum, mbtAmountNum - 1).toFixed(2);
    setMbtAmount(newAmount);
    setPurchaseError("");
    logAction("MBT Amount Decremented", { userAddress, newAmount, farmId: selectedFarmId });
  };

  // Handle increment
  const incrementAmount = () => {
    const newAmount = Math.min(maxMbtAllowed, mbtAmountNum + 1).toFixed(2);
    setMbtAmount(newAmount);
    setPurchaseError("");
    logAction("MBT Amount Incremented", { userAddress, newAmount, farmId: selectedFarmId });
  };

  // Handle max
  const setMaxAmount = () => {
    const newAmount = maxMbtAllowed.toFixed(2);
    setMbtAmount(newAmount);
    setPurchaseError("");
    logAction("MBT Amount Set to Max", { userAddress, newAmount, farmId: selectedFarmId });
  };

  return (
    <div className="min-h-screen bg-[#E6E6E6] dark:bg-gray-900 transition-colors duration-200 text-gray-900 dark:text-white">
      <Toaster richColors position="bottom-right-right" />
      <Header />
      <div className="pt-[72px]">
        <div className="mx-auto py-6 px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 max-w-[1800px]">
          <div className="mb-6">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Mocha Asset-Backed Bonds Marketplace</div>
            <h1 className="text-3xl font-bold dark:text-white">Marketplace</h1>
            {isConnected && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                MBT Balance: {formatMbtBalance()} MBT
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="relative w-full md:w-96">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
                size={18}
              />
              <Input
                placeholder="Search farms..."
                className="pl-10 bg-white dark:bg-gray-800 border-none"
                value={searchQuery}
                onChange={(e) => setSearchQueryWrapper(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Select value={sortBy} onValueChange={setSortByWrapper}>
                <SelectTrigger className="w-[180px] bg-white dark:bg-gray-800 border-none">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="border-none bg-white dark:bg-gray-800">
                  <SelectItem value="id">Farm ID</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="bonds">Bond Count</SelectItem>
                  <SelectItem value="interest">Annual Interest</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleSortOrder}
                className="bg-white dark:bg-gray-800 border-none"
              >
                {sortOrder === "asc" ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
              </Button>
              <Button variant="outline" className="bg-white dark:bg-gray-800 border-none">
                <Filter size={18} className="mr-2" />
                Filters
              </Button>
            </div>
          </div>

          <Tabs defaultValue="All" className="mb-6" value={marketTab} onValueChange={setMarketTabWrapper}>
            <TabsList className="bg-gray-100 dark:bg-gray-800 border-none">
              <TabsTrigger value="All">All</TabsTrigger>
              <TabsTrigger value="Active">
                Active
                <span className="ml-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {farms.filter(({ data }) => data?.active).length}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b dark:border-gray-800">
                  <th className="px-4 font-bold py-3 text-left text-xs font-medium text-black-500 dark:text-gray-400 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 font-bold py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Farm
                  </th>
                  <th className="px-4 font-bold py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Share Token Address
                  </th>
                  <th className="px-4 font-bold py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-4 font-bold py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Bond Count
                  </th>
                  <th className="px-4 font-bold py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Annual Interest
                  </th>
                  <th className="px-4 font-bold py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 font-bold py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoadingActiveFarmIds || isLoadingFarmConfigs ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                      Loading farms...
                    </td>
                  </tr>
                ) : activeFarmIdsError || farmConfigsError ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-center text-red-600 dark:text-red-400">
                      Error loading farms
                      {logAction("Farm Loading Error", { userAddress, error: (activeFarmIdsError || farmConfigsError)?.message })}
                    </td>
                  </tr>
                ) : filteredFarms.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                      No farms found
                    </td>
                  </tr>
                ) : (
                  filteredFarms.map(({ farmId, data, error }, index) => (
                    <tr
                      key={farmId.toString()}
                      className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                      onClick={() => handleRowClick({ farmId, data, error })}
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {error ? (
                          <div className="text-red-600 dark:text-red-400">Error</div>
                        ) : data ? (
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{data.name}</div>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {error ? "N/A" : data ? truncateAddress(data.shareTokenAddress) : "N/A"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {error ? "N/A" : data ? truncateAddress(data.farmOwner) : "N/A"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                        {error ? "N/A" : data ? data.treeCount.toString() : "N/A"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                        {error ? "N/A" : data ? `${(Number(data.targetAPY) / 100).toFixed(2)}%` : "N/A"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                        {error ? (
                          <span className="text-red-600 dark:text-red-400">Error</span>
                        ) : data ? (
                          data.active ? (
                            <span className="text-green-600 dark:text-green-400">Active</span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">Inactive</span>
                          )
                        ) : null}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                        <Button
                          className="bg-[#7A5540] hover:bg-[#6A4A36] text-white border-none"
                          disabled={error || !data?.active}
                          onClick={() => data && handleBuyBondsClick(farmId.toString(), data.name, data.minInvestment)}
                        >
                          {isConnected ? "Buy Bonds" : "Connect Wallet"}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Farm Details Modal */}
          <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpenWrapper}>
            <DialogContent className="bg-gray-50 dark:bg-gray-800 border-none max-w-[700px] p-6">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold dark:text-white">
                  {selectedFarmData?.data?.name || "Farm"} Details
                </DialogTitle>
              </DialogHeader>
              {selectedFarmData?.error || !selectedFarmData?.data ? (
                <div className="text-center text-red-600 dark:text-red-400 p-6">
                  Error loading farm details
                  {logAction("Farm Details Error", { userAddress, farmId: selectedFarmData?.farmId.toString(), error: selectedFarmData?.error?.message })}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-center w-full h-[400px] flex items-center justify-center">
                    <div>
                      <h2 className="text-lg font-semibold dark:text-white mb-2">Farm Location</h2>
                      <p className="text-gray-500 dark:text-gray-400">Map Coming Soon</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg">
                    <h2 className="text-lg font-semibold dark:text-white mb-3">Farm Information</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Farm Name</p>
                        <p className="text-base dark:text-white">{selectedFarmData.data.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Owner</p>
                        <p className="text-base dark:text-white">{truncateAddress(selectedFarmData.data.farmOwner)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Bond Count</p>
                        <p className="text-base dark:text-white">{selectedFarmData.data.treeCount.toString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Annual Interest</p>
                        <p className="text-base dark:text-white">{(Number(selectedFarmData.data.targetAPY) / 100).toFixed(2)}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                        <p className="text-base dark:text-white">
                          {selectedFarmData.data.active ? (
                            <span className="text-green-600 dark:text-green-400">Active</span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">Inactive</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Share Token Symbol</p>
                        <p className="text-base dark:text-white">{selectedFarmData.data.shareTokenSymbol}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Bond Value</p>
                        <p className="text-base dark:text-white">${Number(selectedFarmData.data.bondValue).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Collateral Ratio</p>
                        <p className="text-base dark:text-white">{(Number(selectedFarmData.data.collateralRatio) / 100).toFixed(2)}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Created Date</p>
                        <p className="text-base dark:text-white">
                          {new Date(Number(selectedFarmData.data.createdTimestamp) * 1000).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Maturity Period</p>
                        <p className="text-base dark:text-white">{selectedFarmData.data.maturityPeriod.toString()} months</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Maturity Date</p>
                        <p className="text-base dark:text-white">
                          {new Date(Number(selectedFarmData.data.maturityTimestamp) * 1000).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Min Investment</p>
                        <p className="text-base dark:text-white">{Number(formatUnits(selectedFarmData.data.minInvestment, MBT_DECIMALS)).toFixed(2)} MBT</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Max Investment</p>
                        <p className="text-base dark:text-white">{Number(formatUnits(selectedFarmData.data.maxInvestment, MBT_DECIMALS)).toFixed(2)} MBT</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button
                        className="bg-[#7A5540] hover:bg-[#6A4A36] text-white border-none"
                        disabled={!selectedFarmData.data.active}
                        onClick={() => {
                          setIsDetailsModalOpenWrapper(false);
                          handleBuyBondsClick(selectedFarmData.farmId.toString(), selectedFarmData.data.name, selectedFarmData.data.minInvestment);
                        }}
                      >
                        {isConnected ? "Buy Bonds" : "Connect Wallet"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-300 border-none"
                  onClick={() => setIsDetailsModalOpenWrapper(false)}
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Purchase Bonds Modal */}
          <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpenWrapper}>
            <DialogContent className="bg-gray-50 dark:bg-gray-800 border-none p-6 text-gray-500 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold dark:text-white">
                  Purchase Bonds for {selectedFarmName || "Selected Farm"}
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
                      setIsPurchaseModalOpenWrapper(false);
                      logAction("Purchase Modal Cancel Clicked", { userAddress, farmId: selectedFarmId });
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
    </div>
  );
}