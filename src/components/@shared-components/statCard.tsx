import React from 'react';
import { Coffee, DollarSign, TrendingUp, LucideIcon } from 'lucide-react';

type IconName = 'Coffee' | 'DollarSign' | 'TrendingUp';

interface StatCardProps {
  title: string;
  value: string | number;
  isLoading?: boolean;
  iconColor?: 'green' | 'red' | 'yellow';
  icon?: IconName;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  isLoading = false,
  iconColor = 'green',
  icon = 'Coffee',
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

  return (
    <div className="border dark:border-gray-800 rounded-lg p-4 bg-white dark:bg-gray-800">
      <div className="flex items-center mb-2">
        <div
          className={`w-8 h-8 rounded-lg ${selectedStyle.iconBg} flex items-center justify-center mr-2`}
        >
          <IconComponent className={`w-5 h-5 ${selectedStyle.iconColor}`} />
        </div>
        <div className="text-sm font-extrabold text-gray-900 dark:text-white">
          {title}
        </div>
      </div>
      <div className="text-xl mt-6 font-light text-gray-900 dark:text-white">
        {isLoading ? (
          <span className="text-gray-400 dark:text-gray-500">Loading...</span>
        ) : (
          value
        )}
      </div>
    </div>
  );
};

export default StatCard;
