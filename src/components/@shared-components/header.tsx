import { useEffect, useState } from "react"
import { Moon, Sun, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAppKit, useAppKitAccount } from "@reown/appkit/react"
import { StatRectangle } from "./stat-rectangle"
import { useAccount, useReadContract } from "wagmi";
import { scrollSepolia } from "viem/chains";
import { formatUnits, formatEther } from "viem"
import { MBT_TOKEN_ADDRESS, MBT_TOKEN_ABI, MBT_DECIMALS, MOCHA_TREE_CONTRACT_ADDRESS, MOCHA_TREE_CONTRACT_ABI } from "@/config/constants"

const NAV_LINKS = [
  { label: "Dashboard", href: "/", enabled: true },
  { label: "Marketplace", href: "/marketplace", enabled: true },
  { label: "Staking", href: "/staking", enabled: false },
  { label: "Investments", href: "/investments", enabled: true },
]

export default function Header() {
  const { address: userAddress, isConnected } = useAccount();
  const [darkMode, setDarkMode] = useState(true)
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
    address: MBT_TOKEN_ADDRESS,
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
    address: MOCHA_TREE_CONTRACT_ADDRESS,
    abi: MOCHA_TREE_CONTRACT_ABI,
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
    address: MOCHA_TREE_CONTRACT_ADDRESS,
    abi: MOCHA_TREE_CONTRACT_ABI,
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
    if (!mbtBalance) return "0.00";
    return Number(formatUnits(mbtBalance as bigint, MBT_DECIMALS)).toFixed(2);
  };

  const formatTotalValueLocked = (): string => {
    if (tvlLoading) return "Loading...";
    if (tvlError) return "Error";
    if (!totalValueLocked) return "0";
    return Number(formatUnits(totalValueLocked as bigint, MBT_DECIMALS)).toFixed(2);
  };

  const formatTotalActiveBonds = (): string => {
    if (bondsLoading) return "Loading...";
    if (bondsError) return "Error";
    if (!totalActiveBonds) return "0";
    return totalActiveBonds.toString();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[transparent] dark:bg-[transparent]">
      <div className="mx-auto flex items-center justify-between py-4 px-4 sm:px-6 lg:px-12">
        {/* Logo and stats */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Image
            src={darkMode ? "/Brand/mocha-white.svg" : "/Brand/mocha-brown.png"}
            alt="Project Logo"
            width={60}
            height={60}
            className="object-fit"
          />

          {/* Stats - hidden on mobile */}
          <div className="hidden md:flex items-center gap-3 text-sm">
            <StatRectangle 
              label="My MBT Balance" 
              value={`${formatMbtBalance()} MBT`} 
              valueColor="text-green-400" 
            />
            <StatRectangle 
              label="Total Value Locked" 
              value={`${formatTotalValueLocked()} MBT`}
              valueColor="text-green-400" 
            />
            <StatRectangle 
              label="Total Active Bonds" 
              value={`${formatTotalActiveBonds()} bonds`}
              valueColor="text-green-400" 
            />
          </div>
        </div>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center space-x-4">
          <nav className="border dark:border-gray-800 bg-white dark:bg-gray-800 bg-gray-300 rounded-full px-6 py-2">
            <div className="flex items-center space-x-2">
              {NAV_LINKS.filter(link => link.enabled).map((link) => (
                <Link key={link.label} href={link.href}>
                  <button
                    className={`px-4 py-1.5 rounded-full flex items-center transition-colors
                      ${pathname === link.href ? "text-[#522912] dark:text-white font-semibold" : "text-gray-400 hover:text-[#522912]"}`}
                  >
                    {link.label}
                  </button>
                </Link>
              ))}
            </div>
          </nav>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleDarkMode}
              className="rounded-full bg-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5 text-gray-700" />}
            </Button>

            <appkit-button />
          </div>
        </div>

        {/* Mobile menu button and wallet - all buttons together */}
        <div className="flex md:hidden items-center space-x-2">
          <appkit-button className="mr-2" />
          
          <Button
            variant="outline"
            size="icon"
            onClick={toggleDarkMode}
            className="rounded-full bg-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5 text-gray-700" />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleMobileMenu}
            className="rounded-full bg-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Enhanced Mobile Menu (without wallet button) */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 shadow-xl rounded-b-2xl mx-4 border dark:border-gray-700 overflow-hidden">
          {/* Stats Cards */}
          <div className="p-4 bg-gray-100 dark:bg-gray-800">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm border dark:border-gray-600">
                <StatRectangle 
                  label="My MBT" 
                  value={`${formatMbtBalance()} MBT`} 
                  valueColor="text-green-400" 
                  className="text-xs"
                  compact
                />
              </div>
              <div className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm border dark:border-gray-600">
                <StatRectangle 
                  label="TVL" 
                  value={`${formatTotalValueLocked()} MBT`}
                  valueColor="text-green-400" 
                  className="text-xs"
                  compact
                />
              </div>
              <div className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm border dark:border-gray-600 col-span-2">
                <StatRectangle 
                  label="Active Bonds" 
                  value={`${formatTotalActiveBonds()}`}
                  valueColor="text-green-400" 
                  className="text-xs"
                  compact
                />
              </div>
            </div>
          </div>
          
          {/* Navigation Links */}
          <nav className="flex flex-col p-2">
            {NAV_LINKS.filter(link => link.enabled).map((link) => (
              <Link key={link.label} href={link.href} onClick={() => setMobileMenuOpen(false)}>
                <button
                  className={`w-full px-4 py-3 rounded-lg flex items-center transition-colors my-1
                    ${pathname === link.href 
                      ? "bg-[#522912] dark:bg-gray-700 text-white font-semibold" 
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                >
                  {link.label}
                </button>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  )
}