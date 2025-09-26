/**
 * Glass Panel UI Components - Mobile-Optimized
 * Based on ORION-CORE "nebula" design system
 * Optimized for touch interactions and mobile performance
 */

import React from 'react';
import { cn } from '@/lib/utils';

// Glass Panel Base Component
interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'card' | 'nav' | 'input';
  blur?: 'sm' | 'md' | 'lg';
  opacity?: 'low' | 'medium' | 'high';
}

export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, variant = 'default', blur = 'md', opacity = 'medium', ...props }, ref) => {
    const baseClasses = 'relative border border-white/10 rounded-lg';
    
    const variantClasses = {
      default: 'bg-white/5 backdrop-blur-sm',
      card: 'bg-white/5 backdrop-blur-md border-white/20',
      nav: 'bg-white/10 backdrop-blur-lg border-white/20 sticky top-0 z-50',
      input: 'bg-white/5 backdrop-blur-sm border-white/15'
    };

    const blurClasses = {
      sm: 'backdrop-blur-sm',
      md: 'backdrop-blur-md', 
      lg: 'backdrop-blur-lg'
    };

    const opacityClasses = {
      low: 'bg-white/3',
      medium: 'bg-white/5',
      high: 'bg-white/10'
    };

    // Mobile optimizations
    const mobileOptimizations = 'touch-manipulation select-none';
    
    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          blurClasses[blur],
          opacityClasses[opacity],
          mobileOptimizations,
          className
        )}
        {...props}
      />
    );
  }
);
GlassPanel.displayName = 'GlassPanel';

// Glass Button Component
interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const baseClasses = 'relative inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variantClasses = {
      default: 'bg-white/10 hover:bg-white/15 text-white border border-white/20 backdrop-blur-md',
      primary: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-100 border border-blue-400/30 backdrop-blur-md',
      secondary: 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-100 border border-purple-400/30 backdrop-blur-md',
      ghost: 'hover:bg-white/10 text-white/80 hover:text-white'
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm min-h-[36px]', // Mobile touch target
      md: 'px-4 py-2 text-sm min-h-[44px]',   // Recommended mobile touch target
      lg: 'px-6 py-3 text-base min-h-[48px]'  // Large touch target
    };

    // Mobile optimizations
    const mobileOptimizations = 'touch-manipulation select-none';

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          mobileOptimizations,
          className
        )}
        {...props}
      />
    );
  }
);
GlassButton.displayName = 'GlassButton';

// Glass Input Component
interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'search' | 'chat';
}

export const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const baseClasses = 'w-full rounded-lg border bg-white/5 backdrop-blur-sm px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200';
    
    const variantClasses = {
      default: 'border-white/15 focus:bg-white/10',
      search: 'border-white/20 focus:bg-white/10 pl-10', // Space for search icon
      chat: 'border-white/15 focus:bg-white/10 min-h-[44px] resize-none' // Chat input styling
    };

    // Mobile optimizations
    const mobileOptimizations = 'touch-manipulation text-base'; // Prevent zoom on iOS

    return (
      <input
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          mobileOptimizations,
          className
        )}
        {...props}
      />
    );
  }
);
GlassInput.displayName = 'GlassInput';

// Glass Textarea Component
interface GlassTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'chat';
}

export const GlassTextarea = React.forwardRef<HTMLTextAreaElement, GlassTextareaProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const baseClasses = 'w-full rounded-lg border bg-white/5 backdrop-blur-sm px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200 resize-none';
    
    const variantClasses = {
      default: 'border-white/15 focus:bg-white/10',
      chat: 'border-white/15 focus:bg-white/10 min-h-[44px]'
    };

    // Mobile optimizations
    const mobileOptimizations = 'touch-manipulation text-base'; // Prevent zoom on iOS

    return (
      <textarea
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          mobileOptimizations,
          className
        )}
        {...props}
      />
    );
  }
);
GlassTextarea.displayName = 'GlassTextarea';

// Glass Card Component
interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive';
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const baseClasses = 'rounded-lg border backdrop-blur-md transition-all duration-200';
    
    const variantClasses = {
      default: 'bg-white/5 border-white/10 p-4',
      elevated: 'bg-white/10 border-white/20 p-6 shadow-lg shadow-black/20',
      interactive: 'bg-white/5 border-white/10 p-4 hover:bg-white/10 hover:border-white/20 cursor-pointer active:scale-98'
    };

    // Mobile optimizations
    const mobileOptimizations = 'touch-manipulation';

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          mobileOptimizations,
          className
        )}
        {...props}
      />
    );
  }
);
GlassCard.displayName = 'GlassCard';

// Status Indicator Component
interface StatusIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  status: 'online' | 'warning' | 'error' | 'loading';
  label?: string;
  showPulse?: boolean;
}

export const StatusIndicator = React.forwardRef<HTMLDivElement, StatusIndicatorProps>(
  ({ className, status, label, showPulse = true, ...props }, ref) => {
    const statusClasses = {
      online: 'bg-green-400',
      warning: 'bg-yellow-400', 
      error: 'bg-red-400',
      loading: 'bg-blue-400'
    };

    const pulseClasses = showPulse ? {
      online: 'animate-pulse',
      warning: 'animate-pulse',
      error: 'animate-pulse', 
      loading: 'animate-spin'
    } : {};

    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-2', className)}
        {...props}
      >
        <div 
          className={cn(
            'w-2 h-2 rounded-full',
            statusClasses[status],
            showPulse && pulseClasses[status]
          )}
        />
        {label && (
          <span className="text-sm font-medium text-white/80">
            {label}
          </span>
        )}
      </div>
    );
  }
);
StatusIndicator.displayName = 'StatusIndicator';

// Nebula Background Component
interface NebulaBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'chat' | 'dashboard';
}

export const NebulaBackground = React.forwardRef<HTMLDivElement, NebulaBackgroundProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const backgroundStyles = {
      default: 'bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900',
      chat: 'bg-[radial-gradient(ellipse_800px_600px_at_top_center,rgba(30,144,255,0.12)_0%,transparent_50%),radial-gradient(ellipse_600px_400px_at_bottom_left,rgba(121,134,203,0.08)_0%,transparent_50%),radial-gradient(ellipse_600px_400px_at_bottom_right,rgba(100,181,246,0.08)_0%,transparent_50%),linear-gradient(135deg,#0a0f1c_0%,#1a2332_50%,#2d4a6b_100%)]',
      dashboard: 'bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900'
    };

    return (
      <div
        ref={ref}
        className={cn(
          'min-h-screen relative',
          backgroundStyles[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
NebulaBackground.displayName = 'NebulaBackground';

// Export all components
export {
  type GlassPanelProps,
  type GlassButtonProps,
  type GlassInputProps,
  type GlassTextareaProps,
  type GlassCardProps,
  type StatusIndicatorProps,
  type NebulaBackgroundProps
};
