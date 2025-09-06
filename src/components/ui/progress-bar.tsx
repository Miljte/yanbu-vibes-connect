import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'gradient' | 'striped' | 'glow';
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  animated?: boolean;
  showValue?: boolean;
  label?: string;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  color = 'primary',
  animated = false,
  showValue = false,
  label,
  className
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
    xl: 'h-4'
  };

  const colorClasses = {
    primary: {
      gradient: 'from-primary via-primary-light to-accent-vibrant',
      solid: 'bg-primary',
      glow: 'shadow-[0_0_10px_rgba(99,102,241,0.5)]'
    },
    success: {
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      solid: 'bg-green-500',
      glow: 'shadow-[0_0_10px_rgba(34,197,94,0.5)]'
    },
    warning: {
      gradient: 'from-yellow-500 via-orange-500 to-red-500',
      solid: 'bg-yellow-500',
      glow: 'shadow-[0_0_10px_rgba(245,158,11,0.5)]'
    },
    danger: {
      gradient: 'from-red-500 via-pink-500 to-rose-500',
      solid: 'bg-red-500',
      glow: 'shadow-[0_0_10px_rgba(239,68,68,0.5)]'
    },
    info: {
      gradient: 'from-blue-500 via-indigo-500 to-purple-500',
      solid: 'bg-blue-500',
      glow: 'shadow-[0_0_10px_rgba(59,130,246,0.5)]'
    }
  };

  const getProgressClasses = () => {
    const baseClasses = cn(
      "h-full transition-all duration-500 ease-smooth rounded-full",
      animated && "animate-pulse"
    );

    switch (variant) {
      case 'gradient':
        return cn(
          baseClasses,
          `bg-gradient-to-r ${colorClasses[color].gradient}`,
          "relative overflow-hidden"
        );
      case 'striped':
        return cn(
          baseClasses,
          colorClasses[color].solid,
          "bg-[length:20px_20px] bg-gradient-to-r from-transparent via-white/20 to-transparent",
          animated && "animate-[stripe_1s_linear_infinite]"
        );
      case 'glow':
        return cn(
          baseClasses,
          `bg-gradient-to-r ${colorClasses[color].gradient}`,
          colorClasses[color].glow
        );
      default:
        return cn(baseClasses, colorClasses[color].solid);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Label */}
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {showValue && (
            <span className="text-sm text-muted-foreground">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}

      {/* Progress Bar Container */}
      <div className={cn(
        "w-full bg-muted/30 rounded-full overflow-hidden",
        sizeClasses[size],
        "relative"
      )}>
        {/* Progress Fill */}
        <div
          className={getProgressClasses()}
          style={{ width: `${percentage}%` }}
        >
          {/* Shine effect for gradient variant */}
          {variant === 'gradient' && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-[shine_2s_ease-in-out_infinite]" />
          )}
        </div>

        {/* Pulse effect overlay */}
        {animated && variant !== 'striped' && (
          <div 
            className="absolute top-0 left-0 h-full bg-white/20 rounded-full animate-pulse"
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>

      {/* Value below bar */}
      {showValue && !label && (
        <div className="mt-1 text-right">
          <span className="text-xs text-muted-foreground">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
};

export { ProgressBar };
