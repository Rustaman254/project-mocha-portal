// QuickActions.jsx
import { useState } from "react";
import { SwapToMBTComponent } from "./swapToMBT";
import { Button } from "@/components/ui/button";

// --- Redeem MBT action as a subcomponent ---
function RedeemMBTAction() {
  const [mbtMatured, setMbtMatured] = useState(true); // Replace logic with contract maturity check
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState("");

  const handleRedeem = async () => {
    setIsRedeeming(true);
    // Replace with actual redeem logic (on-chain/backend)
    setTimeout(() => {
      setIsRedeeming(false);
      setRedeemResult("MBT successfully redeemed!");
    }, 2000); // simulate async
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          Redeem MBT (2/2)
        </span>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        {mbtMatured
          ? "Your MBT tokens have matured and are eligible for redemption."
          : "No matured MBT available for redemption."}
      </div>
      <Button
        className="w-full bg-[#522912] rounded-full hover:bg-[#6A4A36] text-white py-2 text-md"
        disabled={!mbtMatured || isRedeeming}
        onClick={handleRedeem}
      >
        {isRedeeming ? "Redeeming..." : "Redeem MBT"}
      </Button>
      {redeemResult && (
        <div className="mt-2 text-green-600 dark:text-green-400 text-sm text-center">
          {redeemResult}
        </div>
      )}
    </div>
  );
}

// --- MAIN QUICK ACTIONS COMPONENT ---
export function QuickActions() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 space-y-6 border dark:border-gray-700 w-full max-w-lg">
      <div className="flex justify-between items-center mb-3">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
          QUICK ACTIONS
        </div>
      </div>
      {/* MBT swap component */}
      <SwapToMBTComponent />
      {/* Redeem MBT after maturity */}
      <RedeemMBTAction />
      {/* You can add more quick actions here as new <div className="..."/> blocks */}
    </div>
  );
}
