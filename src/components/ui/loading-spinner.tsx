import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'gradient' | 'pulse' | 'dots';
  className?: string;
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'default',
  className,
  text
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  if (variant === 'dots') {
    return (
      <div className={cn("flex items-center justify-center space-x-2", className)}>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-primary-light rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-accent-vibrant rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
        {text && (
          <span className={cn("text-muted-foreground font-medium", textSizeClasses[size])}>
            {text}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={cn("flex flex-col items-center justify-center space-y-3", className)}>
        <div className={cn(
          "rounded-full bg-gradient-to-r from-primary to-accent-vibrant animate-pulse",
          sizeClasses[size]
        )} />
        {text && (
          <span className={cn("text-muted-foreground font-medium animate-pulse", textSizeClasses[size])}>
            {text}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'gradient') {
    return (
      <div className={cn("flex flex-col items-center justify-center space-y-3", className)}>
        <div className="relative">
          <div className={cn(
            "border-4 border-primary/20 rounded-full animate-spin",
            sizeClasses[size]
          )} style={{
            borderTopColor: 'hsl(var(--primary))',
            borderRightColor: 'hsl(var(--primary-light))',
            borderBottomColor: 'hsl(var(--accent-vibrant))',
            borderLeftColor: 'transparent'
          }} />
          <div className={cn(
            "absolute inset-0 border-4 border-transparent rounded-full animate-spin",
            sizeClasses[size]
          )} style={{
            borderTopColor: 'hsl(var(--accent-vibrant))',
            animationDirection: 'reverse',
            animationDuration: '1.5s'
          }} />
        </div>
        {text && (
          <span className={cn("text-muted-foreground font-medium", textSizeClasses[size])}>
            {text}
          </span>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("flex flex-col items-center justify-center space-y-3", className)}>
      <div className={cn(
        "border-4 border-primary/20 border-t-primary rounded-full animate-spin",
        sizeClasses[size]
      )} />
      {text && (
        <span className={cn("text-muted-foreground font-medium", textSizeClasses[size])}>
          {text}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;
