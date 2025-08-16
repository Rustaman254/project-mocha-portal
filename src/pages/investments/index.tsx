"use client";

import { useState, useEffect } from "react";
import { ChevronDown, BarChart, Calendar, Clock, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccount, useReadContracts, useReadContract, useWriteContract, useBalance } from "wagmi";
import { formatEther } from "viem";
import { scrollSepolia } from "viem/chains";
import vault from "@/ABI/MochaTreeRightsABI.json";
import Header from "@/components/@shared-components/header";

const MOCHA_TREE_CONTRACT_ADDRESS = "0x4b02Bada976702E83Cf91Cd0B896852099099352";
const MOCHA_TREE_CONTRACT_ABI = vault.abi;
const ETH_PRICE_USD = 1000;
const EARLY_REDEMPTION_PENALTY = 0.2;

// Placeholder for bond IDs (assumed to be provided externally, e.g., via props or context)
const PLACEHOLDER_BOND_IDS = [1, 2, 3]; // Replace with actual bond IDs from an off-chain source

export default function Investments({ userBondIds = PLACEHOLDER_BOND_IDS }) {
  const { address: userAddress, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState("Investments");
  const [investmentTab, setInvestmentTab] = useState("active");
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false);
  const [selectedBondId, setSelectedBondId] = useState("");
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [actionError, setActionError] = useState("");

  // Fetch bond positions
  const bondPositionContracts = userBondIds
    ? userBondIds.map((bondId) => ({
        address: MOCHA_TREE_CONTRACT_ADDRESS,
        abi: MOCHA_TREE_CONTRACT_ABI,
        functionName: "getBondPosition",
        args: [userAddress, BigInt(bondId)],
        chainId: scrollSepolia.id,
      }))
    : [];

  const { data: bondPositionsData, isLoading: isLoadingBondPositions, error: bondPositionsError } = useReadContracts({
    contracts: bondPositionContracts,
    query: { enabled: isConnected && userBondIds.length > 0 },
  });

  // Fetch farm configurations
  const farmIds = bondPositionsData
    ? bondPositionsData
        .map((result) => (result.status === "success" && !result.result.redeemed ? result.result.farmId : null))
        .filter(Boolean)
    : [];

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
    query: { enabled: farmIds.length > 0 },
  });

  // Fetch yield distribution for chart
  const yieldDistributionContracts = farmIds
    ? farmIds.map((farmId) => ({
        address: MOCHA_TREE_CONTRACT_ADDRESS,
        abi: MOCHA_TREE_CONTRACT_ABI,
        functionName: "getYieldDistribution",
        args: [farmId],
        chainId: scrollSepolia.id,
      }))
    : [];

  const { data: yieldDistributionsData, isLoading: isLoadingYields, error: yieldsError } = useReadContracts({
    contracts: yieldDistributionContracts,
    query: { enabled: farmIds.length > 0 },
  });

  const { data: activeFarmIds } = useReadContract({
    address: MOCHA_TREE_CONTRACT_ADDRESS,
    abi: MOCHA_TREE_CONTRACT_ABI,
    functionName: "getActiveFarmIds",
    chainId: scrollSepolia.id,
    query: { enabled: isConnected },
  });

  const { data: ethBalance } = useBalance({
    address: userAddress,
    chainId: scrollSepolia.id,
    query: { enabled: isConnected },
  });

  const { writeContract, isPending, isSuccess, error: writeError } = useWriteContract();

  // Process bond data
  const bonds = bondPositionsData
    ? bondPositionsData.map((result, index) => {
        const bondId = userBondIds[index];
        const data = result.status === "success" ? result.result : null;
        const farmData =
          farmConfigsData && farmConfigsData[index]?.status === "success" ? farmConfigsData[index].result : null;
        const now = Math.floor(Date.now() / 1000);
        const status = data
          ? data.redeemed
            ? "Redeemed"
            : data.maturityTimestamp <= now
            ? "Matured"
            : "Active"
          : "Error";
        return {
          bondId,
          data: data
            ? {
                farmId: data.farmId,
                mbtAmount: data.depositAmount,
                purchaseDate: data.depositTimestamp,
                maturityDate: data.maturityTimestamp,
                status,
              }
            : null,
          farmData,
          error: result.status === "failure" ? result.error : null,
        };
      })
    : [];

  const activeBonds = bonds.filter(
    ({ data, farmData }) => data?.status === "Active" && farmData?.active
  );
  const maturedBonds = bonds.filter(({ data }) => data?.status === "Matured");
  const redeemedBonds = bonds.filter(({ data }) => data?.status === "Redeemed");
  const totalBonds = bonds.reduce((sum, { data }) => sum + (data ? Number(data.mbtAmount) : 0), 0);
  const totalValue = totalBonds * 0.1; // 1 MBT = 0.1 ETH

  // Process yield distribution for chart
  const monthlyReturns = yieldDistributionsData
    ? yieldDistributionsData.map((result, index) => {
        const farmId = farmIds[index];
        const farm = farmConfigsData?.find((f, i) => f.status === "success" && farmIds[i] === farmId);
        const yieldData = result.status === "success" ? result.result : null;
        return {
          farmName: farm?.status === "success" ? farm.result.name : `Farm ${farmId}`,
          totalYield: yieldData ? Number(formatEther(yieldData.totalYield)) : 0,
        };
      })
    : [];

  const handleConnectWallet = () => {
    // Ensure openfort is defined and has a connect method
    if (typeof window !== "undefined" && window.openfort && typeof window.openfort.connect === "function") {
      window.openfort.connect();
    } else {
      console.error("Openfort SDK not loaded or connect method unavailable");
      setActionError("Wallet connection failed. Please ensure the Openfort SDK is properly configured.");
    }
  };

  const handleRedeem = async (bondId: string, isEarly: boolean) => {
    if (!isConnected) {
      setActionError("Please connect your wallet");
      return;
    }
    setActionError("");
    try {
      await writeContract({
        address: MOCHA_TREE_CONTRACT_ADDRESS,
        abi: MOCHA_TREE_CONTRACT_ABI,
        functionName: isEarly ? "redeemBondEarly" : "redeemBond",
        args: [BigInt(bondId)],
      });
    } catch (err) {
      setActionError(`Transaction failed: ${err.message}`);
    }
  };

  const handleRollover = async () => {
    if (!isConnected) {
      setActionError("Please connect your wallet");
      return;
    }
    if (!selectedFarmId) {
      setActionError("Please select a farm");
      return;
    }
    setActionError("");
    try {
      await writeContract({
        address: MOCHA_TREE_CONTRACT_ADDRESS,
        abi: MOCHA_TREE_CONTRACT_ABI,
        functionName: "rolloverBond",
        args: [BigInt(selectedBondId), BigInt(selectedFarmId)],
      });
    } catch (err) {
      setActionError(`Transaction failed: ${err.message}`);
    }
  };

  useEffect(() => {
    if (isSuccess) {
      setIsRedeemModalOpen(false);
      setIsRolloverModalOpen(false);
      setSelectedBondId("");
      setSelectedFarmId("");
    }
  }, [isSuccess]);

  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode");
    if (savedMode !== null) {
      setDarkMode(savedMode === "true");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDarkMode(prefersDark);
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const truncateAddress = (address) => {
    if (!address) return "N/A";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200 text-gray-900 dark:text-white">
      <Header onConnectWallet={handleConnectWallet} />
      <div className="pt-[100px]">
        <div className="px-6 py-4">
          <div className="mb-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">INVESTMENTS</div>
            <h1 className="text-3xl font-bold dark:text-white">Your Mocha Bond Investments</h1>
          </div>
          <Card className="bg-white dark:bg-gray-800 border-none mb-8">
            <CardHeader>
              <CardTitle className="dark:text-white">Chat Feature</CardTitle>
              <CardDescription className="dark:text-gray-400">Stay tuned for updates!</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300">Chat coming soon</p>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white dark:bg-gray-800 border-none">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                    <BarChart className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Bonds</div>
                    <div className="text-2xl font-bold dark:text-white">{totalBonds}</div>
                    <div className="text-sm text-amber-600 dark:text-amber-400">{(totalBonds * 100).toFixed(2)} USD</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-gray-800 border-none">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Value</div>
                    <div className="text-2xl font-bold dark:text-white">{totalValue.toFixed(2)} ETH</div>
                    <div className="text-sm text-green-600 dark:text-green-400">{(totalValue * ETH_PRICE_USD).toFixed(2)} USD</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-gray-800 border-none">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Matured Bonds</div>
                    <div className="text-2xl font-bold dark:text-white">{maturedBonds.length}</div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">{maturedBonds.reduce((sum, { data }) => sum + Number(data.mbtAmount), 0)} MBT</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card className="bg-white dark:bg-gray-800 border-none mb-8">
            <CardHeader>
              <CardTitle className="dark:text-white">Investment Performance</CardTitle>
              <CardDescription className="dark:text-gray-400">Total yield by farm</CardDescription>
            </CardHeader>
            {/* <CardContent className="h-80">
              {isLoadingYields ? (
                <div>Loading yield data...</div>
              ) : yieldsError ? (
                <div>Error loading yield data</div>
              ) : monthlyReturns.length > 0 ? (
                ```chartjs
                {
                  "type": "bar",
                  "data": {
                    "labels": ${JSON.stringify(monthlyReturns.map((item) => item.farmName))},
                    "datasets": [
                      {
                        "label": "Total Yield (ETH)",
                        "data": ${JSON.stringify(monthlyReturns.map((item) => item.totalYield))},
                        "backgroundColor": "rgba(245, 158, 11, 0.6)",
                        "borderColor": "rgba(245, 158, 11, 1)",
                        "borderWidth": 1
                      }
                    ]
                  },
                  "options": {
                    "scales": {
                      "y": {
                        "beginAtZero": true,
                        "title": { "display": true, "text": "Yield (ETH)", "color": "#ffffff" },
                        "ticks": { "color": "#ffffff" }
                      },
                      "x": {
                        "title": { "display": true, "text": "Farm", "color": "#ffffff" },
                        "ticks": { "color": "#ffffff" }
                      }
                    },
                    "plugins": {
                      "legend": { "labels": { "color": "#ffffff" } }
                    }
                  }
                }
                ```
              ) : (
                <div>No yield data available</div>
              )}
            </CardContent> */}
          </Card>
          <Tabs defaultValue="active" value={investmentTab} onValueChange={setInvestmentTab}>
            <TabsList className="bg-gray-100 dark:bg-gray-800 border-none mb-6">
              <TabsTrigger value="active">Active Investments</TabsTrigger>
              <TabsTrigger value="matured">Matured Investments</TabsTrigger>
              <TabsTrigger value="redeemed">Redemption History</TabsTrigger>
            </TabsList>
            <TabsContent value="active">
              <Card className="bg-white dark:bg-gray-800 border-none">
                <CardHeader>
                  <CardTitle className="dark:text-white">Active Investments</CardTitle>
                  <CardDescription className="dark:text-gray-400">Your current bond investments</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b dark:border-gray-800">
                        <TableHead className="text-gray-500 dark:text-gray-400">Farm</TableHead>
                        <TableHead className="text-gray-500 dark:text-gray-400">Bond ID</TableHead>
                        <TableHead className="text-gray-500 dark:text-gray-400">Trees</TableHead>
                        <TableHead className="text-gray-500 dark:text-gray-400">Purchase Date</TableHead>
                        <TableHead className="text-gray-500 dark:text-gray-400">Value (ETH)</TableHead>
                        <TableHead className="text-gray-500 dark:text-gray-400">Maturity Date</TableHead>
                        <TableHead className="text-right text-gray-500 dark:text-gray-400">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingBondPositions || isLoadingFarmConfigs ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-gray-500 dark:text-gray-400">
                            Loading investments...
                          </TableCell>
                        </TableRow>
                      ) : bondPositionsError || farmConfigsError ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-red-600 dark:text-red-400">
                            Error loading investments
                          </TableCell>
                        </TableRow>
                      ) : activeBonds.length > 0 ? (
                        activeBonds.map(({ bondId, data, farmData, error }) => (
                          <TableRow key={bondId.toString()} className="border-b dark:border-gray-800">
                            <TableCell className="font-medium dark:text-white">{error || !farmData ? "N/A" : farmData.name}</TableCell>
                            <TableCell className="dark:text-gray-300">{bondId.toString()}</TableCell>
                            <TableCell className="dark:text-gray-300">{error || !data ? "N/A" : data.mbtAmount.toString()}</TableCell>
                            <TableCell className="dark:text-gray-300">{error || !data ? "N/A" : new Date(Number(data.purchaseDate) * 1000).toLocaleDateString()}</TableCell>
                            <TableCell className="dark:text-gray-300">{error || !data ? "N/A" : (Number(data.mbtAmount) * 0.1).toFixed(2)}</TableCell>
                            <TableCell className="dark:text-gray-300">{error || !farmData ? "N/A" : new Date(Number(farmData.maturityTimestamp) * 1000).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                className="bg-amber-600 hover:bg-amber-700 text-white border-none"
                                onClick={() => {
                                  setSelectedBondId(bondId.toString());
                                  setIsRedeemModalOpen(true);
                                }}
                                disabled={isLoading || error || !isConnected}
                              >
                                {isConnected ? "Redeem Early" : "Connect Wallet"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-gray-500 dark:text-gray-400">
                            No active investments
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="matured">
              <Card className="bg-white dark:bg-gray-800 border-none">
                <CardHeader>
                  <CardTitle className="dark:text-white">Matured Investments</CardTitle>
                  <CardDescription className="dark:text-gray-400">Bonds ready for redemption or rollover</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b dark:border-gray-800">
                        <TableHead className="text-gray-500 dark:text-gray-400">Farm</TableHead>
                        <TableHead className="text-gray-500 dark:text-gray-400">Bond ID</TableHead>
                        <TableHead className="text-gray-500 dark:text-gray-400">Trees</TableHead>
                        <TableHead className="text-gray-500 dark:text-gray-400">Purchase Date</TableHead>
                        <TableHead className="text-gray-500 dark:text-gray-400">Value (ETH)</TableHead>
                        <TableHead className="text-gray-500 dark:text-gray-400">Maturity Date</TableHead>
                        <TableHead className="text-right text-gray-500 dark:text-gray-400">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingBondPositions || isLoadingFarmConfigs ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-gray-500 dark:text-gray-400">
                            Loading investments...
                          </TableCell>
                        </TableRow>
                      ) : bondPositionsError || farmConfigsError ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-red-600 dark:text-red-400">
                            Error loading investments
                          </TableCell>
                        </TableRow>
                      ) : maturedBonds.length > 0 ? (
                        maturedBonds.map(({ bondId, data, farmData, error }) => (
                          <TableRow key={bondId.toString()} className="border-b dark:border-gray-800">
                            <TableCell className="font-medium dark:text-white">{error || !farmData ? "N/A" : farmData.name}</TableCell>
                            <TableCell className="dark:text-gray-300">{bondId.toString()}</TableCell>
                            <TableCell className="dark:text-gray-300">{error || !data ? "N/A" : data.mbtAmount.toString()}</TableCell>
                            <TableCell className="dark:text-gray-300">{error || !data ? "N/A" : new Date(Number(data.purchaseDate) * 1000).toLocaleDateString()}</TableCell>
                            <TableCell className="dark:text-gray-300">{error || !data ? "N/A" : (Number(data.mbtAmount) * 0.1).toFixed(2)}</TableCell>
                            <TableCell className="dark:text-gray-300">{error || !farmData ? "N/A" : new Date(Number(farmData.maturityTimestamp) * 1000).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                size="sm"
                                className="bg-amber-600 hover:bg-amber-700 text-white border-none"
                                onClick={() => {
                                  setSelectedBondId(bondId.toString());
                                  setIsRedeemModalOpen(true);
                                }}
                                disabled={isLoading || error || !isConnected}
                              >
                                {isConnected ? "Redeem" : "Connect Wallet"}
                              </Button>
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white border-none"
                                onClick={() => {
                                  setSelectedBondId(bondId.toString());
                                  setIsRolloverModalOpen(true);
                                }}
                                disabled={isLoading || error || !isConnected}
                              >
                                {isConnected ? "Rollover" : "Connect Wallet"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-gray-500 dark:text-gray-400">
                            No matured investments
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="redeemed">
              <Card className="bg-white dark:bg-gray-800 border-none">
                <CardHeader>
                  <CardTitle className="dark:text-white">Redemption History</CardTitle>
                  <CardDescription className="dark:text-gray-400">Record of your redeemed bonds</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b dark:border-gray-800">
                        <TableHead className="text-gray-500 dark:text-gray-400">Farm</TableHead>
                        <TableHead className="text-gray-500 dark:text-gray-400">Bond ID</TableHead>
                        <TableHead className="text-gray-500 dark:text-gray-400">Trees</TableHead>
                        <TableHead className="text-gray-500 dark:text-gray-400">Purchase Date</TableHead>
                        <TableHead className="text-gray-500 dark:text-gray-400">Redemption Date</TableHead>
                        <TableHead className="text-gray-500 dark:text-gray-400">Value (ETH)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingBondPositions || isLoadingFarmConfigs ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-gray-500 dark:text-gray-400">
                            Loading redemption history...
                          </TableCell>
                        </TableRow>
                      ) : bondPositionsError || farmConfigsError ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-red-600 dark:text-red-400">
                            Error loading redemption history
                          </TableCell>
                        </TableRow>
                      ) : redeemedBonds.length > 0 ? (
                        redeemedBonds.map(({ bondId, data, farmData, error }) => (
                          <TableRow key={bondId.toString()} className="border-b dark:border-gray-800">
                            <TableCell className="font-medium dark:text-white">{error || !farmData ? "N/A" : farmData.name}</TableCell>
                            <TableCell className="dark:text-gray-300">{bondId.toString()}</TableCell>
                            <TableCell className="dark:text-gray-300">{error || !data ? "N/A" : data.mbtAmount.toString()}</TableCell>
                            <TableCell className="dark:text-gray-300">{error || !data ? "N/A" : new Date(Number(data.purchaseDate) * 1000).toLocaleDateString()}</TableCell>
                            <TableCell className="dark:text-gray-300">{error || !data ? "N/A" : "N/A"}</TableCell>
                            <TableCell className="dark:text-gray-300">{error || !data ? "N/A" : (Number(data.mbtAmount) * 0.1).toFixed(2)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-gray-500 dark:text-gray-400">
                            No redemption history available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          <Dialog open={isRedeemModalOpen} onOpenChange={setIsRedeemModalOpen}>
            <DialogContent className="bg-gray-50 dark:bg-gray-800 border-none max-w-[500px] p-6">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold dark:text-white">
                  {maturedBonds.some(({ bondId }) => bondId.toString() === selectedBondId) ? "Redeem Bond" : "Redeem Bond Early"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {!isConnected ? (
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Please connect your wallet to redeem bonds.
                    </p>
                    <Button
                      className="bg-amber-600 hover:bg-amber-700 text-white border-none"
                      onClick={handleConnectWallet}
                    >
                      Connect Wallet
                    </Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Bond ID</p>
                      <p className="text-base dark:text-white">{selectedBondId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Redemption Amount</p>
                      <p className="text-base dark:text-white">
                        {(() => {
                          const bond = bonds.find(({ bondId }) => bondId.toString() === selectedBondId);
                          if (!bond || !bond.data) return "N/A";
                          const amount = Number(bond.data.mbtAmount) * 0.1;
                          const isEarly = !maturedBonds.some(({ bondId }) => bondId.toString() === selectedBondId);
                          return isEarly ? `${(amount * (1 - EARLY_REDEMPTION_PENALTY)).toFixed(2)} ETH (20% penalty)` : `${amount.toFixed(2)} ETH`;
                        })()}
                      </p>
                    </div>
                    {actionError && (
                      <p className="text-red-600 dark:text-red-400 text-sm">{actionError}</p>
                    )}
                    {writeError && (
                      <p className="text-red-600 dark:text-red-400 text-sm">Error: {writeError.message}</p>
                    )}
                    {isPending && (
                      <p className="text-yellow-600 dark:text-yellow-400 text-sm">Transaction pending...</p>
                    )}
                    {isSuccess && (
                      <p className="text-green-600 dark:text-green-400 text-sm">Redemption successful!</p>
                    )}
                  </>
                )}
              </div>
              {isConnected && (
                <DialogFooter>
                  <Button
                    variant="outline"
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-300 border-none"
                    onClick={() => setIsRedeemModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-amber-600 hover:bg-amber-700 text-white border-none"
                    onClick={() => handleRedeem(selectedBondId, !maturedBonds.some(({ bondId }) => bondId.toString() === selectedBondId))}
                    disabled={isPending || !selectedBondId}
                  >
                    {maturedBonds.some(({ bondId }) => bondId.toString() === selectedBondId) ? "Redeem" : "Redeem Early"}
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>
          <Dialog open={isRolloverModalOpen} onOpenChange={setIsRolloverModalOpen}>
            <DialogContent className="bg-gray-50 dark:bg-gray-800 border-none max-w-[500px] p-6">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold dark:text-white">Rollover Bond</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {!isConnected ? (
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Please connect your wallet to rollover bonds.
                    </p>
                    <Button
                      className="bg-amber-600 hover:bg-amber-700 text-white border-none"
                      onClick={handleConnectWallet}
                    >
                      Connect Wallet
                    </Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Bond ID</p>
                      <p className="text-base dark:text-white">{selectedBondId}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Select New Farm</label>
                      <Select value={selectedFarmId} onValueChange={setSelectedFarmId}>
                        <SelectTrigger className="bg-white dark:bg-gray-800 border-none">
                          <SelectValue placeholder="Select a farm" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 border-none">
                          {activeFarmIds && activeFarmIds.length > 0 ? (
                            activeFarmIds.map((farmId) => {
                              const farm = farmConfigsData?.find((f, i) => f.status === "success" && farmIds[i] === farmId);
                              return (
                                <SelectItem key={farmId.toString()} value={farmId.toString()}>
                                  {farm?.status === "success" ? farm.result.name : `Farm ${farmId}`}
                                </SelectItem>
                              );
                            })
                          ) : (
                            <SelectItem value="none">No active farms</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    {actionError && (
                      <p className="text-red-600 dark:text-red-400 text-sm">{actionError}</p>
                    )}
                    {writeError && (
                      <p className="text-red-600 dark:text-red-400 text-sm">Error: {writeError.message}</p>
                    )}
                    {isPending && (
                      <p className="text-yellow-600 dark:text-yellow-400 text-sm">Transaction pending...</p>
                    )}
                    {isSuccess && (
                      <p className="text-green-600 dark:text-green-400 text-sm">Rollover successful!</p>
                    )}
                  </>
                )}
              </div>
              {isConnected && (
                <DialogFooter>
                  <Button
                    variant="outline"
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-300 border-none"
                    onClick={() => setIsRolloverModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-amber-600 hover:bg-amber-700 text-white border-none"
                    onClick={handleRollover}
                    disabled={isPending || !selectedBondId || !selectedFarmId}
                  >
                    Rollover
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>
          <Card className="bg-white dark:bg-gray-800 border-none mt-8">
            <CardHeader>
              <CardTitle className="dark:text-white">About Mocha Bond Investments</CardTitle>
              <CardDescription className="dark:text-gray-400">
                Learn more about how Mocha Asset-Backed Bonds work
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  Mocha Asset-Backed Bonds (MABB) represent investments in coffee farms in Kenya. Each bond is backed by coffee trees, and investors can redeem or rollover bonds upon maturity.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium dark:text-white">Bond Mechanics</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>1 MABB = 1 coffee tree = 0.1 ETH ($100)</li>
                      <li>Bonds mature based on farm harvest cycles</li>
                      <li>Matured bonds can be redeemed for MBT tokens</li>
                      <li>Early redemption incurs a 20% penalty</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium dark:text-white">Rollover & Redemption</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Rollover bonds to new farms to continue earning yields</li>
                      <li>Redeemed MBT tokens are sent to your wallet</li>
                      <li>No gas fees for redemption (covered by platform)</li>
                      <li>KYC/AML required for redemptions</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}