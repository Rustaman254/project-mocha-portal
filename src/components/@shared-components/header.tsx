"use client"

import { useEffect, useState } from "react"
import { Moon, Sun, Menu, X, LayoutDashboard, Coins, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAppKit, useAppKitAccount } from "@reown/appkit/react"
import { StatRectangle } from "./stat-rectangle"
import { useAccount, useReadContract } from "wagmi"
import { scrollSepolia } from "viem/chains"
import { formatUnits } from "viem"
import { MBT_ADDRESS, MBT_TOKEN_ABI, MBT_DECIMALS, TREE_CONTRACT_ADDRESS, TREE_CONTRACT_ABI } from "@/config/constants"
import { isAdminAddress } from "@/lib/admin"

console.log(isAdminAddress("0x80569F788Ca7564429feB8Aabdd4Ff73e0aC98E0"));
console.log(isAdminAddress("0x80569f788ca7564429feb8aabdd4ff73e0ac98e0"));

const USER_LINKS = [
  { label: "Dashboard", href: "/", enabled: true, icon: LayoutDashboard },
]

const ADMIN_LINKS = [
  ...USER_LINKS,
  { label: "Admin", href: "/admin", enabled: true, icon: Coins },
  { label: "Farms", href: "/farms", enabled: true, icon: Coins },
  { label: "Events Log", href: "/logs", enabled: true, icon: Coins },
]

export default function Header() {
  const { isConnected, address } = useAppKitAccount()
  const { address: userAddress } = useAccount()
  const [darkMode, setDarkMode] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const isAdmin = isConnected && isAdminAddress(address)
  const NAV_LINKS = isAdmin ? ADMIN_LINKS : USER_LINKS

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

  const toggleDarkMode = () => setDarkMode(!darkMode)
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen)

  const { data: mbtBalance, error: mbtError, isLoading: mbtLoading } = useReadContract({
    address: MBT_ADDRESS,
    abi: MBT_TOKEN_ABI,
    functionName: "balanceOf",
    args: [userAddress],
    chainId: scrollSepolia.id,
    query: { enabled: isConnected && !!userAddress, retry: 3 },
  })

  const { data: totalActiveBonds, error: bondsError, isLoading: bondsLoading } = useReadContract({
    address: TREE_CONTRACT_ADDRESS,
    abi: TREE_CONTRACT_ABI,
    functionName: "totalActiveBonds",
    chainId: scrollSepolia.id,
    query: { enabled: isConnected, retry: 3 },
  })

  const { data: totalValueLocked, error: tvlError, isLoading: tvlLoading } = useReadContract({
    address: TREE_CONTRACT_ADDRESS,
    abi: TREE_CONTRACT_ABI,
    functionName: "totalValueLocked",
    chainId: scrollSepolia.id,
    query: { enabled: isConnected, retry: 3 },
  })

  const formatMbtBalance = () => {
    if (mbtLoading) return "Loading..."
    if (mbtError) return "Error"
    if (!mbtBalance) return "0.0000"
    return Number(formatUnits(mbtBalance, MBT_DECIMALS)).toFixed(4)
  }

  const formatTotalValueLocked = () => {
    if (tvlLoading) return "Loading..."
    if (tvlError) return "Error"
    if (!totalValueLocked) return "0.0000"
    return Number(formatUnits(totalValueLocked, MBT_DECIMALS)).toFixed(4)
  }

  const formatTotalActiveBonds = () => {
    if (bondsLoading) return "Loading..."
    if (bondsError) return "Error"
    if (!totalActiveBonds) return "0"
    return totalActiveBonds.toString()
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 bg-[transparent] dark:bg-[transparent]">
        {/* Logo and stats, navigation */}
        <div className="mx-auto flex items-center justify-between py-3 lg:py-4 px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 max-w-[1800px]">
          <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16">
              <Image
                src={darkMode ? "/Brand/mocha-white.svg" : "/Brand/mocha-brown.png"}
                alt="Project Logo"
                fill
                className="object-contain"
              />
            </div>
            <div className="hidden sm:flex items-center gap-2 lg:gap-3 text-xs lg:text-sm">
              <StatRectangle label="MBT Balance" value={`${formatMbtBalance()} MBT`} valueColor="text-green-400" />
              <StatRectangle label="TVL" value={`${formatTotalValueLocked()} MBT`} valueColor="text-green-400" />
              <StatRectangle label="Total Active Investments" value={`${formatTotalActiveBonds()}`} valueColor="text-green-400" />
            </div>
          </div>
          {/* Desktop navigation, unchanged */}
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
          {/* Tablet & Mobile controls */}
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
      </div>

      {/* PILL-Shaped Navigation Bar for ALL non-desktop screens */}
      <div className={
        "fixed bottom-0 left-0 right-0 z-50 lg:hidden mx-4 mb-4 bg-white dark:bg-gray-900 rounded-full shadow-xl border border-gray-200 dark:border-gray-800 flex justify-center overflow-x-auto"
      }>
        <nav className="flex justify-around w-full px-2 py-2">
          {NAV_LINKS.filter(link => link.enabled).map((link) => {
            const IconComponent = link.icon
            const isActive = pathname === link.href
            return (
              <Link key={link.label} href={link.href}>
                <button
                  className={`
                    flex items-center justify-center
                    rounded-full
                    p-2 mx-1 transition-colors
                    min-w-[48px] min-h-[48px]
                    ${isActive 
                      ? "bg-[#522912] dark:bg-gray-700 text-white font-semibold" 
                      : "text-gray-500 dark:text-gray-400 hover:text-[#522912] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                    }
                  `}
                  aria-label={link.label}
                >
                  <IconComponent className={`h-6 w-6`} />
                  {/* Label hidden on screens below desktop */}
                  <span className="hidden">{link.label}</span>
                </button>
              </Link>
            )
          })}
        </nav>
      </div>
      {/* Bottom padding */}
      <div className="h-20 lg:hidden" />
    </>
  )
}
