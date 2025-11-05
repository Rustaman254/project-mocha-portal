import React, { useState, useEffect } from "react";
import { useAccount, useBalance } from "wagmi";
import { usePreviewTokenPurchase, useSwapTokens, useMinPurchases } from "@/hooks/use-ico";
import { formatUnits, parseUnits } from "viem/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";

interface TokenConfig {
  label: string;
  paymentMethod: string;
  decimals: number;
  contractFunc: string;
  needsValue: boolean;
  tokenAddress?: `0x${string}`;
}

const supportedTokens: TokenConfig[] = [
  {
    label: "ETH",
    paymentMethod: "ETH",
    decimals: 18,
    contractFunc: "buyTokensWithEth",
    needsValue: true,
  },
  {
    label: "USDC",
    paymentMethod: "USDC",
    decimals: 6,
    contractFunc: "buyTokensWithUsdc",
    needsValue: false,
    tokenAddress: "0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4",
  },
  {
    label: "USDT",
    paymentMethod: "USDT",
    decimals: 6,
    contractFunc: "buyTokensWithUsdt",
    needsValue: false,
    tokenAddress: "0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df",
  },
  {
    label: "SCROLL",
    paymentMethod: "SCR",
    decimals: 18,
    contractFunc: "buyTokensWithScr",
    needsValue: false,
    tokenAddress: "0xd29687c813D741E2F938F4aC377128810E217b1b",
  },
  {
    label: "WBTC",
    paymentMethod: "WBTC",
    decimals: 8,
    contractFunc: "buyTokensWithWbtc",
    needsValue: false,
    tokenAddress: "0x3C1BCa5a656e69edCD0D4E36BEbb3FcDAcA60Cf1",
  },
];

function roundToThree(num: any) {
  if (!num || isNaN(Number(num))) return "0.000";
  return (Math.round(Number(num) * 1000) / 1000).toFixed(3);
}
function roundToWhole(num: any) {
  if (!num || isNaN(Number(num))) return "0";
  return Math.round(Number(num)).toString();
}
function roundToFour(value: any) {
  if (!value || isNaN(Number(value))) return "0";
  return (Math.round(Number(value) * 10000) / 10000).toFixed(4);
}

const USD_DECIMALS = 6;

export function SwapToMBTComponent() {
  const [fromToken, setFromToken] = useState(supportedTokens[0].label);
  const [amount, setAmount] = useState<string>("");
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const { minEth, minUsdt, minUsdc, minScr } = useMinPurchases();
  const [result, setResult] = useState<string>("");
  const [openPaymentInfo, setOpenPaymentInfo] = useState<"none" | "card" | "mpesa">("none");
  const [notifyEmail, setNotifyEmail] = useState<string>("");
  const [notifySent, setNotifySent] = useState<boolean>(false);
  const { address } = useAccount();

  const selected = supportedTokens.find((t) => t.label === fromToken) as TokenConfig;

  if (!selected) {
    return <div>Unsupported token selected</div>; 
  }

  if (!selected) {
    return <div>Unsupported token selected</div>; 
  }

  // --- Fully explicit formattedAmount ---
  let roundedAmount: string = "";
  if (selected.label === "ETH" && amount) {
    roundedAmount = roundToFour(amount);
  } else if (amount) {
    roundedAmount = amount;
  }
  let formattedAmount: bigint = BigInt(0);
  try {
    formattedAmount =
      roundedAmount && Number(roundedAmount) > 0
        ? parseUnits(roundedAmount, selected.decimals)
        : BigInt(0);
  } catch (e) {
    formattedAmount = BigInt(0);
  }

  // --- Balances ---
  const ethBalanceQuery = useBalance({
    address,
    query: { enabled: selected.label === "ETH" && !!address },
  });
  const erc20BalanceQuery = useBalance({
    address,
    token: selected.tokenAddress,
    query: {
      enabled: !!address && !!selected.tokenAddress,
    },
  });
  const rawEthBalance = ethBalanceQuery.data?.formatted ?? "0";
  const tokenBalance =
    selected.label === "ETH"
      ? roundToFour(rawEthBalance)
      : erc20BalanceQuery.data?.formatted ?? "0";

  // --- Preview ---
  const { data: preview } = usePreviewTokenPurchase(
    selected.paymentMethod,
    formattedAmount
  );
  // --- never let tokensToReceive be undefined ---
  const [tokensToReceiveRaw, usdValueRaw] = preview ?? [BigInt(0), BigInt(0)];
  const tokensToReceive = tokensToReceiveRaw !== undefined ? tokensToReceiveRaw : BigInt(0);
  const usdValue = usdValueRaw !== undefined ? usdValueRaw : BigInt(0);
  const formattedUsdValue = Number(formatUnits(usdValue, 18));

  // --- Args construction with full checks for contract expectations ---
  const isValidAmount = formattedAmount > BigInt(0);
  const isValidTokensToReceive = tokensToReceive >= BigInt(0);

  let swapArgs: any[] = [];
  if (selected.label === "ETH") {
    swapArgs = [address, tokensToReceive];
  } else {
    swapArgs = [formattedAmount, tokensToReceive];
  }

  const swapValue = selected.needsValue ? formattedAmount : undefined;

  // --- Swap hook ---
  console.log({
    selectedLabel: selected.label,
    selectedTokenAddress: selected.tokenAddress,
    selectedContractFunc: selected.contractFunc,
    swapArgs,
    swapValue,
  });
  
  const {
    swap,
    hash,
    error,
    isPending,
    isConfirming,
    isConfirmed,
  } = useSwapTokens(
    selected.contractFunc,
    swapArgs,
    swapValue,
    selected.tokenAddress
  );

  // --- Fees ---
  const withdrawalFee = 0.005;
  const txFee = 0.002;
  const totalFeePct = withdrawalFee + txFee;
  const feeUsd = formattedUsdValue * totalFeePct;
  const netUsd = formattedUsdValue - feeUsd;
  const netUsdDisplay = netUsd > 0 ? roundToWhole(netUsd) : "0";
  const mbtDisplay =
    tokensToReceive && isValidAmount
      ? `${roundToThree(Number(formatUnits(tokensToReceive, 18)))} MBT ($${roundToWhole(formattedUsdValue)})`
      : "";
  const SHRINK_FONT_LENGTH = 16;
  const isLongValue = mbtDisplay && mbtDisplay.length > SHRINK_FONT_LENGTH;

  // --- Handlers (all explicit) ---
  function handleSetMax() {
    setAmount(selected.label === "ETH" ? roundToFour(tokenBalance) : tokenBalance.toString());
  }
  function handleSetHalf() {
    setAmount(
      selected.label === "ETH"
        ? roundToFour(parseFloat(tokenBalance) * 0.5)
        : (parseFloat(tokenBalance) * 0.5).toString()
    );
  }
  function handleSetMin() {
    let minValue = "1";
    if (selected.label === "ETH" && minEth) {
      minValue = roundToFour(formatUnits(minEth, 18));
    } else if (selected.label === "USDT" && minUsdt) {
      minValue = formatUnits(minUsdt, 6);
    } else if (selected.label === "USDC" && minUsdc) {
      minValue = formatUnits(minUsdc, 6);
    } else if (selected.label === "SCROLL" && minScr) {
      minValue = formatUnits(minScr, 18);
    }
    setAmount(minValue);
  }
  function handleSwap(e: React.FormEvent) {
    e.preventDefault();
    if (selected.label === "ETH" && amount) {
      setAmount(roundToFour(amount));
    }
    setShowPreview(true);
  }
  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    let value = e.target.value;
    if (selected.label === "ETH" && value) {
      const parts = value.split(".");
      if (parts.length === 2 && parts[1].length > 4) {
        value = parts[0] + "." + parts[1].slice(0, 4);
      }
    }
    setAmount(value);
  }
  async function handleConfirmSwap() {
    setResult("");
    // Extra log for debug
    console.log({
      swapArgs,
      formattedAmount: String(formattedAmount),
      tokensToReceive: String(tokensToReceive),
      selectedLabel: selected.label,
    });
    try {
      await swap();
    } catch (err) {
      let message = "Swap failed. Please try again.";
      if ((err as { name?: string })?.name === "UserRejectedRequestError") {
        message = "Transaction cancelled in wallet.";
      } else if ((err as { code?: number })?.code === 4001) {
        message = "Transaction cancelled in wallet.";
      } else if ((err as Error)?.message) {
        message = (err as Error).message;
      }
      toast.error(message, { duration: 6000 });
      setResult(message);
    }
  }
  function handleNotify() {
    if (notifyEmail && notifyEmail.includes("@")) {
      setNotifySent(true);
      toast.success("You'll be notified when this payment mode is live.", { duration: 6000 });
    } else {
      toast.error("Please enter a valid email.", { duration: 4000 });
    }
  }

  useEffect(() => {
    if (isConfirmed) {
      window.dispatchEvent(new Event("balanceChanged"));
    }
  }, [isConfirmed]);

  // --- Main render (unchanged display, disables as needed) ---
  if (!selected) {
    return <div>Unsupported token selected</div>; 
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-2 w-full">
      {!showPreview ? (
        <form onSubmit={handleSwap}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm text-gray-600 dark:text-gray-400">
              Swap to MBT{" "}
            </h2>
          </div>
          <p className="text-brown-100 font-bold text-xs">
            Step 1: Acquire the Mocha Bean Token (MBT) to invest in our trees
          </p>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <ArrowUpRight className="h-4 w-4 text-amber-600 dark:text-amber-400 mr-1" />
              <span className="text-xs text-gray-700 dark:text-gray-300 font-semibold tracking-wide">
                You pay
              </span>
            </div>
            <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full font-bold text-sm">
              {tokenBalance} {selected.label} available
            </span>
          </div>
          <div className="flex items-center w-full mb-2">
            <input
              type="number"
              step="any"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.00"
              min={0}
              className="w-3/4 text-2xl bg-transparent border-none focus:outline-none text-gray-800 dark:text-gray-100 font-bold placeholder-gray-300 dark:placeholder-gray-500"
            />
            <div className="ml-3 w-1/4 flex items-center">
              <Select
                onValueChange={(value) => setFromToken(value)}
                defaultValue={supportedTokens[0].label}
              >
                <SelectTrigger className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-full px-4 py-2 flex items-center text-sm shadow-none h-auto focus:ring-2 focus:ring-amber-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedTokens.map((t) => (
                    <SelectItem key={t.label} value={t.label}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mb-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-full px-4 py-1 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              onClick={handleSetMax}
            >
              Max
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-full px-4 py-1 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              onClick={handleSetHalf}
            >
              50%
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-full px-4 py-1 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              onClick={handleSetMin}
            >
              Min
            </Button>
          </div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <ArrowDownLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-300 mr-1" />
              <span className="text-xs text-gray-700 dark:text-gray-300 font-semibold tracking-wide">
                You receive
              </span>
            </div>
          </div>
          <div className="flex items-center w-full mb-4">
            <input
              type="text"
              value={mbtDisplay}
              disabled
              className={`
                ${isLongValue ? 'text-lg' : 'text-2xl'}
                bg-transparent border-none focus:outline-none text-gray-900 dark:text-white font-bold placeholder-gray-300 dark:placeholder-gray-500 px-0 select-none w-3/4 transition-all duration-200
              `}
            />
            <span className="ml-3 bg-gray-200 dark:bg-gray-800 text-[#522912] dark:text-amber-400 text-sm px-3 py-1 rounded-full whitespace-nowrap">
              MBT
            </span>
          </div>
          <Button
            className="w-full bg-[#522912] rounded-full hover:bg-[#6A4A36] text-white py-3 text-sm flex items-center justify-center gap-2"
            disabled={
              !amount ||
              !address ||
              !isValidAmount ||
              !isValidTokensToReceive
            }
            type="submit"
          >
            <ArrowUpRight className="w-5 h-5 mr-2" />
            Preview Swap
          </Button>
        </form>
      ) : (
        <div>
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">
            Confirm Swap
          </h3>
          <div className="mb-2 p-2 rounded bg-gray-100 dark:bg-gray-800">
            <p>
              You pay: {roundedAmount} {selected.label}
            </p>
            <p>
              You receive:{" "}
              {roundToThree(Number(formatUnits(tokensToReceive, 18)))} MBT
            </p>
            <p>
              Value before fees: ${roundToWhole(formattedUsdValue)}
            </p>
            <p>
              <span className="font-semibold">
                Net after fees: ${netUsdDisplay}
              </span>
            </p>
          </div>
          <Button
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 text-sm"
            disabled={
              isPending ||
              isConfirming ||
              !isValidAmount ||
              !isValidTokensToReceive
            }
            onClick={handleConfirmSwap}
          >
            {isPending || isConfirming ? "Processing..." : "Complete Purchase"}
          </Button>
          <Button
            className="w-full mt-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-2"
            onClick={() => setShowPreview(false)}
            variant="ghost"
          >
            Go Back
          </Button>
          {isConfirmed && hash && (
            <div className="mt-3 p-2 rounded-lg bg-green-100 dark:bg-green-600 text-center text-green-800 dark:text-green-100 text-sm border border-dashed dark:border-green-500">
              <p className="font-semibold">Swap Confirmed!</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `https://scrollscan.com/tx/${hash}`
                    );
                    toast.success("Copied to clipboard");
                  }}
                  className="text-xs"
                >
                  Copy Link
                </Button>
                <a
                  href={`https://scrollscan.com/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs"
                >
                  <Button size="sm" variant="ghost">
                    View on Scroll Explorer
                  </Button>
                </a>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="mb-4">
        <div className="font-bold mb-1">Pay with (coming soon):</div>
        <div className="flex gap-2">
          <Button
            type="button"
            className="rounded-full bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white py-1 px-4"
            onClick={() => setOpenPaymentInfo("card")}
          >
            Bank Card
          </Button>
          <Button
            type="button"
            className="rounded-full bg-green-100 dark:bg-green-700 text-green-900 dark:text-green-200 py-1 px-4"
            onClick={() => setOpenPaymentInfo("mpesa")}
          >
            M-Pesa
          </Button>
        </div>
        {openPaymentInfo !== "none" && (
          <div className="mt-2 bg-yellow-50 dark:bg-yellow-900 p-2 rounded shadow-inner">
            <div className="mb-2 text-yellow-800 dark:text-yellow-300">
              This feature is not yet available. Enter your email to get notified when live.
            </div>
            {notifySent ? (
              <span className="text-green-600 dark:text-green-300 font-semibold">
                Thank you, you'll be notified!
              </span>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={notifyEmail}
                  onChange={e => setNotifyEmail(e.target.value)}
                  className="w-full py-1 px-2 rounded border border-gray-300 focus:outline-none dark:bg-gray-800 dark:border-gray-600"
                />
                <Button
                  type="button"
                  className="bg-amber-500 text-white px-4 py-1 rounded"
                  onClick={handleNotify}
                >
                  Notify Me
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
