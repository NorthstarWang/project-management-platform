'use client';

import React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'checkbox-root h-5 w-5 shrink-0 rounded-sm border-2 border-checkbox',
      'ring-offset-background transition-all duration-200',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'hover:border-checkbox-checked',
      className
    )}
    {...props}
  >
    <AnimatePresence>
      {props.checked !== false && (
        <CheckboxPrimitive.Indicator
          className={cn('checkbox-indicator flex items-center justify-center text-current')}
        >
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ 
              type: 'spring', 
              stiffness: 500, 
              damping: 30,
              duration: 0.2 
            }}
          >
            <Check className="h-3.5 w-3.5 stroke-[3]" />
          </motion.div>
        </CheckboxPrimitive.Indicator>
      )}
    </AnimatePresence>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox }; 