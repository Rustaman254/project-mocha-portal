import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react"; // Use these for pay/receive

const supportedTokens = [
  {
    label: "ETH",
    address: "0xtesteth",
    toMbt: 2,
    decimals: 18,
    fakeBalance: 2.156,
  },
  {
    label: "USDC",
    address: "0xtestusdc",
    toMbt: 0.04,
    decimals: 6,
    fakeBalance: 1234.56,
  },
  {
    label: "SCROLL",
    address: "0xtestscroll",
    toMbt: 1,
    decimals: 18,
    fakeBalance: 100.1,
  },
];

const MBTPRICEUSD = 25;

export function SwapToMBTComponent() {
  const [fromToken, setFromToken] = useState(supportedTokens[0].address);
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState("");

  const selected = supportedTokens.find((t) => t.address === fromToken);
  const inputAmount = Number(amount) || 0;
  const mbtAmount = inputAmount * (selected?.toMbt ?? 1);
  const dollarValue = mbtAmount * MBTPRICEUSD;
  const tokenBalance = selected ? selected.fakeBalance : 0;

  const mbtDisplay =
    fromToken === "0xtestusdc"
      ? `${mbtAmount.toLocaleString(undefined, {
          maximumFractionDigits: 6,
        })}`
      : `${mbtAmount.toLocaleString(undefined, {
          maximumFractionDigits: 6,
        })}${
          mbtAmount
            ? ` ($${dollarValue.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })})`
            : ""
        }`;

  const handleSetMax = () => setAmount(tokenBalance.toString());
  const handleSetHalf = () => setAmount((tokenBalance * 0.5).toString());
  const handleSetMin = () => setAmount("1");

  return (
    <div className="bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg p-4 mb-2 w-full max-w-lg">
      {/* Card Title */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm text-gray-600 dark:text-white">Swap to MBT <span className="text-amber-600 font-bold">(this does not work yet.)</span></h2>
      </div>

      {/* YOU PAY ROW */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <ArrowUpRight className="h-4 w-4 text-amber-600 dark:text-amber-400 mr-1" />
          <span className="text-xs text-gray-700 dark:text-gray-300 font-semibold tracking-wide">
            You pay
          </span>
        </div>
        {/* Available Balance */}
        <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full font-bold text-sm">
          {tokenBalance.toLocaleString(undefined, {
            maximumFractionDigits: 6,
          })}{" "}
          {selected?.label} available
        </span>
      </div>

      {/* Main input + select */}
      <div className="flex items-center w-full mb-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          min={0}
          className="w-3/4 text-2xl appearance-none bg-transparent border-none focus:outline-none text-gray-800 dark:text-gray-100 font-bold placeholder-gray-300 dark:placeholder-gray-500"
          style={{ boxShadow: "none" }}
        />
        <div className="ml-3 w-1/4 flex items-center">
          <Select onValueChange={setFromToken} defaultValue={supportedTokens[0].address}>
            <SelectTrigger className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-full px-4 py-2 flex items-center text-sm shadow-none h-auto focus:ring-2 focus:ring-amber-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {supportedTokens.map((t) => (
                <SelectItem key={t.address} value={t.address}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick select buttons */}
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

      {/* YOU RECEIVE ROW */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <ArrowDownLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-300 mr-1" />
          <span className="text-xs text-gray-700 dark:text-gray-300 font-semibold tracking-wide">
            You receive
          </span>
        </div>
      </div>

      {/* MBT output with pill showing only "MBT" (sm) */}
      <div className="flex items-center w-full mb-4">
        <input
          type="text"
          value={mbtDisplay}
          disabled
          className="text-2xl appearance-none bg-transparent border-none focus:outline-none text-gray-900 dark:text-white font-bold placeholder-gray-300 dark:placeholder-gray-500 px-0 select-none w-3/4"
          style={{ boxShadow: "none" }}
        />
        <span className="ml-3 bg-gray-200 dark:bg-gray-800 text-[#522912] dark:text-amber-400 text-sm px-3 py-1 rounded-full whitespace-nowrap">
          MBT
        </span>
      </div>

      {/* Swap Button */}
      <Button
        className="w-full bg-[#522912] rounded-full hover:bg-[#6A4A36] text-white py-3 text-lg"
        disabled={!amount}
        onClick={() =>
          setResult(
            `Test swap: ${amount || 0} ${selected?.label} → ${mbtAmount} MBT`
          )
        }
      >
        Swap {amount || 0} for {mbtAmount}
      </Button>
      {result && (
        <div className="mt-4 p-2 rounded-lg bg-gray-100 dark:bg-gray-600 text-center text-gray-800 dark:text-gray-100 text-sm border border-dashed dark:border-gray-500">
          {result}
        </div>
      )}

      {/* Info section at bottom */}
      <div className="mt-6 pt-4 border-t dark:border-gray-600">
        <div className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-300">
          <div>
            <span className="font-bold">Rate:</span> 1 {selected?.label} = {selected?.toMbt} MBT
          </div>
          <div>
            <span className="font-bold">Withdrawal Fee:</span> 0.5%
          </div>
          <div>
            <span className="font-bold">Transaction Fee:</span> 0.2%
          </div>
          <div>
            <span className="font-bold">Maturity Time:</span> 7 days
          </div>
        </div>
      </div>
    </div>
  );
}
