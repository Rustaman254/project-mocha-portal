import React, { useState } from "react";
import { useAccount, useWriteContract, useBalance, useReadContract } from "wagmi";
import { parseUnits, formatUnits } from "viem/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { MBT_ADDRESS, TREE_CONTRACT_ADDRESS, TREE_CONTRACT_ABI } from "@/config/constants";
import { toast } from "sonner";

// --- Types ---
interface InvestTreesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTrees: number;
  selectedFarmId: string | number | undefined;
}

type SupportedToken = {
  label: "ETH" | "USDC" | "USDT" | "SCROLL";
  paymentMethod: string;
  decimals: number;
  contractFunc: string;
  needsValue: boolean;
  tokenAddress?: string;
};

const supportedTokens: SupportedToken[] = [
  { label: "ETH", paymentMethod: "ETH", decimals: 18, contractFunc: "buyTokensWithEth", needsValue: true },
  { label: "USDC", paymentMethod: "USDC", decimals: 6, contractFunc: "buyTokensWithUsdc", needsValue: false, tokenAddress: "0x8142c0..." },
  { label: "USDT", paymentMethod: "USDT", decimals: 6, contractFunc: "buyTokensWithUsdt", needsValue: false, tokenAddress: "0xD078a..." },
  { label: "SCROLL", paymentMethod: "SCR", decimals: 18, contractFunc: "buyTokensWithScr", needsValue: false, tokenAddress: "0xDEdB..." },
];

const BONDPRICEUSD = 100;
const MBTPRICEUSD = 25;
const BONDMBT = BONDPRICEUSD / MBTPRICEUSD;
const MBT_DECIMALS = 18;

// --- Component ---
export default function InvestTreesDialog({
  isOpen,
  onClose,
  selectedTrees,
  selectedFarmId,
}: InvestTreesDialogProps) {
  const { address, isConnected } = useAccount();
  const [trees, setTrees] = useState<number>(selectedTrees || 1);
  const [showSwap, setShowSwap] = useState(false);
  const [fromToken, setFromToken] = useState<SupportedToken["label"]>(supportedTokens[0].label);

  // Defensive check and parse Units
  const requiredMBT = trees * BONDMBT;
  const mbtAmountParsed = Number.isFinite(requiredMBT)
    ? parseUnits(requiredMBT.toString(), MBT_DECIMALS)
    : 0n;

  // Balances & Allowance
  const mbtBalance = useBalance({ address, token: MBT_ADDRESS, query: { enabled: !!address } });
  const { data: mbtAllowance, refetch: refetchAllowance } = useReadContract({
    address: MBT_ADDRESS,
    abi: [
      // only allowance from your provided ABI
      {
        constant: true,
        inputs: [
          { name: "_owner", type: "address" },
          { name: "_spender", type: "address" }
        ],
        name: "allowance",
        outputs: [{ name: "remaining", type: "uint256" }],
        type: "function",
      }
    ],
    functionName: "allowance",
    args: address ? [address, TREE_CONTRACT_ADDRESS] : undefined,
    watch: true,
  });

  // Approve if necessary
  const needsApproval = mbtAllowance !== undefined
    ? BigInt(mbtAllowance) < mbtAmountParsed
    : false;

  // Write contract hooks
  const { writeContractAsync: approveAsync, isPending: isApprovePending } = useWriteContract();
  const { writeContractAsync: purchaseAsync, isPending: isInvestPending } = useWriteContract();

  // State
  const [isInvesting, setIsInvesting] = useState(false);
  const [investSuccess, setInvestSuccess] = useState(false);

  // Approve handler
  async function handleApprove() {
    if (!address) return toast.error("Wallet not connected.");
    try {
      await approveAsync({
        address: MBT_ADDRESS,
        abi: [
          {
            constant: false,
            inputs: [
              { name: "_spender", type: "address" },
              { name: "_value", type: "uint256" },
            ],
            name: "approve",
            outputs: [{ name: "success", type: "bool" }],
            type: "function",
          },
        ],
        functionName: "approve",
        args: [TREE_CONTRACT_ADDRESS, mbtAmountParsed],
      });
      toast.success("Approval successful!");
      await refetchAllowance?.();
    } catch (err: any) {
      toast.error("Approval failed: " + (err?.reason || err?.message));
    }
  }

  // Invest handler
  async function handleInvest() {
    // Defensive: Check all input is defined
    if (!selectedFarmId && selectedFarmId !== 0) {
      toast.error("No farm selected. Please select a farm.");
      return;
    }
    if (!Number.isFinite(trees) || trees <= 0 || !mbtAmountParsed) {
      toast.error("Invalid tree amount.");
      return;
    }
    setIsInvesting(true);
    try {
      await purchaseAsync({
        address: TREE_CONTRACT_ADDRESS,
        abi: TREE_CONTRACT_ABI,
        functionName: "purchaseBond", // or your function name
        args: [selectedFarmId, mbtAmountParsed],
      });
      setInvestSuccess(true);
      toast.success(`Investment successful!`);
    } catch (err: any) {
      toast.error("Investment failed: " + (err?.reason || err?.message));
    } finally {
      setIsInvesting(false);
    }
  }

  // UI helpers
  const mbtBalanceFormatted =
    parseFloat(mbtBalance.data?.formatted as string) || 0;
  const hasSufficientBalance = mbtBalanceFormatted >= requiredMBT;
  const canProceed =
    isConnected &&
    hasSufficientBalance &&
    !needsApproval &&
    !isInvestPending &&
    selectedFarmId !== undefined &&
    trees > 0;

  return (
    <div className={`fixed inset-0 z-50 bg-black/40 flex justify-center items-center ${!isOpen && "hidden"}`}>
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border-none p-6 text-gray-500 sm:max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold dark:text-white">Purchase Trees</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        {/* Investment Success */}
        {investSuccess ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <div className="text-2xl font-bold mb-2 dark:text-white">Investment Successful!</div>
            <div className="text-gray-600 dark:text-gray-300 mb-4">
              You invested in <strong>{trees}</strong> tree(s).
            </div>
            <Button className="w-full" onClick={onClose}>Close</Button>
          </div>
        ) : showSwap ? (
          /* Your swap UI as previously implemented here */
          <SwapToMBTSection
            fromToken={fromToken}
            setFromToken={setFromToken}
            amountUSD={trees * BONDPRICEUSD}
            address={address}
            onGoBack={() => setShowSwap(false)}
            /* ...swap props */
          />
        ) : (
          <div className="space-y-4 max-h-[calc(90vh-200px)] overflow-y-auto pt-2">
            {/* Balances, costs, etc */}
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Your MBT Balance</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{mbtBalanceFormatted} MBT</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">MBT per Tree</span>
                <span className="text-sm text-gray-700 dark:text-gray-200">{BONDMBT}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">USD per Tree</span>
                <span className="text-sm text-gray-700 dark:text-gray-200">{BONDPRICEUSD}</span>
              </div>
            </div>
            {/* Amount input */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Trees to invest in</span>
              <input
                type="number"
                min={1}
                value={trees}
                onChange={e => setTrees(Number(e.target.value))}
                className="w-16 border-gray-200 dark:border-gray-600 rounded text-center"
              />
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Total MBT Needed</span>
              <span className="font-bold">{requiredMBT} MBT</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Total Cost (USD)</span>
              <span className="font-bold">${trees * BONDPRICEUSD}</span>
            </div>
            {!hasSufficientBalance &&
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800 flex items-center mb-4">
                <AlertTriangle className="w-5 h-5 mr-2 text-red-600 dark:text-red-400" />
                <span className="text-red-600 dark:text-red-400 text-sm">
                  Insufficient MBT balance.
                </span>
                <Button
                  className="ml-auto bg-[#522912] hover:bg-[#6A4A36] rounded-full text-white py-1 px-4 text-xs"
                  onClick={() => setShowSwap(true)}
                >
                  Swap to MBT
                </Button>
              </div>
            }
            {hasSufficientBalance && needsApproval &&
              <Button
                className="w-full bg-yellow-500 text-white py-3 rounded-full mt-2"
                disabled={isApprovePending}
                onClick={handleApprove}
              >
                {isApprovePending ? "Approving..." : `Approve ${requiredMBT} MBT`}
              </Button>
            }
            {hasSufficientBalance && !needsApproval &&
              <Button
                className="w-full bg-[#522912] rounded-full hover:bg-[#6A4A36] text-white py-3 text-xs"
                disabled={isInvesting}
                onClick={handleInvest}
              >
                {isInvesting ? "Investing..." : `Invest in ${trees} tree(s)`}
              </Button>
            }
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
              <p className="mb-1"><strong>Important:</strong> By proceeding, you agree to:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Complete KYC/AML verification if required</li>
                <li>Receive digital Tree tokens upon successful payment</li>
                <li>Terms and conditions of the Tree purchase agreement</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
