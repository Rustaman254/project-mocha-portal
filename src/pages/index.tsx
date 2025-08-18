"use client"

import { useState, useEffect } from "react"
import { Search, Filter, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Info, MoreHorizontal, RefreshCw, Coffee } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useAccount, useReadContract, useReadContracts, useWriteContract, useBalance } from "wagmi"
import { parseEther, formatEther } from "viem"
import { scrollSepolia } from "viem/chains"
import Header from "@/components/@shared-components/header"
import { useRouter } from 'next/router'
import vault from "@/ABI/MochaTreeRightsABI.json"
import StatCard from "@/components/@shared-components/statCard"

const MOCHA_TREE_CONTRACT_ADDRESS = "0x4b02Bada976702E83Cf91Cd0B896852099099352";
const MOCHA_TREE_CONTRACT_ABI = vault.abi;
const BOND_PRICE_USD = 100; // $100 per bond
const MAX_BONDS_PER_INVESTOR = 20;

export default function Dashboard() {
  const router = useRouter()
  const { address: userAddress } = useAccount()
  const [overviewTab, setOverviewTab] = useState("Overview")
  const [marketTab, setMarketTab] = useState("All")
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState("asc")
  const [searchQuery, setSearchQuery] = useState("")
  const [darkMode, setDarkMode] = useState(false)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [selectedFarmId, setSelectedFarmId] = useState("")
  const [bondAmount, setBondAmount] = useState("1")
  const [purchaseError, setPurchaseError] = useState("")
  const [currentInfoIndex, setCurrentInfoIndex] = useState(0)


  // Info items for carousel
  const infoItems = [
    "Next Interest Payment: June 2026",
    "Interest Rate: 10%",
    "Maturity: June 2030"
  ]

  // Navigation handlers for info items
  const handlePrevInfo = () => {
    setCurrentInfoIndex((prev) => (prev === 0 ? infoItems.length - 1 : prev - 1))
  }

  const handleNextInfo = () => {
    setCurrentInfoIndex((prev) => (prev === infoItems.length - 1 ? 0 : prev + 1))
  }

  // Fetch contract data
  const { data: activeFarmIds, isLoading: isLoadingActiveFarmIds, error: activeFarmIdsError } = useReadContract({
    address: MOCHA_TREE_CONTRACT_ADDRESS,
    abi: MOCHA_TREE_CONTRACT_ABI,
    functionName: 'getActiveFarmIds',
    chainId: scrollSepolia.id,
  });

  console.log(activeFarmIds)
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

  // Fetch user's ETH balance
  const { data: ethBalance } = useBalance({
    address: userAddress,
    chainId: scrollSepolia.id,
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

  // Filter and sort farms for the table
  const filteredFarms = farms
    .filter(({ config }) => {
      if (!config) return false
      if (marketTab === "Active") return config.active
      return true
    })
    .filter(({ config }) => {
      if (!searchQuery || !config) return true
      return (
        config.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        config.shareTokenSymbol.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })
    .sort((a, b) => {
      if (!a.config || !b.config) return 0
      let comparison = 0
      switch (sortBy) {
        case "id":
          comparison = Number(a.farmId) - Number(b.farmId)
          break
        case "name":
          comparison = a.config.name.localeCompare(b.config.name)
          break
        case "bonds":
          comparison = Number(a.config.treeCount) - Number(b.config.treeCount)
          break
        case "interest":
          comparison = Number(a.config.targetAPY) - Number(b.config.targetAPY)
          break
        default:
          comparison = a.config.name.localeCompare(b.config.name)
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

  // Calculate total bonds owned and interest
  const totalBondsOwned = farms.reduce((sum, { balance }) => sum + Number(balance), 0);
  const annualInterest = totalBondsOwned * 10; // 10% of $100 per bond
  const cumulativeReturn = annualInterest * 5; // 5-year term

  // Define stat cards data
  const statCards = [
    {
      title: "Total Bonds Owned",
      value: `${formatEther(totalBondsOwned)} Bonds`,
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

  // Purchase bond functionality
  const { writeContract, isPending, isSuccess, error: writeError } = useWriteContract();

  const handlePurchase = async () => {
    setPurchaseError("");
    const amount = parseInt(bondAmount);
    
    // Validate inputs
    if (!selectedFarmId) {
      setPurchaseError("Please select a farm");
      return;
    }
    if (isNaN(amount) || amount < 1) {
      setPurchaseError("Please enter at least 1 bond");
      return;
    }
    if (amount + totalBondsOwned > MAX_BONDS_PER_INVESTOR) {
      setPurchaseError(`Cannot exceed ${MAX_BONDS_PER_INVESTOR} bonds per investor`);
      return;
    }
    const totalCostEth = parseEther((amount * BOND_PRICE_USD / 1000).toString()); // Assuming 1 ETH = $1000 for simplicity
    if (ethBalance && BigInt(ethBalance.value) < totalCostEth) {
      setPurchaseError("Insufficient ETH balance");
      return;
    }

    try {
      await writeContract({
        address: MOCHA_TREE_CONTRACT_ADDRESS,
        abi: MOCHA_TREE_CONTRACT_ABI,
        functionName: 'purchaseBond',
        args: [BigInt(selectedFarmId), BigInt(amount)],
        value: totalCostEth,
      });
    } catch (err) {
      setPurchaseError("Transaction failed");
    }
  };

  useEffect(() => {
    if (isSuccess) {
      setIsPurchaseModalOpen(false);
      setBondAmount("1");
      setSelectedFarmId("");
    }
  }, [isSuccess]);

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

  const isActivePath = (path: string) => {
    if (path === '/') {
      return router.pathname === '/'
    }
    return router.pathname === `/${path.toLowerCase()}`
  }

  const truncateAddress = (address) => {
    if (!address) return "N/A"
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
  }

  return (
    <div className="min-h-screen bg-[#E6E6E6] dark:bg-gray-900 transition-colors duration-200 text-gray-900 dark:text-white">
      <Header />
      <div className="pt-[72px]">
        <div className="px-4 sm:px-12 py-8">
          <div className="mb-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">MOCHA ASSET-BACKED BONDS</div>
            <h1 className="text-3xl font-bold dark:text-white"> Dashboard</h1>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 dark:border-gray-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto mb-4 sm:mb-0">
              {["Overview", "Bonds", "History"].map((tab) => (
                <button
                  key={tab}
                  className={`px-4 py-3 font-medium relative w-full sm:w-auto text-left sm:text-center ${
                    overviewTab === tab
                      ? "text-[#522912] font-bold border-b-4 border-[#522912] dark:text-[#522912] dark:border-[#522912]"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                  onClick={() => setOverviewTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex items-center w-full sm:w-auto justify-between sm:justify-end">
              <button onClick={handlePrevInfo} className="p-2">
                <ChevronLeft className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              </button>
              <div className="flex items-center mx-2 sm:mx-4 overflow-hidden">
                <div
                  className="flex transition-transform duration-300 ease-in-out"
                  style={{ transform: `translateX(-${currentInfoIndex * 100}%)` }}
                >
                  {infoItems.map((item, index) => (
                    <div key={index} className="flex items-center min-w-full">
                      <span className="text-sm mr-1 dark:text-gray-300 whitespace-nowrap">{item}</span>
                      <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={handleNextInfo} className="p-2">
                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
            <div className="lg:col-span-2 grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              {overviewTab === "Overview" && (
                <div className="border dark:border-gray-800 rounded-lg p-6 bg-white dark:bg-gray-800">
                  <h3 className="text-lg font-medium mb-4 dark:text-white">Return Profile</h3>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Year
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Interest Paid
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Cumulative Return
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Principal
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Total Payout
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...Array(5)].map((_, i) => {
                        const year = i + 1;
                        const interest = 10;
                        const cumulative = interest * year;
                        const principal = year === 5 ? 100 : 0;
                        const totalPayout = interest + principal;
                        return (
                          <tr key={year} className="border-b dark:border-gray-700">
                            <td className="px-4 py-4 whitespace-nowrap text-sm dark:text-white">{year}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right dark:text-white">${interest.toFixed(2)}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right dark:text-white">${cumulative.toFixed(2)}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right dark:text-white">${principal.toFixed(2)}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right dark:text-white">${totalPayout.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">QUICK ACTIONS</div>
                <div className="bg-[#7A5540] dark:bg-amber-700 text-white text-xs px-2 py-1 rounded-full">1/1</div>
              </div>
              {/* <h2 className="text-xl font-bold mb-4 dark:text-white">Manage Your Bonds</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Purchase new Mocha Asset-Backed Bonds to invest in Kenya’s coffee trees.
              </p>
              <div className="space-y-4 mb-6">
                <Button
                  className="w-full bg-[#7A5540] hover:bg-[#6A4A36] text-white rounded-lg py-3 font-medium flex items-center justify-center"
                  onClick={() => setIsPurchaseModalOpen(true)}
                >
                  <Coffee className="mr-2 h-4 w-4" />
                  Buy MABB Tokens
                </Button>
              </div> */}
              <div className="bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Next Interest Payment</div>
                    <div className="text-xl font-bold dark:text-white">June 15, 2026</div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-600 p-2 rounded-lg">
                    <RefreshCw className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t dark:border-gray-600">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Estimated Interest</div>
                  <div className="text-lg font-medium dark:text-white">${formatEther(annualInterest)}</div>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <span className="text-sm font-medium mr-1 dark:text-gray-300">View Farm Reports</span>
                <ChevronRight className="w-4 h-4 dark:text-gray-400" />
              </div>
            </div>
          </div>

          {overviewTab === "Bonds" && (
            <div className="py-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold dark:text-white">Your Mocha Asset-Backed Bonds</h2>
                <p className="text-gray-500 dark:text-gray-400">Manage your bond holdings</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
                <h3 className="text-lg font-medium mb-4 dark:text-white">Bond Holdings</h3>
                <div className="space-y-4">
                  {isLoadingFarmConfigs || isLoadingBalances ? (
                    <div className="text-center text-gray-500 dark:text-gray-400">Loading bonds...</div>
                  ) : farmConfigsError || balanceError ? (
                    <div className="text-center text-red-600 dark:text-red-400">Error loading bonds</div>
                  ) : farms.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400">No bonds owned</div>
                  ) : (
                    farms
                      .filter(({ balance }) => balance > 0)
                      .map(({ farmId, config, balance, error }) => (
                        <div key={farmId.toString()} className="border dark:border-gray-700 rounded-lg p-4">
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <div>
                                  <h4 className="font-medium dark:text-white">{config?.name || "N/A"}</h4>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">Farm Owner: {truncateAddress(config?.farmOwner)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-500 dark:text-gray-400">Bonds Owned</p>
                                  <p className="font-medium dark:text-white">{formatEther(balance)} Bonds</p>
                                </div>
                              </div>
                              <div className="flex justify-between items-center mt-4">
                                <div className="flex items-center">
                                  <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Annual Interest:</span>
                                  <span className="font-medium dark:text-white">${(formatEther(Number(balance) * 10))}</span>
                                </div>
                                <div className="flex gap-2">
                                  {/* <Button size="sm" variant="outline" className="dark:border-gray-600 dark:text-gray-300" disabled={error}>
                                    Transfer
                                  </Button> */}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}

          {overviewTab === "History" && (
            <div className="py-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold dark:text-white">Registered Farms</h2>
                <p className="text-gray-500 dark:text-gray-400">View all registered farms offering Mocha Asset-Backed Bonds</p>
              </div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="relative w-full md:w-96">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
                    size={18}
                  />
                  <Input
                    placeholder="Search farms..."
                    className="pl-10 bg-white dark:bg-gray-800 border dark:border-gray-700"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[180px] bg-white dark:bg-gray-800 border dark:border-gray-700">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
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
                    className="bg-white dark:bg-gray-800 border dark:border-gray-700"
                  >
                    {sortOrder === "asc" ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                  </Button>
                  <Button variant="outline" className="bg-white dark:bg-gray-800 border dark:border-gray-700">
                    <Filter size={18} className="mr-2" />
                    Filters
                  </Button>
                </div>
              </div>
              <Tabs defaultValue="All" className="mb-6" value={marketTab} onValueChange={setMarketTab}>
                <TabsList className="bg-gray-100 dark:bg-gray-800">
                  <TabsTrigger value="All">All</TabsTrigger>
                  <TabsTrigger value="Active">
                    Active
                    <span className="ml-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {farms.filter(({ config }) => config?.active).length}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b dark:border-gray-800">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Farm
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Owner
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Bond Count
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Annual Interest
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
                          </td>
                        </tr>
                      ) : filteredFarms.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                            No farms found
                          </td>
                        </tr>
                      ) : (
                        filteredFarms.map(({ farmId, config, error }, index) => (
                          <tr
                            key={farmId.toString()}
                            className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                          >
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              {error ? (
                                <div className="text-red-600 dark:text-red-400">Error</div>
                              ) : (
                                <div className="flex items-center">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">{config.name}</div>
                                  <div className="ml-2 text-sm text-gray-500 dark:text-gray-400">({config.shareTokenSymbol})</div>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {error ? "N/A" : truncateAddress(config.farmOwner)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                              {error ? "N/A" : config.treeCount.toString()}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                              {error ? "N/A" : `$${Number(config.treeCount) * 10}`}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                              {error ? (
                                <span className="text-red-600 dark:text-red-400">Error</span>
                              ) : config.active ? (
                                <span className="text-green-600 dark:text-green-400">Active</span>
                              ) : (
                                <span className="text-gray-500 dark:text-gray-400">Inactive</span>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <Button
                                className="bg-[#7A5540] hover:bg-[#6A4A36] text-white"
                                disabled={error || !config.active}
                                onClick={() => {
                                  setSelectedFarmId(farmId.toString());
                                  setIsPurchaseModalOpen(true);
                                }}
                              >
                                Buy Bonds
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
          )}

          <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
            <DialogContent className="bg-gray-50 dark:bg-gray-800 border dark:border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold dark:text-white">Purchase Mocha Asset-Backed Bonds</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Select Farm</label>
                  <Select value={selectedFarmId} onValueChange={setSelectedFarmId}>
                    <SelectTrigger className="w-full bg-white dark:bg-gray-800 border dark:border-gray-700">
                      <SelectValue placeholder="Choose a farm" />
                    </SelectTrigger>
                    <SelectContent>
                      {farms
                        .filter(({ config }) => config?.active)
                        .map(({ farmId, config }) => (
                          <SelectItem key={farmId.toString()} value={farmId.toString()}>
                            {config?.name} ({config?.shareTokenSymbol})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Number of Bonds (1–20)</label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={bondAmount}
                    onChange={(e) => setBondAmount(e.target.value)}
                    className="bg-white dark:bg-gray-800 border dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Cost</label>
                  <p className="text-lg font-medium dark:text-white">
                    ${parseInt(bondAmount || "0") * BOND_PRICE_USD}.00 (~{parseFloat(formatEther(parseEther((parseInt(bondAmount || "0") * BOND_PRICE_USD / 1000).toString()))).toFixed(4)} ETH)
                  </p>
                </div>
                {purchaseError && (
                  <p className="text-red-600 dark:text-red-400 text-sm">{purchaseError}</p>
                )}
                {writeError && (
                  <p className="text-red-600 dark:text-red-400 text-sm">Error: {writeError.message}</p>
                )}
                {isPending && (
                  <p className="text-yellow-600 dark:text-yellow-400 text-sm">Transaction pending...</p>
                )}
                {isSuccess && (
                  <p className="text-green-600 dark:text-green-400 text-sm">Purchase successful!</p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  By proceeding, you agree to complete KYC/AML verification and receive digital bond tokens upon payment.
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  className="dark:border-gray-600 dark:text-gray-300"
                  onClick={() => setIsPurchaseModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-[#7A5540] hover:bg-[#6A4A36] text-white"
                  onClick={handlePurchase}
                  disabled={isPending || !selectedFarmId || !bondAmount}
                >
                  Purchase Bonds
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}