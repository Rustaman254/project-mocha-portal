import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useBalance } from 'wagmi';

interface ConnectWalletButtonProps {
  label: string;
  userName?: string;
  onConnect?: () => void;
}

export function ConnectWalletButton({
  label,
  userName,
  onConnect,
}: ConnectWalletButtonProps) {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { data: balanceData } = useBalance({
    address: address as `0x${string}`,
    query: { enabled: isConnected },
  });
  const [randomColor, setRandomColor] = useState('');

  useEffect(() => {
    if (address) {
      const colors = [
        '#EF4444', // Red
        '#F59E0B', // Amber
        '#10B981', // Green
        '#3B82F6', // Blue
        '#6366F1', // Indigo
        '#8B5CF6', // Violet
        '#EC4899', // Pink
      ];
      const hash = Array.from(address).reduce(
        (acc, char) => acc + char.charCodeAt(0),
        0
      );
      setRandomColor(colors[hash % colors.length]);
    }
  }, [address]);

  const displayName =
    userName ||
    (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '');
  const balance = balanceData
    ? `${balanceData.formatted} ${balanceData.symbol}`
    : '0';

  // Rectangle but with rounded edges (md works well)
  const sharedStyles =
    'bg-[#522912] text-white font-medium rounded-md px-6 py-3 shadow-md hover:shadow-lg transition-shadow duration-300 ease-in-out flex items-center justify-center';

  if (!isConnected) {
    return (
      <Button
        className={sharedStyles}
        onClick={() => {
          if (onConnect) {
            onConnect();
          } else {
            open();
          }
        }}
      >
        {label}
      </Button>
    );
  }

  return (
    <div
      className={`${sharedStyles} space-x-3 bg-[#1c1c1c] dark:bg-[#1c1c1c] light:bg-white`}
    >
      <Avatar className="h-10 w-10 border-2 border-white/20">
        <AvatarFallback style={{ backgroundColor: randomColor }}>
          {displayName[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col text-sm">
        <span className="font-semibold truncate max-w-[150px]">
          {displayName}
        </span>
        <span className="text-white/80">Balance: {balance}</span>
      </div>
    </div>
  );
}
