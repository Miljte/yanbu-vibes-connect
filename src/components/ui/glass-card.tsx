import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'floating' | 'elevated' | 'minimal';
  blur?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  glow?: boolean;
  interactive?: boolean;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ 
    children, 
    className, 
    variant = 'default', 
    blur = 'md', 
    glow = false, 
    interactive = false,
    ...props 
  }, ref) => {
    const variantClasses = {
      default: 'bg-card/90 border border-border/50',
      floating: 'bg-gradient-to-r from-card/80 via-card/90 to-card/80 border border-border/30 shadow-glass-lg',
      elevated: 'bg-card/95 border border-border/60 shadow-modern-xl',
      minimal: 'bg-card/60 border border-border/30'
    };

    const blurClasses = {
      none: '',
      sm: 'backdrop-blur-sm',
      md: 'backdrop-blur-md',
      lg: 'backdrop-blur-lg',
      xl: 'backdrop-blur-xl'
    };

    const glowClasses = glow ? 'shadow-glow hover:shadow-glow-lg' : '';

    const interactiveClasses = interactive 
      ? 'hover:-translate-y-2 hover:scale-[1.02] cursor-pointer transition-all duration-400 ease-smooth' 
      : 'transition-all duration-300';

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          "relative rounded-2xl overflow-hidden",
          
          // Variant styles
          variantClasses[variant],
          
          // Blur effect
          blurClasses[blur],
          
          // Interactive effects
          interactiveClasses,
          
          // Glow effect
          glowClasses,
          
          // Glass morphism background overlay
          variant === 'floating' && "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/5 before:via-transparent before:to-white/5 before:pointer-events-none",
          
          // Border highlight on hover
          interactive && "hover:border-border/80",
          
          className
        )}
        {...props}
      >
        {/* Glass reflection effect */}
        {variant === 'floating' && (
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-30 pointer-events-none" />
        )}
        
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
        
        {/* Interactive shine effect */}
        {interactive && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
        )}
      </div>
    );
  }
);

GlassCard.displayName = "GlassCard";

export { GlassCard };
