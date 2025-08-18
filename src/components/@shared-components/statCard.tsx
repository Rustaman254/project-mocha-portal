import React from 'react';
import { Coffee, DollarSign, TrendingUp, LucideIcon } from 'lucide-react';

type IconName = 'Coffee' | 'DollarSign' | 'TrendingUp';

interface StatCardProps {
  title: string;
  value: string | number;
  isLoading?: boolean;
  iconColor?: 'green' | 'red' | 'yellow';
  icon?: IconName;
  compact?: boolean; // New prop for compact view
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  isLoading = false,
  iconColor = 'green',
  icon = 'Coffee',
  compact = false, // Default to false
}) => {
  const colorStyles: Record<
    NonNullable<StatCardProps['iconColor']>,
    { iconBg: string; iconColor: string }
  > = {
    green: {
      iconBg: 'bg-green-100 dark:bg-green-900',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    red: {
      iconBg: 'bg-red-100 dark:bg-red-900',
      iconColor: 'text-red-600 dark:text-red-400',
    },
    yellow: {
      iconBg: 'bg-yellow-100 dark:bg-yellow-900',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
    },
  };

  const selectedStyle = colorStyles[iconColor];

  const icons: Record<IconName, LucideIcon> = {
    Coffee,
    DollarSign,
    TrendingUp,
  };

  const IconComponent = icons[icon];

  // Responsive padding and sizing
  return (
    <div className={`
      border dark:border-gray-800 rounded-lg 
      ${compact ? 'p-2' : 'p-3 sm:p-4'} 
      bg-white dark:bg-gray-800
      w-full h-full
    `}>
      <div className="flex items-center mb-1 sm:mb-2">
        <div
          className={`
            ${compact ? 'w-6 h-6' : 'w-8 h-8'} 
            rounded-lg ${selectedStyle.iconBg} 
            flex items-center justify-center 
            ${compact ? 'mr-1' : 'mr-2'}
          `}
        >
          <IconComponent 
            className={`
              ${compact ? 'w-3 h-3' : 'w-4 h-4 sm:w-5 sm:h-5'} 
              ${selectedStyle.iconColor}
            `} 
          />
        </div>
        <div className={`
          ${compact ? 'text-xs' : 'text-sm sm:text-sm'} 
          font-extrabold text-gray-900 dark:text-white
          truncate
        `}>
          {title}
        </div>
      </div>
      <div className={`
        ${compact ? 'text-base mt-2' : 'text-xl mt-4 sm:mt-6'} 
        font-light text-gray-900 dark:text-white
        truncate
      `}>
        {isLoading ? (
          <span className="text-gray-400 dark:text-gray-500">...</span>
        ) : (
          value
        )}
      </div>
    </div>
  );
};

export default StatCard;