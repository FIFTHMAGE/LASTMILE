/**
 * Avatar component for user profile pictures and initials
 */
import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  shape?: 'circle' | 'square';
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ 
    className, 
    src, 
    alt, 
    size = 'md', 
    fallback, 
    shape = 'circle',
    ...props 
  }, ref) => {
    const sizeClasses = {
      xs: 'w-6 h-6 text-xs',
      sm: 'w-8 h-8 text-sm',
      md: 'w-10 h-10 text-base',
      lg: 'w-12 h-12 text-lg',
      xl: 'w-16 h-16 text-xl'
    };

    const shapeClasses = {
      circle: 'rounded-full',
      square: 'rounded-md'
    };

    const baseClasses = [
      'inline-flex items-center justify-center font-medium bg-gray-100 text-gray-600 overflow-hidden',
      sizeClasses[size],
      shapeClasses[shape]
    ];

    // Generate initials from fallback text
    const getInitials = (text: string): string => {
      return text
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    return (
      <div
        ref={ref}
        className={cn(baseClasses, className)}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt={alt || 'Avatar'}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Hide image on error and show fallback
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <span className="select-none">
            {fallback ? getInitials(fallback) : '?'}
          </span>
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export { Avatar };