'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface CustomAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface CustomAlertDialogContentProps {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}

interface CustomAlertDialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CustomAlertDialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface CustomAlertDialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

interface CustomAlertDialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

interface CustomAlertDialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  onClick?: () => void;
}

interface CustomAlertDialogActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

interface CustomAlertDialogCancelProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

// Context for managing dialog state
const AlertDialogContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>({
  open: false,
  onOpenChange: () => {},
});

export function CustomAlertDialog({ open, onOpenChange, children }: CustomAlertDialogProps) {
  return (
    <AlertDialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

export function CustomAlertDialogTrigger({ children, asChild, onClick }: CustomAlertDialogTriggerProps) {
  const { onOpenChange } = React.useContext(AlertDialogContext);
  
  const handleClick = () => {
    onOpenChange(true);
    onClick?.();
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: handleClick,
    });
  }

  return (
    <button onClick={handleClick}>
      {children}
    </button>
  );
}

export function CustomAlertDialogContent({ 
  children, 
  className, 
  onClose
}: CustomAlertDialogContentProps) {
  const { open, onOpenChange } = React.useContext(AlertDialogContext);
  const contentRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
        onClose?.();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onOpenChange, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence mode="wait">
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="alert-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-50 bg-dialog-overlay backdrop-blur-sm"
            onClick={() => {
              // Alert dialogs should not close on backdrop click
            }}
          />
          
          {/* Dialog Container */}
          <motion.div 
            key="alert-dialog-container"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <motion.div
              ref={contentRef}
              className={cn(
                'relative w-full max-w-md pointer-events-auto',
                'bg-dialog border border-dialog rounded-lg',
                'shadow-dialog p-6',
                className
              )}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ 
                type: 'spring',
                damping: 20,
                stiffness: 300,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function CustomAlertDialogHeader({ children, className }: CustomAlertDialogHeaderProps) {
  return (
    <div className={cn('mb-4', className)}>
      {children}
    </div>
  );
}

export function CustomAlertDialogTitle({ children, className }: CustomAlertDialogTitleProps) {
  return (
    <h2 className={cn('text-lg font-semibold text-primary', className)}>
      {children}
    </h2>
  );
}

export function CustomAlertDialogDescription({ children, className }: CustomAlertDialogDescriptionProps) {
  return (
    <p className={cn('text-sm text-secondary mt-2', className)}>
      {children}
    </p>
  );
}

export function CustomAlertDialogFooter({ children, className }: CustomAlertDialogFooterProps) {
  return (
    <div className={cn('mt-6 flex justify-end gap-2', className)}>
      {children}
    </div>
  );
}

export function CustomAlertDialogAction({ 
  children, 
  onClick,
  className,
  ...props 
}: CustomAlertDialogActionProps) {
  const { onOpenChange } = React.useContext(AlertDialogContext);
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    // Small delay to allow the onClick handler to execute
    setTimeout(() => {
      onOpenChange(false);
    }, 100);
  };

  return (
    <Button
      variant="primary"
      onClick={handleClick}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}

export function CustomAlertDialogCancel({ 
  children, 
  onClick,
  className,
  ...props 
}: CustomAlertDialogCancelProps) {
  const { onOpenChange } = React.useContext(AlertDialogContext);
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    onOpenChange(false);
  };

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}

// Export with shorter names for convenience
export {
  CustomAlertDialog as AlertDialog,
  CustomAlertDialogTrigger as AlertDialogTrigger,
  CustomAlertDialogContent as AlertDialogContent,
  CustomAlertDialogHeader as AlertDialogHeader,
  CustomAlertDialogTitle as AlertDialogTitle,
  CustomAlertDialogDescription as AlertDialogDescription,
  CustomAlertDialogFooter as AlertDialogFooter,
  CustomAlertDialogAction as AlertDialogAction,
  CustomAlertDialogCancel as AlertDialogCancel,
}; 