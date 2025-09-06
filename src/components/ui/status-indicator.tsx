import React from 'react';
import { cn } from '@/lib/utils';

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'busy' | 'away' | 'idle';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  showLabel?: boolean;
  className?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'md',
  animated = true,
  showLabel = false,
  className
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const statusConfig = {
    online: {
      color: 'bg-green-500',
      glowColor: 'shadow-[0_0_10px_rgba(34,197,94,0.6)]',
      label: 'Online',
      animated: 'animate-pulse-gps'
    },
    offline: {
      color: 'bg-gray-400',
      glowColor: 'shadow-[0_0_5px_rgba(156,163,175,0.4)]',
      label: 'Offline',
      animated: ''
    },
    busy: {
      color: 'bg-red-500',
      glowColor: 'shadow-[0_0_10px_rgba(239,68,68,0.6)]',
      label: 'Busy',
      animated: 'animate-pulse'
    },
    away: {
      color: 'bg-yellow-500',
      glowColor: 'shadow-[0_0_10px_rgba(245,158,11,0.6)]',
      label: 'Away',
      animated: 'animate-breath'
    },
    idle: {
      color: 'bg-orange-500',
      glowColor: 'shadow-[0_0_8px_rgba(249,115,22,0.6)]',
      label: 'Idle',
      animated: 'animate-bounce-soft'
    }
  };

  const config = statusConfig[status];

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="relative">
        <div
          className={cn(
            "rounded-full border-2 border-white dark:border-gray-800",
            sizeClasses[size],
            config.color,
            animated && config.animated,
            config.glowColor
          )}
        />
        {/* Ripple effect for online status */}
        {status === 'online' && animated && (
          <div className={cn(
            "absolute inset-0 rounded-full border-2 border-green-500 opacity-30 animate-ripple",
            sizeClasses[size]
          )} />
        )}
      </div>
      
      {showLabel && (
        <span className={cn(
          "font-medium text-muted-foreground",
          labelSizeClasses[size]
        )}>
          {config.label}
        </span>
      )}
    </div>
  );
};

export { StatusIndicator };
