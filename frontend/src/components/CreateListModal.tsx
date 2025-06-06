'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { 
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/CustomDialog';
import { 
  Columns,
  FileText
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import { toast } from '@/components/ui/CustomToast';
import { motion } from 'framer-motion';

interface CreateListModalProps {
  boardId: string;
  boardName: string;
  onClose: () => void;
  onListCreated: () => void;
}

interface ListFormData {
  name: string;
}

// Helper function for analytics tracking
const trackEvent = async (actionType: string, payload: any) => {
  if (typeof window !== 'undefined') {
    try {
      const { track } = await import('@/services/analyticsLogger');
      track(actionType, {
        text: payload.text || `User performed ${actionType} action`,
        ...payload
      });
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }
};

export default function CreateListModal({
  boardId,
  boardName,
  onClose,
  onListCreated
}: CreateListModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ListFormData>({
    name: ''
  });

  const handleInputChange = (value: string) => {
    setFormData({ name: value });
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('List name is required');
      return false;
    }

    if (formData.name.trim().length < 2) {
      toast.error('List name must be at least 2 characters');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      // Track list creation attempt
      trackEvent('LIST_CREATE_ATTEMPT', {
        text: `User attempted to create list "${formData.name}" in board`,
        list_name: formData.name,
        board_id: boardId
      });

      const listData = {
        name: formData.name.trim(),
        board_id: boardId
      };

      const response = await apiClient.post(`/api/boards/${boardId}/lists`, listData);
      
      if (response.status === 200 || response.status === 201) {
        // Track successful creation
        trackEvent('LIST_CREATED', {
          text: `User successfully created list "${response.data.name}" in board`,
          list_id: response.data.id,
          list_name: response.data.name,
          board_id: boardId,
          timestamp: new Date().toISOString()
        });

        // Log for synthetic API
        trackEvent('TASK_DONE', {
          text: 'User completed the task of creating a new list',
          taskName: 'create_list',
          list_id: response.data.id,
          list_name: response.data.name,
          board_id: boardId
        });

        toast.success('List created successfully!');
        onListCreated();
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to create list:', error);
      
      // Track creation failure
      trackEvent('LIST_CREATE_FAILED', {
        text: `User's attempt to create list "${formData.name}" failed: ${error.response?.data?.detail || error.message}`,
        error: error.response?.data?.detail || error.message,
        list_name: formData.name,
        board_id: boardId
      });

      toast.error(error.response?.data?.detail || 'Failed to create list');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3">
          <motion.div
            className="flex items-center justify-center w-12 h-12 bg-accent/10 rounded-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <Columns className="h-6 w-6 text-accent" />
          </motion.div>
          <div>
            <DialogTitle>Create New List</DialogTitle>
            <DialogDescription>
              Add a new list to organize tasks in {boardName}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* List Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted" />
            List Name *
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="e.g., To Do, In Progress, Done..."
            className="w-full"
            disabled={loading}
            data-testid="list-name-input"
            autoFocus
          />
          <p className="text-xs text-muted">
            Choose a name that represents a stage in your workflow
          </p>
        </div>

        {/* Common List Suggestions */}
        <div className="space-y-2">
          <p className="text-xs text-muted">Quick suggestions:</p>
          <div className="flex flex-wrap gap-2">
            {['To Do', 'In Progress', 'Review', 'Done', 'Backlog', 'Testing'].map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                onClick={() => handleInputChange(suggestion)}
                disabled={loading}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>

        {/* Preview Card */}
        {formData.name && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-muted/30 rounded-lg border border-secondary"
          >
            <h4 className="text-sm font-medium text-primary mb-2">List Preview</h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Columns className="h-4 w-4 text-muted" />
                <p className="text-primary font-medium">{formData.name}</p>
              </div>
              <p className="text-xs text-muted">
                Board: {boardName}
              </p>
            </div>
          </motion.div>
        )}
      </div>

      <DialogFooter>
        <Button 
          variant="outline" 
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={loading || !formData.name.trim()}
          data-testid="create-list-submit"
        >
          {loading ? 'Creating...' : 'Create List'}
        </Button>
      </DialogFooter>
    </>
  );
} 