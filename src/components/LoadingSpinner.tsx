
import React from 'react';

interface LoadingSpinnerProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LoadingSpinner = ({ text = 'Loading...', size = 'md' }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-muted border-t-primary`}></div>
      {text && (
        <p className="text-muted-foreground text-sm font-medium">{text}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
