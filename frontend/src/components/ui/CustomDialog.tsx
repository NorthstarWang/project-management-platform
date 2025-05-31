'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface CustomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

interface CustomDialogContentProps {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
}

interface CustomDialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CustomDialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface CustomDialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

interface CustomDialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

interface CustomDialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  onClick?: () => void;
}

// Context for managing dialog state
const DialogContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>({
  open: false,
  onOpenChange: () => {},
});

export function CustomDialog({ open, onOpenChange, children }: CustomDialogProps) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

export function CustomDialogTrigger({ children, asChild, onClick }: CustomDialogTriggerProps) {
  const { onOpenChange } = React.useContext(DialogContext);
  
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

export function CustomDialogContent({ 
  children, 
  className, 
  onClose,
  showCloseButton = true 
}: CustomDialogContentProps) {
  const { open, onOpenChange } = React.useContext(DialogContext);
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

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      
      // Check if the click is on a dropdown portal element
      let element: Node | null = target;
      while (element && element !== document.body) {
        if (element instanceof Element && element.hasAttribute('data-dropdown-portal')) {
          return; // Don't close modal if clicking on dropdown
        }
        element = element.parentNode;
      }
      
      if (contentRef.current && !contentRef.current.contains(target)) {
        onOpenChange(false);
        onClose?.();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
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
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-50 bg-dialog-overlay backdrop-blur-sm"
          />
          
          {/* Dialog Container */}
          <motion.div 
            key="dialog-container"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <motion.div
              ref={contentRef}
              className={cn(
                'relative w-full max-w-lg pointer-events-auto',
                'bg-dialog border border-dialog rounded-lg',
                'shadow-dialog p-6',
                'max-h-[90vh] overflow-y-auto',
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
              {showCloseButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-4 h-8 w-8"
                  onClick={() => {
                    onOpenChange(false);
                    onClose?.();
                  }}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              )}
              {children}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function CustomDialogHeader({ children, className }: CustomDialogHeaderProps) {
  return (
    <div className={cn('mb-4', className)}>
      {children}
    </div>
  );
}

export function CustomDialogTitle({ children, className }: CustomDialogTitleProps) {
  return (
    <h2 className={cn('text-lg font-semibold text-primary', className)}>
      {children}
    </h2>
  );
}

export function CustomDialogDescription({ children, className }: CustomDialogDescriptionProps) {
  return (
    <p className={cn('text-sm text-secondary mt-2', className)}>
      {children}
    </p>
  );
}

export function CustomDialogFooter({ children, className }: CustomDialogFooterProps) {
  return (
    <div className={cn('mt-6 flex justify-end gap-2', className)}>
      {children}
    </div>
  );
}

// Export with shorter names for convenience
export {
  CustomDialog as Dialog,
  CustomDialogTrigger as DialogTrigger,
  CustomDialogContent as DialogContent,
  CustomDialogHeader as DialogHeader,
  CustomDialogTitle as DialogTitle,
  CustomDialogDescription as DialogDescription,
  CustomDialogFooter as DialogFooter,
}; 