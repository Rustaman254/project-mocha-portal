import React from 'react';
import { Coffee, DollarSign, TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';

type IconName = 'Coffee' | 'DollarSign' | 'TrendingUp';

interface StatCardProps {
  title: string;
  value: string | number;
  isLoading?: boolean;
  iconColor?: 'green' | 'red' | 'yellow';
  icon?: IconName;
  compact?: boolean;
  // New optional props for the enhanced design
  trend?: {
    value: string;
    isPositive: boolean;
  };
  footerLine1?: string;
  footerLine2?: string;
  footerIcon?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  isLoading = false,
  iconColor = 'green',
  icon = 'Coffee',
  compact = false,
  trend,
  footerLine1,
  footerLine2,
  footerIcon,
}) => {
  const colorStyles: Record<
    NonNullable<StatCardProps['iconColor']>,
    { iconBg: string; iconColor: string; badge: string }
  > = {
    green: {
      iconBg: 'bg-green-100 dark:bg-green-900',
      iconColor: 'text-green-600 dark:text-green-400',
      badge: 'border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
    },
    red: {
      iconBg: 'bg-red-100 dark:bg-red-900',
      iconColor: 'text-red-600 dark:text-red-400',
      badge: 'border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
    },
    yellow: {
      iconBg: 'bg-yellow-100 dark:bg-yellow-900',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      badge: 'border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
    },
  };

  const selectedStyle = colorStyles[iconColor];

  const icons: Record<IconName, LucideIcon> = {
    Coffee,
    DollarSign,
    TrendingUp,
  };

  const IconComponent = icons[icon];

  return (
    <div className={`
      border dark:border-gray-800 rounded-lg 
      ${compact ? 'p-2' : 'p-4'} 
      bg-white dark:bg-gray-800
      w-full h-full relative
    `}>
      {/* Trend badge in top right corner */}
      {trend && (
        <div className={`absolute top-3 right-3 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${selectedStyle.badge}`}>
          {trend.isPositive ? (
            <TrendingUp className="h-3 w-3 mr-1" />
          ) : (
            <TrendingDown className="h-3 w-3 mr-1" />
          )}
          {trend.value}
        </div>
      )}
      
      {/* Header section */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
          {title}
        </div>
        <div className={`
          ${compact ? 'text-xl' : 'text-2xl font-semibold tabular-nums'} 
          text-gray-900 dark:text-white
        `}>
          {isLoading ? (
            <span className="text-gray-400 dark:text-gray-500">...</span>
          ) : (
            value
          )}
        </div>
      </div>

      {/* Footer section - optional */}
      {(footerLine1 || footerLine2) && (
        <div className="flex flex-col items-start gap-1.5 text-sm pt-4">
          {footerLine1 && (
            <div className="line-clamp-1 flex gap-2 font-medium text-gray-900 dark:text-white">
              {footerLine1} {footerIcon}
            </div>
          )}
          {footerLine2 && (
            <div className="text-gray-500 dark:text-gray-400">
              {footerLine2}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;