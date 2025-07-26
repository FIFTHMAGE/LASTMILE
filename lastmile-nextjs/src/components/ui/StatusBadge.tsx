/**
 * StatusBadge component specifically for delivery and offer statuses
 */
import React from 'react';
import { Badge, BadgeProps } from './Badge';

export type DeliveryStatus = 
  | 'pending' 
  | 'accepted' 
  | 'picked_up' 
  | 'in_transit' 
  | 'delivered' 
  | 'completed' 
  | 'cancelled';

export type PaymentStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled' 
  | 'refunded';

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  status: DeliveryStatus | PaymentStatus;
  type?: 'delivery' | 'payment';
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, type = 'delivery', ...props }, ref) => {
    const getVariantForDeliveryStatus = (status: DeliveryStatus): BadgeProps['variant'] => {
      switch (status) {
        case 'pending':
          return 'warning';
        case 'accepted':
          return 'info';
        case 'picked_up':
          return 'info';
        case 'in_transit':
          return 'info';
        case 'delivered':
          return 'success';
        case 'completed':
          return 'success';
        case 'cancelled':
          return 'error';
        default:
          return 'default';
      }
    };

    const getVariantForPaymentStatus = (status: PaymentStatus): BadgeProps['variant'] => {
      switch (status) {
        case 'pending':
          return 'warning';
        case 'processing':
          return 'info';
        case 'completed':
          return 'success';
        case 'failed':
          return 'error';
        case 'cancelled':
          return 'error';
        case 'refunded':
          return 'secondary';
        default:
          return 'default';
      }
    };

    const getStatusLabel = (status: string): string => {
      return status
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    const variant = type === 'delivery' 
      ? getVariantForDeliveryStatus(status as DeliveryStatus)
      : getVariantForPaymentStatus(status as PaymentStatus);

    return (
      <Badge
        ref={ref}
        variant={variant}
        {...props}
      >
        {getStatusLabel(status)}
      </Badge>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

export { StatusBadge };