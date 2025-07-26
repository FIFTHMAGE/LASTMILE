/**
 * Toast provider for managing global toast notifications
 */
'use client';

import React, { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Toast, ToastContainer } from '@/components/ui/Toast';
import { useToast, ToastOptions } from '@/hooks/useToast';

interface ToastContextValue {
  addToast: (options: ToastOptions) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  toast: {
    success: (message: string, options?: Omit<ToastOptions, 'message' | 'type'>) => string;
    error: (message: string, options?: Omit<ToastOptions, 'message' | 'type'>) => string;
    warning: (message: string, options?: Omit<ToastOptions, 'message' | 'type'>) => string;
    info: (message: string, options?: Omit<ToastOptions, 'message' | 'type'>) => string;
  };
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ 
  children, 
  position = 'top-right' 
}) => {
  const { toasts, addToast, removeToast, clearAllToasts, toast } = useToast();

  const contextValue: ToastContextValue = {
    addToast,
    removeToast,
    clearAllToasts,
    toast,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {typeof window !== 'undefined' && createPortal(
        <ToastContainer position={position}>
          {toasts.map((toastItem) => (
            <Toast
              key={toastItem.id}
              id={toastItem.id}
              title={toastItem.title}
              message={toastItem.message}
              type={toastItem.type}
              duration={toastItem.duration}
              position={position}
              onClose={removeToast}
            />
          ))}
        </ToastContainer>,
        document.body
      )}
    </ToastContext.Provider>
  );
};