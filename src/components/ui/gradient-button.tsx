import React from 'react';
import { cn } from '@/lib/utils';
import { ButtonProps } from '@/components/ui/button';

interface GradientButtonProps extends Omit<ButtonProps, 'variant'> {
  gradient?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  glow?: boolean;
  floating?: boolean;
}

const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, gradient = 'primary', glow = false, floating = false, children, ...props }, ref) => {
    const gradientClasses = {
      primary: 'bg-gradient-to-r from-primary via-primary-light to-accent-vibrant hover:from-primary/90 hover:via-primary-light/90 hover:to-accent-vibrant/90',
      secondary: 'bg-gradient-to-r from-muted via-muted-light to-secondary hover:from-muted/90 hover:via-muted-light/90 hover:to-secondary/90',
      success: 'bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600',
      warning: 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-600 hover:via-orange-600 hover:to-red-600',
      danger: 'bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 hover:from-red-600 hover:via-pink-600 hover:to-rose-600',
      info: 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600'
    };

    const glowClasses = {
      primary: 'shadow-glow hover:shadow-glow-lg',
      secondary: 'shadow-modern hover:shadow-modern-lg',
      success: 'shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_40px_rgba(34,197,94,0.6)]',
      warning: 'shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_40px_rgba(245,158,11,0.6)]',
      danger: 'shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_40px_rgba(239,68,68,0.6)]',
      info: 'shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_40px_rgba(59,130,246,0.6)]'
    };

    return (
      <button
        className={cn(
          // Base styles
          "relative inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium text-white border-0 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          
          // Size
          "h-10 px-6 py-2",
          
          // Gradient
          gradientClasses[gradient],
          
          // Hover effects
          "hover:scale-105 active:scale-95",
          
          // Floating effect
          floating && "hover:-translate-y-1",
          
          // Glow effect
          glow && glowClasses[gradient],
          
          // Glass morphism overlay
          "before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-r before:from-white/10 before:via-white/5 before:to-white/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
          
          // Border glow
          "after:absolute after:inset-0 after:rounded-xl after:border after:border-white/20 after:transition-opacity after:duration-300 hover:after:border-white/40",
          
          className
        )}
        ref={ref}
        {...props}
      >
        <span className="relative z-10">
          {children}
        </span>
      </button>
    );
  }
);

GradientButton.displayName = "GradientButton";

export { GradientButton };
