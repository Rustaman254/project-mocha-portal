"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Head from "next/head"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useAccount, useConnect, useReadContract, useWriteContract, useBalance } from "wagmi"
import { parseEther, formatEther } from "viem"
import { scrollSepolia } from "viem/chains"
import { injected } from 'wagmi/connectors'
import Header from "@/components/@shared-components/header"
import vault from "@/ABI/MochaTreeRightsABI.json"

const MOCHA_TREE_CONTRACT_ADDRESS = "0x4b02Bada976702E83Cf91Cd0B896852099099352";
const MOCHA_TREE_CONTRACT_ABI = vault.abi;
const BOND_PRICE_USD = 100; // $100 per bond
const MAX_BONDS_PER_INVESTOR = 20;

export default function FarmDetails() {
  const { farmId } = useParams()
  const { address: userAddress, isConnected } = useAccount()
  const { connect } = useConnect()
  const [darkMode, setDarkMode] = useState(false)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [bondAmount, setBondAmount] = useState("1")
  const [purchaseError, setPurchaseError] = useState("")

  // Fetch farm configuration from smart contract
  const { data: farmConfig, isLoading: isLoadingFarmConfig, error: farmConfigError } = useReadContract({
    address: MOCHA_TREE_CONTRACT_ADDRESS,
    abi: MOCHA_TREE_CONTRACT_ABI,
    functionName: 'getFarmConfig',
    args: [BigInt(farmId)],
    chainId: scrollSepolia.id,
  });

  // Fetch user balance for the farm's share token (MABB)
  const { data: balance, isLoading: isLoadingBalance, error: balanceError } = useReadContract({
    address: farmConfig?.shareTokenAddress || MOCHA_TREE_CONTRACT_ADDRESS,
    abi: MOCHA_TREE_CONTRACT_ABI,
    functionName: 'balanceOf',
    args: [userAddress],
    chainId: scrollSepolia.id,
    query: { enabled: isConnected && !!farmConfig?.shareTokenAddress },
  });

  // Fetch user's ETH balance
  const { data: ethBalance } = useBalance({
    address: userAddress,
    chainId: scrollSepolia.id,
    query: { enabled: isConnected },
  });

  // Purchase bond functionality
  const { writeContract, isPending, isSuccess, error: writeError } = useWriteContract();

  const handlePurchase = async () => {
    if (!isConnected) {
      setPurchaseError("Please connect your wallet");
      return;
    }

    setPurchaseError("");
    const amount = parseInt(bondAmount);

    // Validate inputs
    if (!farmId) {
      setPurchaseError("No farm selected");
      return;
    }
    if (isNaN(amount) || amount < 1) {
      setPurchaseError("Please enter at least 1 bond");
      return;
    }
    const totalBondsOwned = Number(balance || 0);
    if (amount + totalBondsOwned > MAX_BONDS_PER_INVESTOR) {
      setPurchaseError(`Cannot exceed ${MAX_BONDS_PER_INVESTOR} bonds per investor`);
      return;
    }
    const totalCostEth = parseEther((amount * BOND_PRICE_USD / 1000).toString()); // Assuming 1 ETH = $1000
    if (ethBalance && BigInt(ethBalance.value) < totalCostEth) {
      setPurchaseError("Insufficient ETH balance");
      return;
    }

    try {
      await writeContract({
        address: MOCHA_TREE_CONTRACT_ADDRESS,
        abi: MOCHA_TREE_CONTRACT_ABI,
        functionName: 'purchaseBond',
        args: [BigInt(farmId), BigInt(amount)],
        value: totalCostEth,
      });
    } catch (err) {
      setPurchaseError("Transaction failed");
    }
  };

  const handleConnectWallet = () => {
    connect({ connector: injected() });
  };

  const handleBuyBondsClick = () => {
    if (!isConnected) {
      handleConnectWallet();
    } else {
      setIsPurchaseModalOpen(true);
    }
  };

  useEffect(() => {
    if (isSuccess) {
      setIsPurchaseModalOpen(false);
      setBondAmount("1");
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

  const truncateAddress = (address) => {
    if (!address) return "N/A"
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200 text-gray-900 dark:text-white">
      <Head>
        <title>Farm Details - {farmConfig?.name || "Loading"}</title>
      </Head>
      <Header />
      <div className="pt-[72px]">
        <div className="py-8 px-4 md:px-8">
          <div className="mb-6">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">FARM DETAILS</div>
            <h1 className="text-3xl font-bold dark:text-white">{farmConfig?.name || "Loading"} Details</h1>
          </div>

          {isLoadingFarmConfig ? (
            <div className="text-center text-gray-500 dark:text-gray-400">Loading farm details...</div>
          ) : farmConfigError ? (
            <div className="text-center text-red-600 dark:text-red-400">Error loading farm details</div>
          ) : !farmConfig ? (
            <div className="text-center text-gray-500 dark:text-gray-400">Farm not found</div>
          ) : (
            <div className="space-y-8">
              {/* Map Placeholder */}
              <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg text-center w-[600px] h-[400px] flex items-center justify-center">
                <div>
                  <h2 className="text-xl font-semibold dark:text-white mb-2">Farm Location</h2>
                  <p className="text-gray-500 dark:text-gray-400">Map Coming Soon</p>
                </div>
              </div>

              {/* Farm Information */}
              <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border dark:border-gray-700">
                <h2 className="text-xl font-semibold dark:text-white mb-4">Farm Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Farm Name</p>
                    <p className="text-lg dark:text-white">{farmConfig.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Owner</p>
                    <p className="text-lg dark:text-white">{truncateAddress(farmConfig.farmOwner)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Bond Count</p>
                    <p className="text-lg dark:text-white">{farmConfig.treeCount.toString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Annual Interest</p>
                    <p className="text-lg dark:text-white">${Number(farmConfig.treeCount) * 10}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                    <p className="text-lg dark:text-white">
                      {farmConfig.isActive ? (
                        <span className="text-green-600 dark:text-green-400">Active</span>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">Inactive</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Share Token Symbol</p>
                    <p className="text-lg dark:text-white">{farmConfig.shareTokenSymbol}</p>
                  </div>
                </div>
                <div className="mt-6">
                  <Button
                    className="bg-[#7A5540] hover:bg-[#6A4A36] text-white"
                    disabled={!farmConfig.isActive}
                    onClick={handleBuyBondsClick}
                  >
                    {isConnected ? "Buy Bonds" : "Connect Wallet"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
            <DialogContent className="bg-gray-50 dark:bg-gray-800 border dark:border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold dark:text-white">
                  Purchase Bonds for {farmConfig?.name || "Selected Farm"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {!isConnected ? (
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Please connect your wallet to purchase bonds.
                    </p>
                    <Button
                      className="bg-[#7A5540] hover:bg-[#6A4A36] text-white"
                      onClick={handleConnectWallet}
                    >
                      Connect Wallet
                    </Button>
                  </div>
                ) : (
                  <>
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
                  </>
                )}
              </div>
              {isConnected && (
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
                    disabled={isPending || !farmId || !bondAmount}
                  >
                    Purchase Bonds
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}