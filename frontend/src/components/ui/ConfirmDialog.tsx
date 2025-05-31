'use client';

import React from 'react';
import { Button } from './Button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from './CustomDialog';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

type ConfirmationType = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmationType;
  loading?: boolean;
}

const typeConfig = {
  danger: {
    icon: XCircle,
    iconClass: 'text-error',
    confirmButtonClass: 'bg-error hover:bg-red-600 text-white'
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-warning',
    confirmButtonClass: 'bg-warning hover:bg-yellow-600 text-warning-foreground'
  },
  info: {
    icon: Info,
    iconClass: 'text-info',
    confirmButtonClass: 'bg-info hover:bg-blue-600 text-white'
  },
  success: {
    icon: CheckCircle,
    iconClass: 'text-success',
    confirmButtonClass: 'bg-success hover:bg-green-600 text-white'
  }
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  loading = false
}: ConfirmDialogProps) {
  const config = typeConfig[type];
  const IconComponent = config.icon;

  const handleConfirm = () => {
    onConfirm();
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full bg-surface ${config.iconClass}`}>
              <IconComponent className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-left">{title}</DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-left mt-4">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-row justify-end gap-2 mt-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={loading}
            className={config.confirmButtonClass}
          >
            {loading ? 'Processing...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmDialog; 