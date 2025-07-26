/**
 * Skeleton component for loading states
 */
import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ 
    className, 
    variant = 'rectangular', 
    width, 
    height, 
    lines = 1,
    ...props 
  }, ref) => {
    const baseClasses = 'animate-pulse bg-gray-200';

    const variantClasses = {
      text: 'rounded',
      circular: 'rounded-full',
      rectangular: 'rounded-md'
    };

    const getDefaultDimensions = () => {
      switch (variant) {
        case 'text':
          return { width: '100%', height: '1rem' };
        case 'circular':
          return { width: '2.5rem', height: '2.5rem' };
        case 'rectangular':
          return { width: '100%', height: '2rem' };
        default:
          return {};
      }
    };

    const defaultDimensions = getDefaultDimensions();
    const style = {
      width: width ?? defaultDimensions.width,
      height: height ?? defaultDimensions.height,
    };

    // For text variant with multiple lines
    if (variant === 'text' && lines > 1) {
      return (
        <div ref={ref} className={cn('space-y-2', className)} {...props}>
          {Array.from({ length: lines }).map((_, index) => (
            <div
              key={index}
              className={cn(
                baseClasses,
                variantClasses[variant],
                index === lines - 1 && 'w-3/4' // Last line is shorter
              )}
              style={{
                width: index === lines - 1 ? '75%' : width ?? defaultDimensions.width,
                height: height ?? defaultDimensions.height,
              }}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          className
        )}
        style={style}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

export { Skeleton };