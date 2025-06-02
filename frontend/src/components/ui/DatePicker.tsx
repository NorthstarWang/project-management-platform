'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select a date',
  className,
  disabled = false,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(value ? new Date(value.getFullYear(), value.getMonth()) : new Date());
  const [mounted, setMounted] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0, width: 0 });
  
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (value) {
      setViewMonth(new Date(value.getFullYear(), value.getMonth()));
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        updatePickerPosition();
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

  const updatePickerPosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPickerPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  const handleToggle = () => {
    if (disabled) return;
    
    if (!isOpen) {
      updatePickerPosition();
    }
    setIsOpen(!isOpen);
  };

  const handleDateSelect = (date: Date) => {
    onChange?.(date);
    setViewMonth(date);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange?.(null);
    setViewMonth(new Date());
    setIsOpen(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setViewMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isDateDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(viewMonth);
    const firstDay = getFirstDayOfMonth(viewMonth);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-8 w-8" />
      );
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
      const isSelected = value && isSameDay(date, value);
      const isToday = isSameDay(date, new Date());
      const isDisabled = isDateDisabled(date);

      days.push(
        <motion.button
          key={day}
          type="button"
          onClick={() => !isDisabled && handleDateSelect(date)}
          disabled={isDisabled}
          whileHover={{ scale: isDisabled ? 1 : 1.05 }}
          whileTap={{ scale: isDisabled ? 1 : 0.95 }}
          className={cn(
            'h-8 w-8 text-xs rounded-md transition-all duration-200',
            'flex items-center justify-center cursor-pointer',
            'hover:bg-accent/20 focus:outline-none focus:ring-2 focus:ring-accent/50',
            isSelected && 'bg-accent text-white hover:bg-accent/90',
            isToday && !isSelected && 'bg-surface border border-accent/50 text-accent font-medium',
            isDisabled && 'text-muted cursor-not-allowed opacity-50',
            !isSelected && !isToday && !isDisabled && 'text-primary'
          )}
        >
          {day}
        </motion.button>
      );
    }

    return days;
  };

  const pickerContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={pickerRef}
          initial={{ opacity: 0, scale: 0.95, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -8 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: pickerPosition.top,
            left: pickerPosition.left,
            minWidth: 280,
            zIndex: 10000
          }}
          className={cn(
            'bg-dropdown border border-dropdown rounded-lg shadow-xl',
            'p-4 space-y-4'
          )}
          data-dropdown-portal
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <motion.button
              type="button"
              onClick={() => navigateMonth('prev')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-1 rounded-md hover:bg-surface transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-primary" />
            </motion.button>
            
            <h3 className="text-sm font-medium text-primary">
              {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            
            <motion.button
              type="button"
              onClick={() => navigateMonth('next')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-1 rounded-md hover:bg-surface transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-primary" />
            </motion.button>
          </div>

          {/* Week days */}
          <div className="grid grid-cols-7 gap-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="h-8 flex items-center justify-center">
                <span className="text-xs font-medium text-muted">{day}</span>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar()}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-secondary">
            <motion.button
              type="button"
              onClick={handleClear}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-xs text-secondary hover:text-primary transition-colors"
            >
              Clear
            </motion.button>
            
            <motion.button
              type="button"
              onClick={() => handleDateSelect(new Date())}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-xs text-accent hover:text-accent/80 transition-colors"
            >
              Today
            </motion.button>
          </div>
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
            'text-sm text-left cursor-pointer',
            'transition-all duration-200',
            'hover:border-input-focus',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-interactive-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
            isOpen && 'border-input-focus ring-2 ring-offset-2 ring-interactive-primary'
          )}
        >
          <span className={cn(
            'flex items-center gap-2 truncate',
            value ? 'text-input' : 'text-muted'
          )}>
            <Calendar className="h-4 w-4 opacity-50" />
            {value ? formatDate(value) : placeholder}
          </span>
        </button>
      </div>

      {/* Portal picker */}
      {mounted && createPortal(pickerContent, document.body)}
    </>
  );
} 