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
  Layout,
  FileText
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import { toast } from '@/components/ui/CustomToast';
import { motion } from 'framer-motion';

interface CreateBoardModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
  onBoardCreated: () => void;
}

interface BoardFormData {
  name: string;
  description: string;
}

// Helper function for analytics tracking
const trackEvent = async (actionType: string, payload: any) => {
  if (typeof window !== 'undefined') {
    try {
      const { track } = await import('@/services/analyticsLogger');
      track(actionType, payload);
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }
};

export default function CreateBoardModal({
  projectId,
  projectName,
  onClose,
  onBoardCreated
}: CreateBoardModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<BoardFormData>({
    name: '',
    description: ''
  });

  const handleInputChange = (field: keyof BoardFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('Board name is required');
      return false;
    }

    if (formData.name.trim().length < 3) {
      toast.error('Board name must be at least 3 characters');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      // Track board creation attempt
      trackEvent('BOARD_CREATE_ATTEMPT', {
        board_name: formData.name,
        project_id: projectId,
        has_description: !!formData.description.trim()
      });

      const boardData = {
        name: formData.name.trim(),
        description: formData.description.trim() || `A board for organizing tasks in ${projectName}`,
        project_id: projectId
      };

      const response = await apiClient.post('/api/boards', boardData);
      
      if (response.status === 200 || response.status === 201) {
        // Track successful creation
        trackEvent('BOARD_CREATED', {
          board_id: response.data.id,
          board_name: response.data.name,
          project_id: projectId,
          timestamp: new Date().toISOString()
        });

        // Log for synthetic API
        trackEvent('TASK_DONE', {
          taskName: 'create_board',
          board_id: response.data.id,
          board_name: response.data.name,
          project_id: projectId
        });

        toast.success('Board created successfully!');
        onBoardCreated();
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to create board:', error);
      
      // Track creation failure
      trackEvent('BOARD_CREATE_FAILED', {
        error: error.response?.data?.detail || error.message,
        board_name: formData.name,
        project_id: projectId
      });

      toast.error(error.response?.data?.detail || 'Failed to create board');
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
            <Layout className="h-6 w-6 text-accent" />
          </motion.div>
          <div>
            <DialogTitle>Create New Board</DialogTitle>
            <DialogDescription>
              Add a new board to organize tasks in {projectName}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Board Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted" />
            Board Name *
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="e.g., Sprint 1, Backlog, Feature Development..."
            className="w-full"
            disabled={loading}
            data-testid="board-name-input"
          />
          <p className="text-xs text-muted">
            Choose a name that reflects the board&apos;s purpose
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted" />
            Description
          </Label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Describe what this board will be used for..."
            className="w-full min-h-[100px] px-3 py-2 bg-input border border-input rounded-md text-input placeholder:text-input-placeholder focus:border-input-focus focus:outline-none focus:ring-2 focus:ring-interactive-primary focus:ring-offset-2 resize-none transition-all duration-200"
            rows={4}
            disabled={loading}
            data-testid="board-description-input"
          />
          <p className="text-xs text-muted">
            Optional: Add details about the board&apos;s workflow or goals
          </p>
        </div>

        {/* Preview Card */}
        {formData.name && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-muted/30 rounded-lg border border-secondary"
          >
            <h4 className="text-sm font-medium text-primary mb-2">Board Preview</h4>
            <div className="space-y-1 text-sm">
              <p className="text-primary font-medium">{formData.name}</p>
              {formData.description && (
                <p className="text-secondary text-xs">{formData.description}</p>
              )}
              <p className="text-xs text-muted">
                Project: {projectName}
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
          data-testid="create-board-submit"
        >
          {loading ? 'Creating...' : 'Create Board'}
        </Button>
      </DialogFooter>
    </>
  );
} 