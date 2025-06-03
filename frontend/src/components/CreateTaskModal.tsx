'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { CustomDropdownMenu as DropdownMenu } from '@/components/ui/CustomDropdownMenu';
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
import { motion, AnimatePresence } from 'framer-motion';
import { DatePicker } from '@/components/ui/DatePicker';

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

interface Task {
  id: string;
  title: string;
  description: string;
  list_id: string;
  assignee_id?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: string;
  due_date?: string;
  position: number;
  created_at: string;
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
  task_type: 'feature' | 'bug' | 'research' | 'fix' | 'story' | 'task';
  status: string;
}

interface ListTaskCounts {
  [listId: string]: {
    [priority: string]: number;
  };
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
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [listTaskCounts, setListTaskCounts] = useState<ListTaskCounts>({});

  // Helper function to determine task status based on list name (same as TaskDetailModal)
  const getStatusFromListName = (listName: string): string => {
    const name = listName.toLowerCase();
    if (name.includes('done') || name.includes('completed')) return 'done';
    if (name.includes('progress') || name.includes('in progress')) return 'in_progress';
    if (name.includes('review')) return 'review';
    if (name.includes('archive')) return 'archived';
    if (name.includes('backlog')) return 'backlog';
    if (name.includes('todo') || name.includes('to do')) return 'todo';
    return 'todo'; // default
  };

  // Get initial status from the list name
  const getInitialStatus = () => {
    const targetList = lists.find(l => l.id === listId);
    return targetList ? getStatusFromListName(targetList.name) : 'todo';
  };

  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    list_id: listId,
    assignee_id: '',
    priority: 'medium',
    due_date: '',
    task_type: 'task',
    status: getInitialStatus()
  });

  const totalSteps = 5;

  useEffect(() => {
    const targetList = lists.find(l => l.id === listId);
    const status = targetList ? getStatusFromListName(targetList.name) : 'todo';
    setFormData(prev => ({ ...prev, list_id: listId, status }));
  }, [listId, lists]);

  useEffect(() => {
    if (users.length === 0 && !loadingUsers) {
      onLoadUsers();
    }
  }, [users.length, loadingUsers, onLoadUsers]);

  useEffect(() => {
    loadBoardTasks();
  }, [lists]);

  const loadBoardTasks = async () => {
    if (lists.length === 0) return;
    
    try {
      setLoadingTasks(true);
      const boardId = lists[0]?.board_id;
      if (!boardId) return;

      const response = await apiClient.get(`/api/boards/${boardId}/tasks`);
      const boardTasks: Task[] = response.data;
      
      // Calculate task counts by priority for each list
      const counts: ListTaskCounts = {};
      lists.forEach(list => {
        counts[list.id] = { low: 0, medium: 0, high: 0, urgent: 0 };
      });
      
      boardTasks.forEach(task => {
        if (counts[task.list_id]) {
          counts[task.list_id][task.priority]++;
        }
      });
      
      setListTaskCounts(counts);
    } catch (error) {
      console.error('Failed to load board tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleInputChange = (field: keyof TaskFormData, value: string) => {
    // Convert "unassigned" back to empty string for assignee_id
    const actualValue = field === 'assignee_id' && value === 'unassigned' ? '' : value;
    
    // If changing list, also update status to match list semantics
    if (field === 'list_id') {
      const targetList = lists.find(l => l.id === value);
      if (targetList) {
        const newStatus = getStatusFromListName(targetList.name);
        setFormData(prev => ({ 
          ...prev, 
          [field]: actualValue,
          status: newStatus 
        }));
      } else {
        setFormData(prev => ({ ...prev, [field]: actualValue }));
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: actualValue }));
    }
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
      case 5:
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
        task_type: formData.task_type,
        status: formData.status
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

  const getPriorityBadgeVariant = (priority: string): 'urgent' | 'high' | 'medium' | 'low' => {
    switch (priority) {
      case 'urgent': return 'urgent';
      case 'high': return 'high'; 
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'low';
    }
  };

  const createListOptions = () => {
    return lists.map((list) => {
      const counts = listTaskCounts[list.id] || { low: 0, medium: 0, high: 0, urgent: 0 };
      const totalTasks = counts.low + counts.medium + counts.high + counts.urgent;
      
      // Only show badges if there are tasks
      if (totalTasks === 0) {
        return {
          value: list.id,
          label: list.name,
          icon: null
        };
      }
      
      // Create priority badges for non-zero counts with proper colors
      const priorityBadges: React.ReactNode[] = [];
      if (counts.urgent > 0) {
        priorityBadges.push(
          <Badge key="urgent" size="sm" className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white border-0">
            {counts.urgent}
          </Badge>
        );
      }
      if (counts.high > 0) {
        priorityBadges.push(
          <Badge key="high" size="sm" className="ml-1 px-1.5 py-0.5 text-xs bg-orange-500 text-white border-0">
            {counts.high}
          </Badge>
        );
      }
      if (counts.medium > 0) {
        priorityBadges.push(
          <Badge key="medium" size="sm" className="ml-1 px-1.5 py-0.5 text-xs bg-yellow-500 text-black border-0">
            {counts.medium}
          </Badge>
        );
      }
      if (counts.low > 0) {
        priorityBadges.push(
          <Badge key="low" size="sm" className="ml-1 px-1.5 py-0.5 text-xs bg-green-500 text-white border-0">
            {counts.low}
          </Badge>
        );
      }

      return {
        value: list.id,
        label: list.name,
        icon: (
          <div className="flex items-center ml-auto">
            {priorityBadges}
          </div>
        )
      };
    });
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
                  className="mt-1 w-full min-w-[400px]"
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
              <DropdownMenu
                value={formData.list_id}
                onChange={(value) => handleInputChange('list_id', value)}
                placeholder={loadingTasks ? "Loading task counts..." : "Select a list..."}
                className="mt-1"
                disabled={loadingTasks}
                options={loadingTasks ? [] : createListOptions()}
              />
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
                <DropdownMenu
                  value={formData.assignee_id || 'unassigned'}
                  onChange={(value) => handleInputChange('assignee_id', value)}
                  placeholder="Select an assignee..."
                  className="mt-1"
                  options={[
                    {
                      value: 'unassigned',
                      label: 'Unassigned',
                      icon: <div className="w-6 h-6 rounded-full bg-surface border-2 border-dashed border-unassigned flex items-center justify-center mr-2">
                        <span className="text-xs text-unassigned">?</span>
                      </div>
                    },
                    ...users.map((user) => ({
                      value: user.id,
                      label: `${user.full_name} (${user.role})`,
                      icon: <Avatar size="xs" name={user.full_name} className="mr-2" />
                    }))
                  ]}
                />
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <DropdownMenu
                  value={formData.priority}
                  onChange={(value) => handleInputChange('priority', value as any)}
                  className="mt-1"
                  options={[
                    {
                      value: 'low',
                      label: 'Low Priority',
                      icon: <div className="w-3 h-3 rounded-full bg-priority-low-solid mr-2"></div>
                    },
                    {
                      value: 'medium',
                      label: 'Medium Priority',
                      icon: <div className="w-3 h-3 rounded-full bg-priority-medium-solid mr-2"></div>
                    },
                    {
                      value: 'high',
                      label: 'High Priority',
                      icon: <div className="w-3 h-3 rounded-full bg-priority-high-solid mr-2"></div>
                    },
                    {
                      value: 'urgent',
                      label: 'Urgent',
                      icon: <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-priority-urgent-solid mr-2"></div>
                        <AlertCircle className="h-3 w-3 mr-1" />
                      </div>
                    }
                  ]}
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-primary">Task Type</h3>
              <p className="text-sm text-muted-foreground">What type of task is this?</p>
            </div>
            
            <div>
              <Label htmlFor="task_type">Task Type</Label>
              <DropdownMenu
                value={formData.task_type}
                onChange={(value) => handleInputChange('task_type', value as any)}
                className="mt-1"
                options={[
                  {
                    value: 'feature',
                    label: 'Feature',
                    icon: <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                  },
                  {
                    value: 'bug',
                    label: 'Bug',
                    icon: <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                  },
                  {
                    value: 'research',
                    label: 'Research',
                    icon: <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                  },
                  {
                    value: 'fix',
                    label: 'Fix',
                    icon: <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                  },
                  {
                    value: 'story',
                    label: 'Story',
                    icon: <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  },
                  {
                    value: 'task',
                    label: 'Task',
                    icon: <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
                  }
                ]}
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Calendar className="h-12 w-12 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-primary">Due Date</h3>
              <p className="text-sm text-muted-foreground">When should this task be completed?</p>
            </div>
            
            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <DatePicker
                value={formData.due_date ? new Date(formData.due_date) : null}
                onChange={(value) => handleInputChange('due_date', value ? value.toISOString().split('T')[0] : '')}
                className="mt-1"
                placeholder="Select due date"
                minDate={new Date()}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Set a due date for this task
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
                  <Badge variant={getPriorityBadgeVariant(formData.priority)} size="sm">
                    {formData.priority}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant="secondary" size="sm">
                    {formData.task_type}
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
            className={`w-3 h-3 rounded-full transition-all duration-200 ${
              i + 1 <= currentStep 
                ? 'bg-success border-2 border-success' 
                : 'bg-surface border-2 border-secondary'
            }`}
          />
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[300px] relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
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