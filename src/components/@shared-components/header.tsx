import { useEffect, useState } from "react"
import {
  Moon,
  Sun,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { OpenfortKitButton } from "@openfort/openfort-kit"

const NAV_LINKS = [
  { label: "Dashboard", href: "/", enabled: true },
  { label: "Marketplace", href: "/marketplace", enabled: true },
  { label: "Staking", href: "/staking", enabled: false },
  { label: "Investments", href: "/investments", enabled: true },
]

export default function Header() {
    const [darkMode, setDarkMode] = useState(false)
    const pathname = usePathname()

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

    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-[transparent] dark:bg-[transparent]">
        <div className="mx-auto flex items-center justify-between py-4 px-12">
          <Image
            src={darkMode ? "/Brand/mocha-white.svg" : "/Brand/mocha-brown.png"}
            alt="Project Logo"
            width={78}
            height={78}
            className="object-fit"
          />

          <div className="flex items-center space-x-6">
            <nav className="border dark:border-gray-800 bg-white dark:bg-gray-800 bg-gray-300 rounded-full px-6 py-2">
              <div className="flex items-center space-x-2">
                {NAV_LINKS.filter(link => link.enabled).map((link) => (
                  <Link key={link.label} href={link.href}>
                    <button
                      className={`px-4 py-1.5 rounded-full flex items-center transition-colors
                        ${pathname === link.href ? "text-[#522912] dark:text-white font-semibold" : "text-gray-400 hover:text-[#522912]"}`}
                    >
                      {link.label}
                      {/* {link.label === "Dashboard" && <ChevronDown className="ml-1.5 w-4 h-4" />} */}
                    </button>
                  </Link>
                ))}
              </div>
            </nav>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleDarkMode}
              className="rounded-full bg-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5 text-gray-700" />}
            </Button>

            <OpenfortKitButton
              showAvatar={true}
              showBalance={true}
              label="Connect Wallet"
            />
          </div>
        </div>
      </div>
    )
}