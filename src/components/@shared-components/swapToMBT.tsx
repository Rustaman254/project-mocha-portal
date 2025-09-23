import React, { useState, useEffect } from "react";
import { useAccount, useBalance } from "wagmi";
import { usePreviewTokenPurchase, useSwapTokens } from "@/hooks/use-ico";
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

type SupportedToken = {
  label: "ETH" | "USDC" | "SCROLL";
  paymentMethod: string;
  decimals: number;
  contractFunc: "buyTokensWithEth" | "buyTokensWithUsdc" | "buyTokensWithScr";
  needsValue: boolean;
  tokenAddress?: `0x${string}`;
};

const supportedTokens: SupportedToken[] = [
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
    tokenAddress: "0x8142c0238aa0EA3788e6eFC617134DBC0b7339B0",
  },
  {
    label: "SCROLL",
    paymentMethod: "SCR",
    decimals: 18,
    contractFunc: "buyTokensWithScr",
    needsValue: false,
    tokenAddress: "0xDEdB65B3a8d970995a26b25F1BA406dbb321D168",
  },
];

const USD_DECIMALS = 6;

export function SwapToMBTComponent() {
  const [fromToken, setFromToken] = useState<SupportedToken["label"]>(supportedTokens[0].label);
  const [amount, setAmount] = useState<string>("");
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [result, setResult] = useState<string>("");

  const { address } = useAccount();

  const selected = supportedTokens.find((t) => t.label === fromToken)!;
  const formattedAmount = amount && Number(amount) > 0 ? parseUnits(amount, selected.decimals) : BigInt(0);

  const ethBalanceQuery = useBalance({
    address,
    query: {
      enabled: selected.label === "ETH" && !!address,
    }
  });
  const erc20BalanceQuery = useBalance({
    address,
    token: selected.tokenAddress,
    query: {
      enabled: selected.label !== "ETH" && !!address && !!selected.tokenAddress,
    }
  });

  const tokenBalance: string =
    selected.label === "ETH"
      ? ethBalanceQuery.data?.formatted ?? "0"
      : erc20BalanceQuery.data?.formatted ?? "0";

  const { data: preview } = usePreviewTokenPurchase(selected.paymentMethod, formattedAmount);
  // const [tokensToReceive, usdValue] = (preview ?? [0n, 0n]) as [bigint, bigint];
  const [tokensToReceive, usdValue] = preview;
  const formattedUsdValue = Number(formatUnits(usdValue, 18)); //the contract returns the value in 18 decimals

 

  let swapArgs: any[] = [];
  let swapValue: bigint | undefined = undefined;
  if (selected.label === "ETH") {
    swapArgs = [address, tokensToReceive];
    swapValue = formattedAmount;
  } else if (selected.label === "USDC" || selected.label === "SCROLL") {
    swapArgs = [formattedAmount, tokensToReceive];
    //swapValue = undefined;
  }

  console.log("swapArgs", swapArgs, "swapValue", swapValue)

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
    selected.label !== "ETH" ? selected.tokenAddress : undefined
  );

  const withdrawalFee = 0.005;
  const txFee = 0.002;
  const totalFeePct = withdrawalFee + txFee;
  const feeUsd = formattedUsdValue * totalFeePct;
  const netUsd = formattedUsdValue - feeUsd;
  const netUsdDisplay =
    netUsd > 0 ? netUsd.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "0";

  const mbtDisplay =
    tokensToReceive && formattedAmount > BigInt(0)
      ? `${Number(formatUnits(tokensToReceive, 18)).toLocaleString(undefined, { maximumFractionDigits: 6 })} MBT ($${formattedUsdValue.toLocaleString(undefined, { maximumFractionDigits: 6 })})`
      : "";

  const handleSetMax = () => setAmount(tokenBalance.toString());
  const handleSetHalf = () =>
    setAmount((parseFloat(tokenBalance) * 0.5).toString());
  const handleSetMin = () => setAmount("1");

  const handleSwap = (e: React.FormEvent) => {
    e.preventDefault();
    setShowPreview(true);
  };

  const handleConfirmSwap = async () => {
    setResult("");
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
  };

  useEffect(() => {
    if (error) {
      toast.error(error.message || "Transaction error occurred.", {
        duration: 6000,
      });
    }
  }, [error]);

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-2 w-full">
      {!showPreview ? (
        <form onSubmit={handleSwap}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm text-gray-600 dark:text-gray-400">
              Swap to MBT{" "}
              
            </h2>
          
          </div>
            <p className="text-brown-100 font-bold text-xs">Step 1: Acquire the Mocha Bean Token (MBT) to invest in our trees</p>
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
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min={0}
              className="w-3/4 text-2xl bg-transparent border-none focus:outline-none text-gray-800 dark:text-gray-100 font-bold placeholder-gray-300 dark:placeholder-gray-500"
            />
            <div className="ml-3 w-1/4 flex items-center">
              <Select
                onValueChange={value =>
                  setFromToken(value as SupportedToken["label"])
                }
                defaultValue={supportedTokens[0].label}
              >
                <SelectTrigger className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-full px-4 py-2 flex items-center text-sm shadow-none h-auto focus:ring-2 focus:ring-amber-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedTokens.map(t => (
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
              className="text-2xl bg-transparent border-none focus:outline-none text-gray-900 dark:text-white font-bold placeholder-gray-300 dark:placeholder-gray-500 px-0 select-none w-3/4"
            />
            <span className="ml-3 bg-gray-200 dark:bg-gray-800 text-[#522912] dark:text-amber-400 text-sm px-3 py-1 rounded-full whitespace-nowrap">
              MBT
            </span>
          </div>
          <Button
            className="w-full bg-[#522912] rounded-full hover:bg-[#6A4A36] text-white py-3 text-lg"
            disabled={!amount || !address}
            type="submit"
          >
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
              You pay: {amount} {selected.label}
            </p>
            <p>
              You receive:{" "}
              {Number(formatUnits(tokensToReceive, 18)).toLocaleString(undefined, {
                maximumFractionDigits: 6,
              })}{" "}
              MBT
            </p>
            <p>
              Value before fees: $
              {formattedUsdValue.toLocaleString(undefined, {
                maximumFractionDigits: 6,
              })}
            </p>
            <p>Withdrawal Fee: 0.5% | Transaction Fee: 0.2%</p>
            <p>
              <span className="font-semibold">
                Net after fees: ${netUsdDisplay}
              </span>
            </p>
            <p>Maturity Time: 7 days</p>
          </div>
          <Button
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 text-lg"
            disabled={isPending || isConfirming}
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
          {isConfirmed && (
            <div className="mt-3 p-2 rounded-lg bg-green-100 dark:bg-green-600 text-center text-green-800 dark:text-green-100 text-sm border border-dashed dark:border-green-500">
              Swap confirmed! {hash}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
