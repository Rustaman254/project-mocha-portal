"use client"

import { useEffect, useState } from "react"
import { Moon, Sun, Menu, X, BarChart3, ShoppingCart, Coins, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAppKit, useAppKitAccount } from "@reown/appkit/react"
import { StatRectangle } from "./stat-rectangle"
import { useAccount, useReadContract } from "wagmi";
import { scrollSepolia } from "viem/chains";
import { formatUnits, formatEther } from "viem"
import { MBT_ADDRESS, MBT_TOKEN_ABI, MBT_DECIMALS, TREE_CONTRACT_ADDRESS, TREE_CONTRACT_ABI } from "@/config/constants"

const NAV_LINKS = [
  { label: "Dashboard", href: "/", enabled: true, icon: BarChart3 },
  { label: "Marketplace", href: "/marketplace", enabled: true, icon: ShoppingCart },
  { label: "Staking", href: "/staking", enabled: false, icon: Coins },
  { label: "Investments", href: "/investments", enabled: true, icon: TrendingUp },
]

export default function Header() {
  const { address: userAddress, isConnected } = useAccount();
  const [darkMode, setDarkMode] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const { open } = useAppKit()

  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode")
    if (savedMode !== null) {
        setDarkMode(savedMode === "true")
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

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const { 
    data: mbtBalance, 
    error: mbtError,
    isLoading: mbtLoading,
    refetch: refetchMbtBalance 
  } = useReadContract({
    address: MBT_ADDRESS,
    abi: MBT_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [userAddress],
    chainId: scrollSepolia.id,
    query: { 
      enabled: isConnected && !!userAddress,
      retry: 3,
    },
  });

  const { 
    data: totalActiveBonds,
    error: bondsError,
    isLoading: bondsLoading,
  } = useReadContract({
    address: TREE_CONTRACT_ADDRESS,
    abi: TREE_CONTRACT_ABI,
    functionName: 'totalActiveBonds',
    chainId: scrollSepolia.id,
    query: { 
      enabled: isConnected,
      retry: 3,
    },
  });

  const { 
    data: totalValueLocked,
    error: tvlError,
    isLoading: tvlLoading,
  } = useReadContract({
    address: TREE_CONTRACT_ADDRESS,
    abi: TREE_CONTRACT_ABI,
    functionName: 'totalValueLocked',
    chainId: scrollSepolia.id,
    query: { 
      enabled: isConnected,
      retry: 3,
    },
  });

  const formatMbtBalance = (): string => {
    if (mbtLoading) return "Loading...";
    if (mbtError) return "Error";
    if (!mbtBalance) return "0.0000";
    return Number(formatUnits(mbtBalance as bigint, MBT_DECIMALS)).toFixed(4);
  };

  const formatTotalValueLocked = (): string => {
    if (tvlLoading) return "Loading...";
    if (tvlError) return "Error";
    if (!totalValueLocked) return "0.0000";
    return Number(formatUnits(totalValueLocked as bigint, MBT_DECIMALS)).toFixed(4);
  };

  const formatTotalActiveBonds = (): string => {
    if (bondsLoading) return "Loading...";
    if (bondsError) return "Error";
    if (!totalActiveBonds) return "0";
    return totalActiveBonds.toString();
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 bg-[transparent] dark:bg-[transparent]">
        <div className="mx-auto flex items-center justify-between py-3 lg:py-4 px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 max-w-[1800px]">
          {/* Logo and stats */}
          <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16">
              <Image
                src={darkMode ? "/Brand/mocha-white.svg" : "/Brand/mocha-brown.png"}
                alt="Project Logo"
                fill
                className="object-contain"
              />
            </div>

            {/* Stats - hidden on mobile, visible on tablet and up */}
            <div className="hidden sm:flex items-center gap-2 lg:gap-3 text-xs lg:text-sm">
              <StatRectangle 
                label="MBT Balance" 
                value={`${formatMbtBalance()} MBT`} 
                valueColor="text-green-400" 
              />
              <StatRectangle 
                label="TVL" 
                value={`${formatTotalValueLocked()} MBT`}
                valueColor="text-green-400" 
              />
              <StatRectangle 
                label="Total Active Bonds" 
                value={`${formatTotalActiveBonds()}`}
                valueColor="text-green-400" 
              />
            </div>
          </div>

          {/* Desktop navigation - only shown on large screens */}
          <div className="hidden lg:flex items-center space-x-3 lg:space-x-4">
            <nav className="border dark:border-gray-800 bg-white dark:bg-gray-800 rounded-full px-2 lg:px-2 py-1 lg:py-1">
              <div className="flex items-center space-x-1 lg:space-x-2">
                {NAV_LINKS.filter(link => link.enabled).map((link) => (
                  <Link key={link.label} href={link.href}>
                    <button
                      className={`px-3 lg:px-4 py-1 lg:py-1.5 rounded-full flex items-center transition-colors text-xs lg:text-sm
                        ${pathname === link.href ? "bg-[#522912] text-white dark:bg-white dark:text-[#522912] font-semibold" : "text-gray-400 hover:text-[#522912] dark:hover:text-white"}`}
                    >
                      {link.label}
                    </button>
                  </Link>
                ))}
              </div>
            </nav>

            <div className="flex items-center space-x-2 lg:space-x-3">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleDarkMode}
                className="rounded-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 h-8 w-8 lg:h-10 lg:w-10"
              >
                {darkMode ? <Sun className="h-4 w-4 lg:h-5 lg:w-5" /> : <Moon className="h-4 w-4 lg:h-5 lg:w-5 text-gray-700" />}
              </Button>

              <div className="scale-90 lg:scale-100">
                <appkit-button />
              </div>
            </div>
          </div>

          {/* Tablet and Mobile controls - hamburger menu for navigation */}
          <div className="flex lg:hidden items-center space-x-2">
            <div className="scale-90">
              <appkit-button />
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={toggleDarkMode}
              className="rounded-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 h-8 w-8"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4 text-gray-700" />}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleMobileMenu}
              className="rounded-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 h-8 w-8"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu - Different layouts for mobile vs tablet */}
        {mobileMenuOpen && (
          <>
            {/* Mobile Layout (< 640px) - Navigation at bottom */}
            <div className="sm:hidden bg-white dark:bg-gray-900 shadow-xl rounded-b-2xl mx-4 border dark:border-gray-700 overflow-hidden">
              {/* Stats Cards at top */}
              <div className="p-4 bg-gray-100 dark:bg-gray-800">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm border dark:border-gray-600">
                    <StatRectangle 
                      label="My MBT" 
                      value={`${formatMbtBalance()} MBT`} 
                      valueColor="text-green-400" 
                    />
                  </div>
                  <div className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm border dark:border-gray-600">
                    <StatRectangle 
                      label="TVL" 
                      value={`${formatTotalValueLocked()} MBT`}
                      valueColor="text-green-400" 
                    />
                  </div>
                  <div className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm border dark:border-gray-600 col-span-2">
                    <StatRectangle 
                      label="Active Bonds" 
                      value={`${formatTotalActiveBonds()}`}
                      valueColor="text-green-400" 
                    />
                  </div>
                </div>
              </div>
              
              {/* Navigation Links at bottom */}
              <nav className="flex flex-col p-2">
                {NAV_LINKS.filter(link => link.enabled).map((link) => {
                  const IconComponent = link.icon;
                  return (
                    <Link key={link.label} href={link.href} onClick={() => setMobileMenuOpen(false)}>
                      <button
                        className={`w-full px-4 py-3 rounded-lg flex items-center space-x-3 transition-colors my-1
                          ${pathname === link.href 
                            ? "bg-[#522912] dark:bg-gray-700 text-white font-semibold" 
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                      >
                        <IconComponent className="h-5 w-5" />
                        <span>{link.label}</span>
                      </button>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Tablet Layout (≥ 640px and < 1024px) - Just navigation */}
            <div className="hidden sm:block lg:hidden bg-white dark:bg-gray-900 shadow-xl rounded-b-2xl mx-4 border dark:border-gray-700 overflow-hidden">
              <nav className="flex flex-col p-2">
                {NAV_LINKS.filter(link => link.enabled).map((link) => {
                  const IconComponent = link.icon;
                  return (
                    <Link key={link.label} href={link.href} onClick={() => setMobileMenuOpen(false)}>
                      <button
                        className={`w-full px-4 py-3 rounded-lg flex items-center space-x-3 transition-colors my-1
                          ${pathname === link.href 
                            ? "bg-[#522912] dark:bg-gray-700 text-white font-semibold" 
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                      >
                        <IconComponent className="h-5 w-5" />
                        <span>{link.label}</span>
                      </button>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </>
        )}
      </div>

      {/* Bottom Navigation Bar - Mobile and Tablet only */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white dark:bg-gray-900 border-t dark:border-gray-800 shadow-lg">
        <nav className="max-w-md mx-auto px-4 py-2">
          <div className="flex justify-around items-center">
            {NAV_LINKS.filter(link => link.enabled).map((link) => {
              const IconComponent = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link key={link.label} href={link.href}>
                  <button
                    className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors min-w-[60px]
                      ${isActive 
                        ? "text-[#522912] dark:text-white bg-gray-100 dark:bg-gray-800" 
                        : "text-gray-500 dark:text-gray-400 hover:text-[#522912] dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                  >
                    <IconComponent className={`h-5 w-5 mb-1 ${isActive ? 'text-[#522912] dark:text-white' : ''}`} />
                    <span className="text-xs font-medium">{link.label}</span>
                  </button>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Bottom padding to prevent content from being hidden behind bottom nav */}
      <div className="h-16 lg:hidden" />
    </>
  )
}