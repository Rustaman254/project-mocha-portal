import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ICO_ADDRESS, ICO_ABI } from '@/config/constants';

function usePreviewTokenPurchase(paymentMethod: string, amount: bigint) {
  // Wagmi hook
  const result = useReadContract({
    address: ICO_ADDRESS,
    abi: ICO_ABI,
    functionName: "previewTokenPurchase",
    args: [paymentMethod, amount],
    query: {
      enabled: !!paymentMethod && amount > BigInt(0),
    },
  });

  return {
    ...result,
    data: Array.isArray(result.data) && result.data.length === 2
      ? result.data as [bigint, bigint]
      : [BigInt(0), BigInt(0)] as [bigint, bigint],
  };
}

// Minimal ERC20 ABI for approval and balance checks
const ERC20_MIN_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
];

function useSwapTokens(functionName: string, args: any[], value?: bigint | undefined, erc20TokenAddress?: `0x${string}`) {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  async function swap() {
    console.group("useSwapTokens");
    try {
      console.log("swap params", {
        icoAddress: ICO_ADDRESS,
        functionName,
        args,
        valueIncluded: value !== undefined && value > 0,
        value: value !== undefined ? value.toString() : undefined,
        erc20TokenAddress,
      });

      // If ERC20 token is specified (e.g., USDC/SCR), approve spending first
      if (erc20TokenAddress) {
        const amountArg = args?.[0] as bigint | undefined; // expected to be _amount
        if (!amountArg || amountArg <= BigInt(0)) {
          console.warn("Approval skipped: invalid amount", { amountArg });
        } else {
          console.group("erc20.approve");
          console.log("approve params", {
            token: erc20TokenAddress,
            spender: ICO_ADDRESS,
            amount: amountArg.toString(),
          });
          try {
            const approveHash = await writeContract({
              address: erc20TokenAddress,
              abi: ERC20_MIN_ABI as any,
              functionName: 'approve',
              args: [ICO_ADDRESS, amountArg],
            });
            console.log("approve tx hash", approveHash);
          } catch (approveErr) {
            console.error("approve error", approveErr);
            throw approveErr;
          } finally {
            console.groupEnd();
          }
        }
      }

      const result = await writeContract({
        address: ICO_ADDRESS,
        abi: ICO_ABI,
        functionName,
        args,
        ...(value !== undefined && value > 0 ? { value } : {}), // Include value only for ETH
      });

      console.log("swap writeContract returned", result);
      console.log("hook hash state", hash);
    } catch (err) {
      console.error("swap error", err);
      throw err;
    } finally {
      console.groupEnd();
    }
  }

  return { swap, hash, error, isPending, isConfirming, isConfirmed };
}

export { usePreviewTokenPurchase, useSwapTokens };