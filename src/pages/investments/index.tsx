"use client";

import { useState, useEffect } from "react";
import { ChevronDown, BarChart, Calendar, Clock, Moon, Sun, AlertTriangle, CheckCircle, ArrowUp, ArrowDown, Coffee, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAccount, useReadContracts, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { scrollSepolia } from "viem/chains";
import Header from "@/components/@shared-components/header";
import { Toaster, toast } from "sonner";
import { TREE_CONTRACT_ADDRESS, TREE_CONTRACT_ABI, MBT_ADDRESS } from "@/config/constants";

const MOCHA_TREE_CONTRACT_ADDRESS = TREE_CONTRACT_ADDRESS;
const MOCHA_TREE_CONTRACT_ABI = TREE_CONTRACT_ABI;
const MBT_TOKEN_ADDRESS = MBT_ADDRESS;
const BOND_PRICE_USD = 100;
const MBT_PRICE_USD = 25;
const BOND_MBT = BOND_PRICE_USD / MBT_PRICE_USD;
const EARLY_REDEMPTION_PENALTY = 0.2;
const MBT_DECIMALS = 18;

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

// Fix for hydration error - detect client-side only
const useIsClient = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  return isClient;
};

export default function Investments() {
  const isClient = useIsClient();
  const { address: userAddress, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: scrollSepolia.id });
  const [investmentTab, setInvestmentTab] = useState("active");
  const [darkMode, setDarkMode] = useState(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [selectedFarmName, setSelectedFarmName] = useState("");
  const [selectedBondIds, setSelectedBondIds] = useState([]);
  const [selectedBondsCount, setSelectedBondsCount] = useState(0);
  const [isEarlyRedemption, setIsEarlyRedemption] = useState(false);
  const [mbtAmount, setMbtAmount] = useState("");
  const [purchaseError, setPurchaseError] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [approvalTxHash, setApprovalTxHash] = useState("");
  const [purchaseSuccessDetails, setPurchaseSuccessDetails] = useState(null);
  const [redeemSuccessDetails, setRedeemSuccessDetails] = useState(null);
  const [rolloverSuccessDetails, setRolloverSuccessDetails] = useState(null);

  // Fix for dark mode hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem("darkMode");
      if (savedMode !== null) {
        setDarkMode(savedMode === "true");
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setDarkMode(prefersDark);
      }
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem("darkMode", darkMode.toString());
    }
  }, [darkMode]);

  // Fetch user's bond IDs
  const { data: userBondIds, isLoading: isLoadingBondIds, refetch: refetchBondIds } = useReadContract({
    address: MOCHA_TREE_CONTRACT_ADDRESS,
    abi: MOCHA_TREE_CONTRACT_ABI,
    functionName: "getUserBondIds",
    args: [userAddress],
    chainId: scrollSepolia.id,
    query: { enabled: isConnected && isClient },
  });

  // Fetch bond positions
  const bondPositionContracts = userBondIds
    ? userBondIds.map((bondId) => ({
        address: MOCHA_TREE_CONTRACT_ADDRESS,
        abi: MOCHA_TREE_CONTRACT_ABI,
        functionName: "getBondPosition",
        args: [userAddress, bondId],
        chainId: scrollSepolia.id,
      }))
    : [];

  const { data: bondPositionsData, isLoading: isLoadingBondPositions, error: bondPositionsError } = useReadContracts({
    contracts: bondPositionContracts,
    query: { enabled: isConnected && userBondIds?.length > 0 && isClient },
  });

  // Fetch unique farm configs
  const farmIds = [...new Set(bondPositionsData
    ? bondPositionsData
        .map((result, index) => (result.status === "success" ? result.result.farmId : null))
        .filter(Boolean)
    : [])];

  const farmConfigContracts = farmIds
    ? farmIds.map((farmId) => ({
        address: MOCHA_TREE_CONTRACT_ADDRESS,
        abi: MOCHA_TREE_CONTRACT_ABI,
        functionName: "getFarmConfig",
        args: [farmId],
        chainId: scrollSepolia.id,
      }))
    : [];

  const { data: farmConfigsData, isLoading: isLoadingFarmConfigs, error: farmConfigsError } = useReadContracts({
    contracts: farmConfigContracts,
    query: { enabled: farmIds.length > 0 && isClient },
  });

  // Fetch active farm IDs for rollover
  const { data: activeFarmIds } = useReadContract({
    address: MOCHA_TREE_CONTRACT_ADDRESS,
    abi: MOCHA_TREE_CONTRACT_ABI,
    functionName: "getActiveFarmIds",
    chainId: scrollSepolia.id,
    query: { enabled: isConnected && isClient },
  });

  // MBT balance and allowance
  const { data: mbtBalance, refetch: refetchMbtBalance } = useReadContract({
    address: MBT_TOKEN_ADDRESS,
    abi: MBT_TOKEN_ABI,
    functionName: "balanceOf",
    args: [userAddress],
    chainId: scrollSepolia.id,
    query: { enabled: isConnected && isClient },
  });

  const { data: mbtAllowance, refetch: refetchAllowance } = useReadContract({
    address: MBT_TOKEN_ADDRESS,
    abi: MBT_TOKEN_ABI,
    functionName: "allowance",
    args: [userAddress, MOCHA_TREE_CONTRACT_ADDRESS],
    chainId: scrollSepolia.id,
    query: { enabled: isConnected && isClient },
  });

  const { writeContractAsync: writeApprove, isPending: isApprovePending } = useWriteContract();
  const { writeContractAsync: writePurchase, isPending: isPurchasePending } = useWriteContract();
  const { writeContractAsync: writeRedeem, isPending: isRedeemPending } = useWriteContract();
  const { writeContractAsync: writeRedeemEarly, isPending: isRedeemEarlyPending } = useWriteContract();
  const { writeContractAsync: writeRollover, isPending: isRolloverPending } = useWriteContract();

  // Process data
  const farmGroups = {};
  const redeemedBonds = [];
  const now = Math.floor(Date.now() / 1000);

  bondPositionsData?.forEach((result, index) => {
    const bondId = userBondIds[index];
    if (result.status === "success") {
      const data = result.result;
      const farmData = farmConfigsData?.find((f) => f.result.farmId === data.farmId);
      if (data.redeemed) {
        redeemedBonds.push({ bondId, data, farmData });
      } else {
        const farmId = data.farmId.toString();
        if (!farmGroups[farmId]) {
          farmGroups[farmId] = { bondIds: [], totalMBT: 0n, farmData: null, maturityTimestamp: data.maturityTimestamp };
        }
        farmGroups[farmId].bondIds.push(bondId.toString());
        farmGroups[farmId].totalMBT += data.depositAmount;
        farmGroups[farmId].farmData = farmData?.result;
      }
    }
  });

  const activeFarms = [];
  const maturedFarms = [];

  Object.entries(farmGroups).forEach(([farmId, group]) => {
    if (group.farmData) {
      const totalMBTNum = Number(formatUnits(group.totalMBT, MBT_DECIMALS));
      const totalBonds = totalMBTNum / BOND_MBT;
      const apy = Number(group.farmData.targetAPY) / 10000;
      const annualInterest = totalBonds * BOND_PRICE_USD * apy;
      const entry = {
        farmId,
        name: group.farmData.name,
        owner: group.farmData.farmOwner,
        totalBonds,
        annualInterest,
        bondIds: group.bondIds,
        minInvestment: group.farmData.minInvestment,
        maxInvestment: group.farmData.maxInvestment,
        maturityTimestamp: group.maturityTimestamp,
      };
      if (group.maturityTimestamp > now) {
        activeFarms.push(entry);
      } else {
        maturedFarms.push(entry);
      }
    }
  });

  const totalBondsOwned = [...activeFarms, ...maturedFarms].reduce((sum, f) => sum + f.totalBonds, 0);
  const totalAnnualInterest = [...activeFarms, ...maturedFarms].reduce((sum, f) => sum + f.annualInterest, 0);
  const totalCumulativeReturn = totalAnnualInterest * 5; // assuming 5 years

  const statCards = [
    { title: "Total Bonds", value: totalBondsOwned.toFixed(2), isLoading: isLoadingBondIds || isLoadingBondPositions || isLoadingFarmConfigs, iconColor: "green", icon: "Coffee" },
    { title: "Annual Interest", value: `$ ${totalAnnualInterest.toFixed(2)}`, isLoading: isLoadingBondIds || isLoadingBondPositions || isLoadingFarmConfigs, iconColor: "red", icon: "DollarSign" },
    { title: "Cumulative Return", value: `$ ${totalCumulativeReturn.toFixed(2)}`, isLoading: isLoadingBondIds || isLoadingBondPositions || isLoadingFarmConfigs, iconColor: "yellow", icon: "TrendingUp" },
  ];

  const approveTokens = async (amount) => {
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
    } catch (err) {
      setPurchaseError(`Approval failed: ${err.message || err.toString()}`);
      return false;
    } finally {
      setIsApproving(false);
    }
  };

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
    const amount = parseFloat(mbtAmount || "0");

    if (!selectedFarmId) {
      setPurchaseError("No farm selected");
      return;
    }

    const minInvestmentNum = Number(formatUnits(selectedFarm?.minInvestment || 0n, MBT_DECIMALS));
    const maxInvestmentNum = Number(formatUnits(selectedFarm?.maxInvestment || 0n, MBT_DECIMALS));

    if (amount < minInvestmentNum) {
      setPurchaseError(`MBT amount must be at least ${minInvestmentNum.toFixed(2)} MBT`);
      return;
    }
    if (amount > maxInvestmentNum) {
      setPurchaseError(`MBT amount must not exceed ${maxInvestmentNum.toFixed(2)} MBT`);
      return;
    }

    const totalCost = parseUnits(amount.toString(), MBT_DECIMALS);
    
    if (mbtBalance && BigInt(mbtBalance) < totalCost) {
      setPurchaseError(`Insufficient MBT balance. You need ${formatUnits(totalCost, MBT_DECIMALS)} MBT`);
      return;
    }

    try {
      const txHash = await writePurchase({
        address: MOCHA_TREE_CONTRACT_ADDRESS,
        abi: MOCHA_TREE_CONTRACT_ABI,
        functionName: 'purchaseBond',
        args: [BigInt(selectedFarmId), totalCost],
      });

      const bonds = amount / BOND_MBT;
      setPurchaseSuccessDetails({ bonds, farmName: selectedFarmName, txHash });
      toast.success(`Successfully purchased ${bonds.toFixed(2)} bonds for ${selectedFarmName}! Transaction: ${txHash}`);
    } catch (err) {
      setPurchaseError(`Transaction failed: ${err.message}`);
    }
  };

  const handleApprove = async () => {
    const amount = parseFloat(mbtAmount || "0");
    const totalCost = parseUnits(amount.toString(), MBT_DECIMALS);
    await approveTokens(totalCost);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await refetchAllowance();
  };

  const handleConnectWallet = () => {
    if (typeof window !== 'undefined' && typeof window.openfort !== 'undefined') {
      window.openfort.connect();
    } else {
      console.error("Openfort SDK not loaded");
      toast.error("Wallet connection failed. Please try again.");
    }
  };

  const handleBuyMoreClick = (farmId, farmName, minInvestment) => {
    if (!isConnected) {
      handleConnectWallet();
    } else {
      setSelectedFarmId(farmId);
      setSelectedFarmName(farmName);
      setMbtAmount(Number(formatUnits(minInvestment, MBT_DECIMALS)).toFixed(2));
      setIsPurchaseModalOpen(true);
    }
  };

  const handleRedeemClick = (farmId, farmName, bondIds, isEarly) => {
    setSelectedFarmId(farmId);
    setSelectedFarmName(farmName);
    setSelectedBondIds(bondIds);
    setSelectedBondsCount(bondIds.length);
    setIsEarlyRedemption(isEarly);
    setIsRedeemModalOpen(true);
  };

  const handleRolloverClick = (farmId, farmName, bondIds) => {
    setSelectedFarmId(farmId);
    setSelectedFarmName(farmName);
    setSelectedBondIds(bondIds);
    setSelectedBondsCount(bondIds.length);
    setIsRolloverModalOpen(true);
  };

  const handleRedeem = async (isEarly) => {
    if (!isConnected) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      for (const bondId of selectedBondIds) {
        const txHash = await (isEarly ? writeRedeemEarly : writeRedeem)({
          address: MOCHA_TREE_CONTRACT_ADDRESS,
          abi: MOCHA_TREE_CONTRACT_ABI,
          functionName: isEarly ? 'redeemBondEarly' : 'redeemBond',
          args: [BigInt(bondId)],
        });
      }
      toast.success("Bonds redeemed successfully!");
      setRedeemSuccessDetails({ 
        bondCount: selectedBondIds.length, 
        isEarly,
        penalty: isEarly ? EARLY_REDEMPTION_PENALTY * 100 : 0 
      });
      refetchBondIds();
    } catch (err) {
      toast.error(`Transaction failed: ${err.message}`);
    }
  };

  const handleRollover = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet");
      return;
    }
    if (!selectedFarmId) {
      toast.error("Please select a new farm");
      return;
    }
    try {
      for (const bondId of selectedBondIds) {
        const txHash = await writeRollover({
          address: MOCHA_TREE_CONTRACT_ADDRESS,
          abi: MOCHA_TREE_CONTRACT_ABI,
          functionName: 'rolloverBond',
          args: [BigInt(bondId), BigInt(selectedFarmId)],
        });
      }
      toast.success("Bonds rolled over successfully!");
      setRolloverSuccessDetails({ 
        bondCount: selectedBondIds.length, 
        newFarmId: selectedFarmId,
        newFarmName: farmConfigsData?.find(f => f.result.farmId.toString() === selectedFarmId)?.result.name || "New Farm"
      });
      refetchBondIds();
    } catch (err) {
      toast.error(`Transaction failed: ${err.message}`);
    }
  };

  const formatMbtBalance = () => {
    if (!mbtBalance) return "0.00";
    return Number(formatUnits(mbtBalance, MBT_DECIMALS)).toFixed(2);
  };

  const selectedFarm = farmConfigsData?.find((f) => f.result.farmId.toString() === selectedFarmId)?.result;
  const minInvestment = selectedFarm?.minInvestment || 0n;
  const maxInvestment = selectedFarm?.maxInvestment || 0n;
  const minInvestmentNum = Number(formatUnits(minInvestment, MBT_DECIMALS));
  const maxInvestmentNum = Number(formatUnits(maxInvestment, MBT_DECIMALS));
  const mbtAmountNum = parseFloat(mbtAmount || "0");
  const maxMbtAllowed = maxInvestmentNum;
  const isValidAmount = mbtAmountNum >= minInvestmentNum && mbtAmountNum <= maxMbtAllowed;
  const totalCost = parseUnits(mbtAmountNum.toString(), MBT_DECIMALS);
  const bondCount = mbtAmountNum / BOND_MBT;
  const hasSufficientBalance = mbtBalance && BigInt(mbtBalance) >= totalCost;
  const needsApproval = mbtAllowance && BigInt(mbtAllowance) < totalCost;
  const canProceed = isValidAmount && hasSufficientBalance;

  const handleMbtAmountChange = (value) => {
    if (value === '' || (/^\d*\.?\d*$/.test(value) && parseFloat(value) >= 0 && parseFloat(value) <= maxMbtAllowed)) {
      setMbtAmount(value);
      setPurchaseError("");
    } else if (parseFloat(value) < minInvestmentNum) {
      setPurchaseError(`MBT amount must be at least ${minInvestmentNum.toFixed(2)} MBT`);
    } else if (parseFloat(value) > maxInvestmentNum) {
      setPurchaseError(`MBT amount must not exceed ${maxInvestmentNum.toFixed(2)} MBT`);
    }
  };

  const decrementAmount = () => {
    const newAmount = Math.max(minInvestmentNum, mbtAmountNum - 1).toFixed(2);
    setMbtAmount(newAmount);
    setPurchaseError("");
  };

  const incrementAmount = () => {
    const newAmount = Math.min(maxMbtAllowed, mbtAmountNum + 1).toFixed(2);
    setMbtAmount(newAmount);
    setPurchaseError("");
  };

  const setMaxAmount = () => {
    const newAmount = maxMbtAllowed.toFixed(2);
    setMbtAmount(newAmount);
    setPurchaseError("");
  };

  const truncateAddress = (address) => {
    if (!address) return "N/A";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Format date function
  const formatDate = (timestamp) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  // Early redemption penalty calculation
  const calculateRedemptionAmount = (bondCount, isEarly) => {
    const totalValue = bondCount * BOND_PRICE_USD;
    if (isEarly) {
      const penalty = totalValue * EARLY_REDEMPTION_PENALTY;
      return {
        totalValue,
        penalty,
        netAmount: totalValue - penalty
      };
    }
    return {
      totalValue,
      penalty: 0,
      netAmount: totalValue
    };
  };

  const redemptionDetails = calculateRedemptionAmount(selectedBondsCount, isEarlyRedemption);

  if (!isClient) {
    return <div className="min-h-screen bg-[#E6E6E6] dark:bg-gray-900"></div>;
  }

  return (
    <div className="min-h-screen bg-[#E6E6E6] dark:bg-gray-900 transition-colors duration-200 text-gray-900 dark:text-white">
      <Toaster richColors position="bottom-right" />
      <Header />
      <div className="pt-[72px]">
        <div className="mx-auto py-6 px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 max-w-[1800px]">
          <div className="mb-6">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">INVESTMENTS</div>
            <h1 className="text-3xl font-bold dark:text-white">Your Investments</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {statCards.map((card, index) => (
              <Card key={index} className="bg-white dark:bg-gray-800 border-none">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#7A5540]/20 flex items-center justify-center">
                      {card.icon === "Coffee" && <Coffee className="h-6 w-6 text-[#7A5540]" />}
                      {card.icon === "DollarSign" && <BarChart className="h-6 w-6 text-red-500" />}
                      {card.icon === "TrendingUp" && <ArrowUp className="h-6 w-6 text-yellow-500" />}
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{card.title}</div>
                      <div className="text-2xl font-bold dark:text-white">{card.value}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs value={investmentTab} onValueChange={setInvestmentTab}>
            <TabsList className="bg-gray-100 dark:bg-gray-800 border-none mb-6">
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="matured">Matured</TabsTrigger>
              <TabsTrigger value="redeemed">Redeemed</TabsTrigger>
            </TabsList>
            <TabsContent value="active">
              <Card className="bg-white dark:bg-gray-800 border-none">
                <CardHeader>
                  <CardTitle className="dark:text-white">Active Investments</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Farm</TableHead>
                        <TableHead className="text-right">Bonds Owned</TableHead>
                        <TableHead className="text-right">Annual Interest</TableHead>
                        <TableHead className="text-right">Maturity Date</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeFarms.map((farm) => (
                        <TableRow key={farm.farmId}>
                          <TableCell>{farm.name} <span className="text-xs text-gray-500 dark:text-gray-400">Owner: {truncateAddress(farm.owner)}</span></TableCell>
                          <TableCell className="text-right">{farm.totalBonds.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${farm.annualInterest.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{formatDate(farm.maturityTimestamp)}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              className="bg-[#7A5540] hover:bg-[#6A4A36] text-white"
                              onClick={() => handleBuyMoreClick(farm.farmId, farm.name, farm.minInvestment)}
                            >
                              Buy More
                            </Button>
                            <Button
                              size="sm"
                              className="bg-[#7A5540] hover:bg-[#6A4A36] text-white"
                              onClick={() => handleRedeemClick(farm.farmId, farm.name, farm.bondIds, true)}
                            >
                              Redeem Early
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="matured">
              <Card className="bg-white dark:bg-gray-800 border-none">
                <CardHeader>
                  <CardTitle className="dark:text-white">Matured Investments</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Farm</TableHead>
                        <TableHead className="text-right">Bonds Owned</TableHead>
                        <TableHead className="text-right">Annual Interest</TableHead>
                        <TableHead className="text-right">Maturity Date</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {maturedFarms.map((farm) => (
                        <TableRow key={farm.farmId}>
                          <TableCell>{farm.name} <span className="text-xs text-gray-500 dark:text-gray-400">Owner: {truncateAddress(farm.owner)}</span></TableCell>
                          <TableCell className="text-right">{farm.totalBonds.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${farm.annualInterest.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{formatDate(farm.maturityTimestamp)}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              className="bg-[#7A5540] hover:bg-[#6A4A36] text-white"
                              onClick={() => handleRedeemClick(farm.farmId, farm.name, farm.bondIds, false)}
                            >
                              Redeem
                            </Button>
                            <Button
                              size="sm"
                              className="bg-[#7A5540] hover:bg-[#6A4A36] text-white"
                              onClick={() => handleRolloverClick(farm.farmId, farm.name, farm.bondIds)}
                            >
                              Rollover
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="redeemed">
              <Card className="bg-white dark:bg-gray-800 border-none">
                <CardHeader>
                  <CardTitle className="dark:text-white">Redemption History</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Farm</TableHead>
                        <TableHead>Bond ID</TableHead>
                        <TableHead>Bonds</TableHead>
                        <TableHead>Purchase Date</TableHead>
                        <TableHead>Value (USD)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {redeemedBonds.map(({ bondId, data, farmData }) => (
                        <TableRow key={bondId.toString()}>
                          <TableCell>{farmData?.name || "N/A"}</TableCell>
                          <TableCell>{bondId.toString()}</TableCell>
                          <TableCell>{(Number(formatUnits(data.depositAmount, MBT_DECIMALS)) / BOND_MBT).toFixed(2)}</TableCell>
                          <TableCell>{formatDate(data.depositTimestamp)}</TableCell>
                          <TableCell>{(Number(formatUnits(data.depositAmount, MBT_DECIMALS)) * MBT_PRICE_USD).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Purchase Modal */}
          <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
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

          {/* Redeem Modal */}
          <Dialog open={isRedeemModalOpen} onOpenChange={setIsRedeemModalOpen}>
            <DialogContent className="bg-gray-50 dark:bg-gray-800 border-none p-6 text-gray-500 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold dark:text-white">
                  {isEarlyRedemption ? "Early Redemption" : "Redeem Bonds"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {redeemSuccessDetails ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold mb-2 dark:text-white">Redemption Successful!</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      You have successfully redeemed {redeemSuccessDetails.bondCount} bonds.
                      {redeemSuccessDetails.isEarly && (
                        <span> An early redemption penalty of {redeemSuccessDetails.penalty}% was applied.</span>
                      )}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Farm:</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{selectedFarmName}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Bonds to Redeem:</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{selectedBondsCount}</span>
                      </div>
                      {isEarlyRedemption && (
                        <>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Early Redemption Penalty:</span>
                            <span className="text-sm text-red-600 dark:text-red-400">{EARLY_REDEMPTION_PENALTY * 100}%</span>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Value:</span>
                            <span className="text-sm text-gray-700 dark:text-gray-200">${redemptionDetails.totalValue.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Penalty Amount:</span>
                            <span className="text-sm text-red-600 dark:text-red-400">-${redemptionDetails.penalty.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Net Amount:</span>
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">${redemptionDetails.netAmount.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    {isEarlyRedemption && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-center">
                          <AlertTriangle className="w-5 h-5 mr-2 text-yellow-800 dark:text-yellow-200" />
                          <div className="text-yellow-800 dark:text-yellow-200 text-sm">
                            Early redemption incurs a {EARLY_REDEMPTION_PENALTY * 100}% penalty. Consider waiting until maturity to avoid this fee.
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                      <p>
                        <strong>Note:</strong> {isEarlyRedemption 
                          ? "Early redemption will return your principal minus the penalty. The funds will be returned to your wallet as MBT tokens."
                          : "Matured bonds can be redeemed for their full value. The funds will be returned to your wallet as MBT tokens."}
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
                    disabled={isRedeemPending || isRedeemEarlyPending}
                  >
                    {redeemSuccessDetails ? "Close" : "Cancel"}
                  </Button>
                  {!redeemSuccessDetails && (
                    <Button
                      className="bg-[#7A5540] hover:bg-[#6A4A36] text-white border-none"
                      onClick={() => handleRedeem(isEarlyRedemption)}
                      disabled={isRedeemPending || isRedeemEarlyPending}
                    >
                      {(isRedeemPending || isRedeemEarlyPending) 
                        ? "Processing..." 
                        : `Redeem ${selectedBondsCount} Bond${selectedBondsCount !== 1 ? 's' : ''}`}
                    </Button>
                  )}
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>

          {/* Rollover Modal */}
          <Dialog open={isRolloverModalOpen} onOpenChange={setIsRolloverModalOpen}>
            <DialogContent className="bg-gray-50 dark:bg-gray-800 border-none p-6 text-gray-500 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold dark:text-white">
                  Rollover Bonds
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {rolloverSuccessDetails ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold mb-2 dark:text-white">Rollover Successful!</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      You have successfully rolled over {rolloverSuccessDetails.bondCount} bonds to {rolloverSuccessDetails.newFarmName}.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Current Farm:</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{selectedFarmName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Bonds to Rollover:</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{selectedBondsCount}</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">
                        Select New Farm
                      </label>
                      <Select onValueChange={setSelectedFarmId} value={selectedFarmId}>
                        <SelectTrigger className="bg-white dark:bg-gray-800 border-none">
                          <SelectValue placeholder="Select a farm" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeFarmIds && activeFarmIds.map((farmId) => {
                            const farmConfig = farmConfigsData?.find(f => 
                              f.status === "success" && f.result.farmId.toString() === farmId.toString()
                            )?.result;
                            return (
                              <SelectItem key={farmId.toString()} value={farmId.toString()}>
                                {farmConfig?.name || `Farm ${farmId}`}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                      <p>
                        <strong>Note:</strong> Rolling over moves your matured bonds to a new farm. The new farm's terms and conditions will apply, including its target APY and maturity period.
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
                      setIsRolloverModalOpen(false);
                    }}
                    disabled={isRolloverPending}
                  >
                    {rolloverSuccessDetails ? "Close" : "Cancel"}
                  </Button>
                  {!rolloverSuccessDetails && (
                    <Button
                      className="bg-[#7A5540] hover:bg-[#6A4A36] text-white border-none"
                      onClick={handleRollover}
                      disabled={isRolloverPending || !selectedFarmId}
                    >
                      {isRolloverPending 
                        ? "Processing..." 
                        : `Rollover ${selectedBondsCount} Bond${selectedBondsCount !== 1 ? 's' : ''}`}
                    </Button>
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