'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  type?: 'item' | 'checkbox' | 'radio';
  checked?: boolean;
  onClick?: () => void;
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  className?: string;
  contentClassName?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
  onOpenChange?: (open: boolean) => void;
}

export function CustomDropdownMenu({
  trigger,
  items,
  className,
  contentClassName,
  align = 'start',
  side = 'bottom',
  sideOffset = 4,
  onOpenChange,
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    const newOpen = !isOpen;
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const handleItemClick = (item: DropdownMenuItem) => {
    if (!item.disabled) {
      item.onClick?.();
      setIsOpen(false);
      onOpenChange?.(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        onOpenChange?.(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onOpenChange]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        onOpenChange?.(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onOpenChange]);

  const getContentPosition = () => {
    const baseClasses = 'absolute z-50';
    
    switch (side) {
      case 'top':
        return `${baseClasses} bottom-full mb-${sideOffset}`;
      case 'bottom':
        return `${baseClasses} top-full mt-${sideOffset}`;
      case 'left':
        return `${baseClasses} right-full mr-${sideOffset}`;
      case 'right':
        return `${baseClasses} left-full ml-${sideOffset}`;
      default:
        return `${baseClasses} top-full mt-${sideOffset}`;
    }
  };

  const getAlignmentClasses = () => {
    if (side === 'top' || side === 'bottom') {
      switch (align) {
        case 'start':
          return 'left-0';
        case 'center':
          return 'left-1/2 transform -translate-x-1/2';
        case 'end':
          return 'right-0';
        default:
          return 'left-0';
      }
    } else {
      switch (align) {
        case 'start':
          return 'top-0';
        case 'center':
          return 'top-1/2 transform -translate-y-1/2';
        case 'end':
          return 'bottom-0';
        default:
          return 'top-0';
      }
    }
  };

  return (
    <div className={cn('relative inline-block', className)}>
      {/* Trigger */}
      <motion.button
        ref={triggerRef}
        onClick={handleToggle}
        className="flex items-center gap-2 cursor-pointer focus:outline-none"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.1 }}
      >
        {trigger}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          <ChevronDown className="h-4 w-4 text-secondary" />
        </motion.div>
      </motion.button>

      {/* Dropdown Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={contentRef}
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ 
              duration: 0.15, 
              ease: 'easeOut',
              exit: { duration: 0.1, ease: 'easeIn' }
            }}
            className={cn(
              getContentPosition(),
              getAlignmentClasses(),
              'min-w-[8rem] overflow-hidden rounded-md bg-dropdown border-dropdown p-1 text-dropdown-item',
              contentClassName
            )}
            style={{
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            }}
          >
            {items.map((item) => (
              <motion.div
                key={item.id}
                className={cn(
                  'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
                  'text-dropdown-item',
                  item.disabled 
                    ? 'pointer-events-none opacity-50' 
                    : 'hover:bg-dropdown-item-hover focus:bg-dropdown-item-active'
                )}
                onClick={() => handleItemClick(item)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                whileHover={!item.disabled ? { 
                  backgroundColor: 'var(--dropdown-item-hover)',
                  x: 2
                } : {}}
                transition={{ duration: 0.1 }}
              >
                {/* Icon or Checkbox/Radio indicator */}
                {item.type === 'checkbox' && (
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {item.checked && <Check className="h-4 w-4" />}
                  </span>
                )}
                {item.type === 'radio' && (
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {item.checked && <Circle className="h-2 w-2 fill-current" />}
                  </span>
                )}
                {item.icon && item.type === 'item' && (
                  <span className="mr-2 h-4 w-4 flex items-center justify-center">
                    {item.icon}
                  </span>
                )}

                {/* Label */}
                <span className={cn(
                  item.type === 'checkbox' || item.type === 'radio' ? 'pl-6' : '',
                  'flex-1'
                )}>
                  {item.label}
                </span>

                {/* Hover indicator */}
                <AnimatePresence>
                  {hoveredItem === item.id && !item.disabled && (
                    <motion.div
                      className="absolute inset-0 bg-dropdown-item-hover rounded-sm -z-10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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