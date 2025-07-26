/**
 * Hook for managing toast notifications
 */
import { useState, useCallback } from 'react';
import { ToastProps } from '@/components/ui/Toast';

export interface ToastOptions {
  title?: string;
  message: string;
  type?: ToastProps['type'];
  duration?: number;
  position?: ToastProps['position'];
}

export interface Toast extends ToastOptions {
  id: string;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = {
      id,
      ...options,
    };

    setToasts((prev) => [...prev, toast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const toast = {
    success: (message: string, options?: Omit<ToastOptions, 'message' | 'type'>) =>
      addToast({ ...options, message, type: 'success' }),
    
    error: (message: string, options?: Omit<ToastOptions, 'message' | 'type'>) =>
      addToast({ ...options, message, type: 'error' }),
    
    warning: (message: string, options?: Omit<ToastOptions, 'message' | 'type'>) =>
      addToast({ ...options, message, type: 'warning' }),
    
    info: (message: string, options?: Omit<ToastOptions, 'message' | 'type'>) =>
      addToast({ ...options, message, type: 'info' }),
  };

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    toast,
  };
};