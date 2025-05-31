'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { 
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select';
import { 
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/CustomDialog';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { 
  User,
  Calendar,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  CheckCircle
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import { toast } from '@/components/ui/CustomToast';

interface List {
  id: string;
  name: string;
  board_id: string;
  position: number;
  created_at: string;
}

interface User {
  id: string;
  username: string;
  full_name: string;
  role: string;
  email: string;
}

interface CreateTaskModalProps {
  listId: string;
  lists: List[];
  users: User[];
  loadingUsers: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  onLoadUsers: () => void;
}

interface TaskFormData {
  title: string;
  description: string;
  list_id: string;
  assignee_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string;
}

export default function CreateTaskModal({
  listId,
  lists,
  users,
  loadingUsers,
  onClose,
  onTaskCreated,
  onLoadUsers
}: CreateTaskModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    list_id: listId,
    assignee_id: '',
    priority: 'medium',
    due_date: ''
  });

  const totalSteps = 4;

  useEffect(() => {
    setFormData(prev => ({ ...prev, list_id: listId }));
  }, [listId]);

  useEffect(() => {
    if (users.length === 0 && !loadingUsers) {
      onLoadUsers();
    }
  }, [users.length, loadingUsers, onLoadUsers]);

  const handleInputChange = (field: keyof TaskFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.title.trim().length >= 3;
      case 2:
        return formData.list_id !== '';
      case 3:
        return true; // Optional step
      case 4:
        return true; // Optional step
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps && validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    try {
      setIsSubmitting(true);
      
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        list_id: formData.list_id,
        assignee_id: formData.assignee_id || undefined,
        priority: formData.priority,
        due_date: formData.due_date || undefined,
      };

      const response = await apiClient.post('/api/tasks', taskData);
      
      if (response.status === 200 || response.status === 201) {
        toast.success('Task created successfully!');
        onTaskCreated();
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to create task:', error);
      toast.error(error.response?.data?.detail || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <CheckCircle className="h-12 w-12 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-primary">Task Basics</h3>
              <p className="text-sm text-muted-foreground">Let&apos;s start with the essential information</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter a clear, descriptive task title..."
                  className="mt-1"
                />
                {formData.title.length > 0 && formData.title.length < 3 && (
                  <p className="text-xs text-destructive mt-1">Title must be at least 3 characters</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Add more details about this task..."
                  className="mt-1 w-full min-h-[80px] px-3 py-2 bg-input border border-input-border rounded-md text-input placeholder:text-input-placeholder focus:border-input-border-focus focus:outline-none resize-none"
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <ChevronRight className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-primary">Choose List</h3>
              <p className="text-sm text-muted-foreground">Where should this task be placed?</p>
            </div>
            
            <div>
              <Label htmlFor="list">Target List *</Label>
              <Select
                value={formData.list_id}
                onValueChange={(value) => handleInputChange('list_id', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a list..." />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{list.name}</span>
                        <Badge variant="secondary" size="sm" className="ml-2">
                          {list.position}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <User className="h-12 w-12 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-primary">Assignment & Priority</h3>
              <p className="text-sm text-muted-foreground">Who will work on this and how urgent is it?</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="assignee">Assign to</Label>
                <Select
                  value={formData.assignee_id}
                  onValueChange={(value) => handleInputChange('assignee_id', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select an assignee..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center mr-2 border border-border">
                          <span className="text-xs text-muted-foreground">?</span>
                        </div>
                        <span>Unassigned</span>
                      </div>
                    </SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center">
                          <Avatar size="xs" name={user.full_name} className="mr-2" />
                          <div>
                            <span className="font-medium">{user.full_name}</span>
                            <span className="text-xs text-muted-foreground ml-2">({user.role})</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => handleInputChange('priority', value as any)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-priority-low mr-2"></div>
                        Low Priority
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-priority-medium mr-2"></div>
                        Medium Priority
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-priority-high mr-2"></div>
                        High Priority
                      </div>
                    </SelectItem>
                    <SelectItem value="urgent">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-priority-urgent mr-2"></div>
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Urgent
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Calendar className="h-12 w-12 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-primary">Due Date</h3>
              <p className="text-sm text-muted-foreground">When should this task be completed?</p>
            </div>
            
            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) => handleInputChange('due_date', e.target.value)}
                className="mt-1"
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty if no specific deadline is required
              </p>
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
              <h4 className="font-medium text-primary mb-3">Task Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Title:</span>
                  <span className="text-primary font-medium">{formData.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">List:</span>
                  <span className="text-primary">{lists.find(l => l.id === formData.list_id)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priority:</span>
                  <Badge variant={formData.priority === 'high' || formData.priority === 'urgent' ? 'high' : 
                                formData.priority === 'medium' ? 'medium' : 'low'} size="sm">
                    {formData.priority}
                  </Badge>
                </div>
                {formData.assignee_id && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Assignee:</span>
                    <span className="text-primary">
                      {users.find(u => u.id === formData.assignee_id)?.full_name}
                    </span>
                  </div>
                )}
                {formData.due_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due:</span>
                    <span className="text-primary">
                      {new Date(formData.due_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create New Task</DialogTitle>
        <DialogDescription>
          Step {currentStep} of {totalSteps} - Let&apos;s create a new task for your project
        </DialogDescription>
      </DialogHeader>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-2 mb-6">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${
              i + 1 <= currentStep ? 'bg-primary' : 'bg-muted border border-border'
            }`}
          />
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[300px]">
        {renderStepContent()}
      </div>

      <DialogFooter>
        <div className="flex justify-between w-full">
          <Button 
            variant="outline" 
            onClick={prevStep}
            disabled={currentStep === 1}
            leftIcon={<ChevronLeft className="h-4 w-4" />}
          >
            Previous
          </Button>

          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            
            {currentStep === totalSteps ? (
              <Button 
                onClick={handleSubmit}
                disabled={!validateStep(currentStep) || isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Task'}
              </Button>
            ) : (
              <Button 
                onClick={nextStep}
                disabled={!validateStep(currentStep)}
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </DialogFooter>
    </>
  );
} 