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

function useSwapTokens(functionName: string, args: any[], value: bigint | undefined) {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  async function swap() {
    await writeContract({
      address: ICO_ADDRESS,
      abi: ICO_ABI,
      functionName,
      args,
      ...(value ? { value } : {}), // Include value only for ETH
    });
  }

  return { swap, hash, error, isPending, isConfirming, isConfirmed };
}

export { usePreviewTokenPurchase, useSwapTokens };