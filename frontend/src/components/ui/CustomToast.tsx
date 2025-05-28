'use client';

import React from 'react';
import { Toaster as Sonner, toast as sonnerToast } from 'sonner';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';

interface ToasterProps {
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  expand?: boolean;
  richColors?: boolean;
  duration?: number;
  closeButton?: boolean;
}

export function Toaster({ 
  position = 'top-right',
  expand = false,
  richColors = true,
  duration = 4000,
  closeButton = true,
  ...props 
}: ToasterProps) {
  return (
    <Sonner
      position={position}
      expand={expand}
      richColors={richColors}
      duration={duration}
      closeButton={closeButton}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: cn(
            'group toast group-[.toaster]:bg-toast group-[.toaster]:text-primary',
            'group-[.toaster]:border group-[.toaster]:border-toast',
            'group-[.toaster]:shadow-toast group-[.toaster]:pointer-events-auto'
          ),
          title: 'group-[.toast]:text-primary group-[.toast]:font-semibold',
          description: 'group-[.toast]:text-secondary',
          actionButton: cn(
            'group-[.toast]:bg-interactive-primary group-[.toast]:text-btn-primary',
            'group-[.toast]:hover:bg-interactive-primary-hover'
          ),
          cancelButton: cn(
            'group-[.toast]:bg-card-content group-[.toast]:text-secondary',
            'group-[.toast]:hover:bg-card-hover'
          ),
          closeButton: cn(
            'group-[.toast]:bg-transparent group-[.toast]:border-0',
            'group-[.toast]:hover:bg-card-content group-[.toast]:text-secondary'
          ),
          success: cn(
            'group-[.toaster]:bg-success group-[.toaster]:text-success',
            'group-[.toaster]:border-success'
          ),
          error: cn(
            'group-[.toaster]:bg-error group-[.toaster]:text-error',
            'group-[.toaster]:border-error'
          ),
          warning: cn(
            'group-[.toaster]:bg-warning group-[.toaster]:text-warning',
            'group-[.toaster]:border-warning'
          ),
          info: cn(
            'group-[.toaster]:bg-info group-[.toaster]:text-info',
            'group-[.toaster]:border-info'
          ),
        },
        style: {
          // These will be overridden by the classNames above
        },
      }}
      {...props}
    />
  );
}

// Custom toast functions with icons
export const toast = {
  success: (message: string, options?: any) => {
    return sonnerToast.success(message, {
      icon: <CheckCircle2 className="h-5 w-5 text-accent-success" />,
      ...options,
    });
  },
  error: (message: string, options?: any) => {
    return sonnerToast.error(message, {
      icon: <XCircle className="h-5 w-5 text-accent-error" />,
      ...options,
    });
  },
  warning: (message: string, options?: any) => {
    return sonnerToast.warning(message, {
      icon: <AlertCircle className="h-5 w-5 text-accent-warning" />,
      ...options,
    });
  },
  info: (message: string, options?: any) => {
    return sonnerToast.info(message, {
      icon: <Info className="h-5 w-5 text-accent-info" />,
      ...options,
    });
  },
  message: sonnerToast.message,
  promise: sonnerToast.promise,
  dismiss: sonnerToast.dismiss,
  loading: sonnerToast.loading,
  custom: sonnerToast.custom,
};

// Export convenience components
export { Toaster as ToastProvider }; 