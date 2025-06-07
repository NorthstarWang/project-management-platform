'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomDropdownMenuProps {
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CustomDropdownMenu({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  className,
  disabled = false,
}: CustomDropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };

    const handleResize = () => {
      if (isOpen) {
        setIsOpen(false);
      }
    };

    if (mounted) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, mounted]);

  const updateDropdownPosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const modalElement = triggerRef.current.closest('[role="dialog"]');
      const modalRect = modalElement?.getBoundingClientRect();
      
      // If inside a modal, adjust position relative to modal
      if (modalElement && modalRect) {
        setDropdownPosition({
          top: rect.bottom - modalRect.top + 4,
          left: rect.left - modalRect.left,
          width: rect.width
        });
      } else {
        // Normal positioning for non-modal contexts
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    }
  };

  const handleToggle = () => {
    if (disabled) return;
    
    if (!isOpen) {
      updateDropdownPosition();
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (optionValue: string) => {
    setSelectedValue(optionValue);
    onChange?.(optionValue);
    setIsOpen(false);
  };

  const safeOptions = Array.isArray(options) ? options : [];
  const selectedOption = safeOptions.find(opt => opt.value === selectedValue);

  const dropdownContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          data-dropdown-portal="true"
          initial={{ opacity: 0, scale: 0.95, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -8 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 10000
          }}
          className={cn(
            'overflow-hidden rounded-md border border-dropdown',
            'bg-dropdown shadow-xl'
          )}
        >
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="max-h-60 overflow-y-auto overflow-x-hidden py-1">
              {safeOptions.map((option, index) => (
                <motion.button
                  key={option.value}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'flex w-full items-center gap-2 px-2 py-2',
                    'text-sm text-dropdown-item',
                    'transition-all duration-150',
                    'hover:bg-dropdown-item-hover',
                    'focus:bg-dropdown-item-hover focus:outline-none',
                    selectedValue === option.value && 'bg-dropdown-item-active font-medium'
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="flex h-4 w-4 items-center justify-center flex-shrink-0">
                    {selectedValue === option.value && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      >
                        <Check className="h-3 w-3 text-interactive-primary" />
                      </motion.div>
                    )}
                  </span>
                  <span className="flex-1 text-left flex items-center justify-between">
                    <span className="truncate">{option.label}</span>
                    {option.icon}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div className={cn('relative', className)}>
        <button
          ref={triggerRef}
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md',
            'border border-input bg-input px-3 py-2',
            'text-sm text-input cursor-pointer',
            'transition-all duration-200',
            'hover:border-input-focus',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-interactive-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
            isOpen && 'border-input-focus ring-2 ring-offset-2 ring-interactive-primary'
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {selectedOption ? (
              <>
                {selectedOption.label}
                {selectedOption.icon}
              </>
            ) : (
              <span className="text-muted">{placeholder}</span>
            )}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 opacity-50" />
          </motion.div>
        </button>
      </div>

      {/* Portal dropdown */}
      {mounted && createPortal(dropdownContent, document.body)}
    </>
  );
}

// Convenience components for common use cases
export function DropdownMenuTrigger({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props}>
      {children}
    </button>
  );
}

export function DropdownMenuSeparator() {
  return <div className="my-1 h-px bg-border-muted" />;
}

export { CustomDropdownMenu as DropdownMenu }; 