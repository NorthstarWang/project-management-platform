'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Checkbox } from '@/components/ui/Checkbox';
import { CustomDropdownMenu } from '@/components/ui/CustomDropdownMenu';
import { DatePicker } from '@/components/ui/DatePicker';
import { 
  DialogHeader,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/CustomDialog';
import { 
  User,
  Calendar,
  MessageSquare,
  Save,
  X,
  Send,
  AlertCircle,
  Trash2,
  RefreshCw,
  Check,
  CheckCircle,
  Reply
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import { toast } from '@/components/ui/CustomToast';
import { CustomFieldsSection } from '@/components/custom-fields';
import { TaskTimeTracking } from '@/components/time-tracking';
import { TaskDependencies } from '@/components/dependencies/TaskDependencies';

interface Task {
  id: string;
  title: string;
  description: string;
  list_id: string;
  project_id?: string;
  assignee_id?: string;
  assignee_name?: string;
  priority: string;
  status: string;
  task_type?: string;
  due_date?: string;
  position: number;
  created_at: string;
  comments_count?: number;
  attachments_count?: number;
}

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

interface Comment {
  id: string;
  content: string;
  task_id: string;
  author_id: string;
  author: {
    id: string;
    username: string;
    full_name: string;
    email: string;
    role: string;
  };
  parent_comment_id?: string;
  created_at: string;
  updated_at?: string;
  replies?: Comment[];
}

interface TaskDetailModalProps {
  task: Task;
  lists: List[];
  users: User[];
  currentUser: User;
  onClose: () => void;
  onTaskUpdated: () => void;
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

// Comment Item Component for nested comments with replies
interface CommentItemProps {
  comment: Comment;
  currentUser: User;
  onReply: (commentId: string) => void;
  replyingTo: string | null;
  replyContent: string;
  onReplyContentChange: (content: string) => void;
  onSubmitReply: (commentId: string) => void;
  onCancelReply: () => void;
  formatRelativeDate: (date: string | number) => string;
  depth: number;
}

function CommentItem({
  comment,
  currentUser,
  onReply,
  replyingTo,
  replyContent,
  onReplyContentChange,
  onSubmitReply,
  onCancelReply,
  formatRelativeDate,
  depth
}: CommentItemProps) {
  const maxDepth = 3; // Maximum nesting depth
  const isNested = depth > 0;
  const canNest = depth < maxDepth;
  const isReplying = replyingTo === comment.id;

  return (
    <div id={`comment-${comment.id}`} className={`${isNested ? 'ml-8 pl-4 border-l-2 border-secondary' : ''}`}>
      <div className="flex space-x-3">
        <Avatar size={isNested ? "xs" : "sm"} name={comment.author.full_name} />
        <div className="flex-1">
          <div className={`${isNested ? 'bg-surface' : 'bg-card-content'} p-3 rounded-lg border border-card`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <span className={`${isNested ? 'text-xs' : 'text-sm'} font-medium text-primary`}>
                  {comment.author.full_name}
                </span>
                {comment.parent_comment_id && (
                  <span className="text-xs text-muted flex items-center bg-surface px-2 py-0.5 rounded-full">
                    <Reply className="h-3 w-3 mr-1" />
                    reply
                  </span>
                )}
              </div>
              <span className="text-xs text-muted">
                {formatRelativeDate(comment.created_at)}
              </span>
            </div>
            <p className={`${isNested ? 'text-xs' : 'text-sm'} text-secondary whitespace-pre-wrap`}>
              {comment.content}
            </p>
            {canNest && (
              <div className="mt-2">
                <button
                  onClick={() => onReply(comment.id)}
                  className="text-xs text-muted hover:text-accent transition-colors flex items-center"
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </button>
              </div>
            )}
          </div>

          {/* Reply input */}
          {isReplying && (
            <div className="mt-3 flex space-x-3">
              <Avatar size="sm" name={currentUser.full_name} />
              <div className="flex-1 space-y-2">
                <textarea
                  value={replyContent}
                  onChange={(e) => onReplyContentChange(e.target.value)}
                  placeholder={`Reply to ${comment.author.full_name}...`}
                  className="w-full min-h-[60px] px-3 py-2 bg-input border border-input-border rounded-md text-input placeholder:text-input-placeholder focus:border-input-border-focus focus:outline-none resize-none"
                  rows={2}
                  autoFocus
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onCancelReply}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onSubmitReply(comment.id)}
                    disabled={!replyContent.trim()}
                    leftIcon={<Send className="h-3 w-3" />}
                  >
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Nested replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUser={currentUser}
                  onReply={onReply}
                  replyingTo={replyingTo}
                  replyContent={replyContent}
                  onReplyContentChange={onReplyContentChange}
                  onSubmitReply={onSubmitReply}
                  onCancelReply={onCancelReply}
                  formatRelativeDate={formatRelativeDate}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TaskDetailModal({
  task,
  lists,
  users,
  currentUser,
  onClose,
  onTaskUpdated
}: TaskDetailModalProps) {
  // Original task data for comparison
  const [originalTask] = useState(task);
  
  // Auto-save settings
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastAutoSaved, setLastAutoSaved] = useState<Date | null>(null);
  
  // Form state (always editable)
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description,
    assignee_id: task.assignee_id || '',
    priority: task.priority,
    due_date: task.due_date || '',
    list_id: task.list_id,
    status: task.status,
    task_type: task.task_type || 'task'
  });

  // Change tracking
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Reply state
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // Load auto-saved changes from localStorage
  useEffect(() => {
    const autoSavedKey = `task-autosave-${task.id}`;
    const autoSaved = localStorage.getItem(autoSavedKey);
    
    if (autoSaved) {
      try {
        const savedData = JSON.parse(autoSaved);
        setFormData(savedData.formData);
        setModifiedFields(new Set(savedData.modifiedFields));
        setHasUnsavedChanges(savedData.modifiedFields.length > 0);
        setLastAutoSaved(new Date(savedData.timestamp));
      } catch (error) {
        console.warn('Failed to restore auto-saved data:', error);
      }
    }
  }, [task.id]);

  // Auto-save changes to localStorage
  const autoSave = useCallback(() => {
    if (!autoSaveEnabled) return;
    
    const autoSavedKey = `task-autosave-${task.id}`;
    const dataToSave = {
      formData,
      modifiedFields: Array.from(modifiedFields),
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(autoSavedKey, JSON.stringify(dataToSave));
    setLastAutoSaved(new Date());
  }, [task.id, formData, modifiedFields, autoSaveEnabled]);

  // Auto-save when form data changes
  useEffect(() => {
    if (hasUnsavedChanges && autoSaveEnabled) {
      const timer = setTimeout(autoSave, 1000); // Auto-save after 1 second of inactivity
      return () => clearTimeout(timer);
    }
  }, [formData, hasUnsavedChanges, autoSave, autoSaveEnabled]);

  const loadComments = useCallback(async () => {
    try {
      setLoadingComments(true);
      const response = await apiClient.get(`/api/tasks/${task.id}/comments`);
      
      // Backend already returns comments in threaded structure with replies
      // No need to reorganize - just use the response directly
      const threadedComments = response.data;
      
      console.log('📧 Loaded comments structure:', {
        total_comments: threadedComments.length,
        comments_with_replies: threadedComments.filter((c: Comment) => c.replies && c.replies.length > 0).length,
        sample_comment: threadedComments[0] || null
      });
      
      setComments(threadedComments);
    } catch (error) {
      console.error('Failed to load comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoadingComments(false);
    }
  }, [task.id]);

  useEffect(() => {
    loadComments();
    trackEvent('TASK_DETAIL_VIEW', {
      text: `User opened task detail modal for "${task.title}"`,
      task_id: task.id,
      task_title: task.title,
      timestamp: new Date().toISOString()
    });
  }, [task.id, task.title, loadComments]);

  const formatDetailedDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeDate = (dateString: string | number) => {
    // Handle Unix timestamp (convert from seconds to milliseconds)
    const timestamp = typeof dateString === 'string' ? parseFloat(dateString) : dateString;
    const date = new Date(timestamp * 1000); // Convert from seconds to milliseconds
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    // Less than a minute ago
    if (diffSeconds < 60) {
      return diffSeconds <= 5 ? 'just now' : `${diffSeconds} seconds ago`;
    }
    
    // Less than an hour ago
    if (diffMinutes < 60) {
      return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
    }
    
    // Less than a day ago
    if (diffHours < 24) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    }
    
    // Less than a week ago
    if (diffDays < 7) {
      return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
    }
    
    // Less than a month ago
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    }
    
    // For older dates, show the exact date and time
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDueDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else if (diffDays <= 7) {
      return `Due in ${diffDays} days`;
    } else {
      return formatDateOnly(dateString);
    }
  };

  // Helper function to determine task status based on list name (same as DragAndDrop)
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

  // Handle field changes and track modifications
  const handleFieldChange = (field: string, value: string) => {
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
        
        // Track both list and status as modified
        setModifiedFields(prev => {
          const newSet = new Set(prev);
          newSet.add('list_id');
          newSet.add('status');
          return newSet;
        });
      } else {
        setFormData(prev => ({ ...prev, [field]: actualValue }));
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: actualValue }));
    }
    
    // Check if field is different from original (only for non-list fields or when list change is handled above)
    if (field !== 'list_id') {
      const originalValue = originalTask[field as keyof Task] || '';
      const isModified = actualValue !== originalValue;
      
      setModifiedFields(prev => {
        const newSet = new Set(prev);
        if (isModified) {
          newSet.add(field);
        } else {
          newSet.delete(field);
        }
        return newSet;
      });
    }
    
    setHasUnsavedChanges(true);
  };

  // Save changes to server
  const handleSaveChanges = async () => {
    if (!hasUnsavedChanges) return;
    
    try {
      setIsSaving(true);
      
      const updates = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        assignee_id: formData.assignee_id || undefined,
        priority: formData.priority,
        // due_date: formData.due_date || undefined,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined,
        list_id: formData.list_id,
        status: formData.status,
        task_type: formData.task_type
      };

      console.log('Sending updates:', updates, ' task.id', task.id);


      await apiClient.put(`/api/tasks/${task.id}`, updates);
      
      trackEvent('TASK_UPDATE', {
        text: `User saved updates to task "${task.title}" - modified fields: ${Array.from(modifiedFields).join(', ')}`,
        task_id: task.id,
        updates: Array.from(modifiedFields),
        timestamp: new Date().toISOString()
      });
      
      // Clear auto-saved data after successful save
      localStorage.removeItem(`task-autosave-${task.id}`);
      setModifiedFields(new Set());
      setHasUnsavedChanges(false);
      setLastAutoSaved(null);
      
      toast.success('Task saved successfully!');
      onTaskUpdated();
      onClose();
    } catch (error: any) {
      console.error('Failed to save task:', error);
      toast.error(error.response?.data?.detail || 'Failed to save task');
    } finally {
      setIsSaving(false);
    }
  };

  // Discard all changes
  const handleDiscardChanges = () => {
    setFormData({
      title: originalTask.title,
      description: originalTask.description,
      assignee_id: originalTask.assignee_id || '',
      priority: originalTask.priority,
      due_date: originalTask.due_date || '',
      list_id: originalTask.list_id,
      status: originalTask.status,
      task_type: originalTask.task_type || 'task'
    });
    
    setModifiedFields(new Set());
    setHasUnsavedChanges(false);
    localStorage.removeItem(`task-autosave-${task.id}`);
    setLastAutoSaved(null);
    
    toast.success('Changes discarded');
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      setIsAddingComment(true);
      
      const commentData = {
        content: newComment.trim(),
        task_id: task.id
      };

      const response = await apiClient.post('/api/comments', commentData);
      const newCommentData = response.data;
      
      trackEvent('COMMENT_ADD', {
        text: `User added a ${newComment.length} character comment to task "${task.title}"`,
        task_id: task.id,
        comment_length: newComment.length,
        timestamp: new Date().toISOString()
      });
      
      // Immediately update local state instead of reloading from server
      setComments(prevComments => [...prevComments, newCommentData]);
      
      setNewComment('');
      toast.success('Comment added successfully!');
      
    } catch (error: any) {
      console.error('Failed to add comment:', error);
      toast.error(error.response?.data?.detail || 'Failed to add comment');
      
      // If there's an error, reload comments to ensure consistency
      await loadComments();
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleAddReply = async (parentCommentId: string) => {
    if (!replyContent.trim()) return;
    
    try {
      setIsAddingComment(true);
      
      const commentData = {
        content: replyContent.trim(),
        task_id: task.id,
        parent_comment_id: parentCommentId
      };

      const response = await apiClient.post('/api/comments', commentData);
      const newReply = response.data;
      
      trackEvent('COMMENT_REPLY', {
        text: `User replied to a comment on task "${task.title}" with a ${replyContent.length} character reply`,
        task_id: task.id,
        parent_comment_id: parentCommentId,
        reply_length: replyContent.length,
        timestamp: new Date().toISOString()
      });
      
      // Immediately update local state instead of reloading from server
      setComments(prevComments => {
        const updateCommentReplies = (comment: Comment): Comment => {
          if (comment.id === parentCommentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), newReply]
            };
          }
          
          // Recursively check nested replies
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map(updateCommentReplies)
            };
          }
          
          return comment;
        };
        
        return prevComments.map(updateCommentReplies);
      });
      
      setReplyContent('');
      setReplyingTo(null);
      toast.success('Reply added successfully!');
      
    } catch (error: any) {
      console.error('Failed to add reply:', error);
      toast.error(error.response?.data?.detail || 'Failed to add reply');
      
      // If there's an error, reload comments to ensure consistency
      await loadComments();
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleDeleteTask = async () => {
    try {
      setIsDeleting(true);
      
      // Soft delete - move to deleted status instead of permanent deletion
      const updates = {
        status: 'deleted'
      };
      
      await apiClient.put(`/api/tasks/${task.id}`, updates);
      
      trackEvent('TASK_SOFT_DELETE', {
        text: `User moved task "${task.title}" to recycle bin from ${task.status} status`,
        task_id: task.id,
        task_title: task.title,
        previous_status: task.status,
        timestamp: new Date().toISOString()
      });
      
      toast.success('Task moved to recycle bin successfully!');
      onTaskUpdated();
      onClose();
    } catch (error: any) {
      console.error('Failed to delete task:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRecoverTask = async () => {
    try {
      setIsDeleting(true);
      
      // Recover deleted task - move back to todo status
      const updates = {
        status: 'todo'
      };
      
      await apiClient.put(`/api/tasks/${task.id}`, updates);
      
      trackEvent('TASK_RECOVER', {
        text: `User recovered task "${task.title}" from recycle bin back to todo status`,
        task_id: task.id,
        task_title: task.title,
        recovered_to_status: 'todo',
        timestamp: new Date().toISOString()
      });
      
      toast.success('Task recovered successfully!');
      onTaskUpdated();
      onClose();
    } catch (error: any) {
      console.error('Failed to recover task:', error);
      toast.error(error.response?.data?.detail || 'Failed to recover task');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePermanentDelete = async () => {
    try {
      setIsDeleting(true);
      await apiClient.delete(`/api/tasks/${task.id}`);
      
      trackEvent('TASK_PERMANENT_DELETE', {
        text: `User permanently deleted task "${task.title}" from the system`,
        task_id: task.id,
        task_title: task.title,
        timestamp: new Date().toISOString()
      });
      
      // Clean up auto-saved data
      localStorage.removeItem(`task-autosave-${task.id}`);
      
      toast.success('Task permanently deleted!');
      onTaskUpdated();
      onClose();
    } catch (error: any) {
      console.error('Failed to permanently delete task:', error);
      toast.error(error.response?.data?.detail || 'Failed to permanently delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'urgent';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'secondary';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'todo':
      case 'to_do': return 'todo';
      case 'in_progress': 
      case 'progress': return 'progress';
      case 'review': return 'review';
      case 'done':
      case 'completed': return 'done';
      default: return 'secondary';
    }
  };

  const getTaskTypeColor = (taskType?: string): string => {
    switch (taskType?.toLowerCase()) {
      case 'feature': return 'bg-tag-frontend text-tag-frontend border-tag-frontend';
      case 'bug': return 'bg-error-disabled text-error border-error';
      case 'research': return 'bg-tag-backend text-tag-backend border-tag-backend';
      case 'fix': return 'bg-tag-auth text-tag-auth border-tag-auth';
      case 'story': return 'bg-success text-success border-success';
      default: return 'bg-accent-10 text-secondary border-secondary';
    }
  };

  return (
    <>
      <DialogHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-4">
            <div className="space-y-2">
              <Input
                value={formData.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className={`text-xl font-semibold bg-transparent border-none p-0 focus:bg-input focus:border-input-border focus:p-2 focus:rounded transition-all w-full break-words ${
                  modifiedFields.has('title') ? 'text-accent font-semibold' : ''
                }`}
                placeholder="Task title..."
              />
            </div>
            <DialogDescription className="mt-2">
              Task #{task.id.slice(-6)} • Created {formatRelativeDate(task.created_at)}
            </DialogDescription>
            
            {/* Auto-save indicator and toggle */}
            <div className="flex items-center justify-end gap-4 text-xs mt-2">
              {lastAutoSaved && (
                <div className="flex items-center gap-1 text-muted">
                  <Check className="h-3 w-3" />
                  Auto-saved at {lastAutoSaved.toLocaleTimeString()}
                </div>
              )}
              
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={autoSaveEnabled}
                  onCheckedChange={(checked) => setAutoSaveEnabled(checked === true)}
                />
                <span className="text-muted">Auto-save</span>
              </label>
            </div>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-6 py-4 pl-2 pr-6 max-h-[60vh] overflow-y-auto">
        {/* Status and Priority Section */}
        <div className="flex items-center gap-4 flex-wrap">
          {formData.task_type && (
            <Badge 
              variant="secondary" 
              size="sm"
              className={getTaskTypeColor(formData.task_type)}
            >
              {formData.task_type.charAt(0).toUpperCase() + formData.task_type.slice(1)}
              {modifiedFields.has('task_type') && <span className="ml-1 text-accent">•</span>}
            </Badge>
          )}
          <Badge variant={getPriorityColor(formData.priority)} size="sm">
            {formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)} Priority
          </Badge>
          <Badge variant={getStatusVariant(formData.status)} size="sm">
            {formData.status.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            {modifiedFields.has('status') && <span className="ml-1 text-accent">•</span>}
          </Badge>
          {formData.due_date && (
            <Badge variant="warning" size="sm">
              <Calendar className="h-3 w-3 mr-1" />
              Due {formatDueDateDisplay(formData.due_date)}
            </Badge>
          )}
        </div>

        {/* Task Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Description */}
          <div className="md:col-span-2">
            <Label className={`text-sm font-medium mb-2 block ${
              modifiedFields.has('description') ? 'text-accent' : 'text-primary'
            }`}>
              Description {modifiedFields.has('description') && <span className="text-accent">•</span>}
            </Label>
            <textarea
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Add task description, user stories, acceptance criteria..."
              className={`w-full min-h-[120px] px-3 py-2 bg-input border rounded-md text-input placeholder:text-input-placeholder focus:border-input-border-focus focus:outline-none resize-none transition-all ${
                modifiedFields.has('description') ? 'border-accent' : 'border-input-border'
              }`}
              rows={6}
            />
          </div>

          {/* Assignee */}
          <div>
            <Label className={`text-sm font-medium mb-2 block flex items-center ${
              modifiedFields.has('assignee_id') ? 'text-accent' : 'text-primary'
            }`}>
              <User className="h-4 w-4 mr-2" />
              Assigned to {modifiedFields.has('assignee_id') && <span className="text-accent ml-1">•</span>}
            </Label>
            <CustomDropdownMenu
              value={formData.assignee_id || 'unassigned'}
              onChange={(value) => handleFieldChange('assignee_id', value)}
              placeholder="Select assignee..."
              className={modifiedFields.has('assignee_id') ? 'border-accent' : ''}
              options={[
                {
                  value: 'unassigned',
                  label: 'Unassigned',
                  icon: null
                },
                ...users.map((user) => ({
                  value: user.id,
                  label: user.full_name,
                  icon: <Avatar size="xs" name={user.full_name} className="mr-2" />
                }))
              ]}
            />
          </div>

          {/* Priority */}
          <div>
            <Label className={`text-sm font-medium mb-2 block flex items-center ${
              modifiedFields.has('priority') ? 'text-accent' : 'text-primary'
            }`}>
              <AlertCircle className="h-4 w-4 mr-2" />
              Priority {modifiedFields.has('priority') && <span className="text-accent ml-1">•</span>}
            </Label>
            <CustomDropdownMenu
              value={formData.priority}
              onChange={(value) => handleFieldChange('priority', value)}
              className={modifiedFields.has('priority') ? 'border-accent' : ''}
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

          {/* Task Type */}
          <div>
            <Label className={`text-sm font-medium mb-2 block flex items-center ${
              modifiedFields.has('task_type') ? 'text-accent' : 'text-primary'
            }`}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Task Type {modifiedFields.has('task_type') && <span className="text-accent ml-1">•</span>}
            </Label>
            <CustomDropdownMenu
              value={formData.task_type}
              onChange={(value) => handleFieldChange('task_type', value)}
              className={modifiedFields.has('task_type') ? 'border-accent' : ''}
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

          {/* Due Date */}
          <div>
            <Label className={`text-sm font-medium mb-2 block flex items-center ${
              modifiedFields.has('due_date') ? 'text-accent' : 'text-primary'
            }`}>
              <Calendar className="h-4 w-4 mr-2" />
              Due Date {modifiedFields.has('due_date') && <span className="text-accent ml-1">•</span>}
            </Label>
            <DatePicker
              value={formData.due_date ? new Date(formData.due_date) : null}
              onChange={(date) => handleFieldChange('due_date', date ? date.toISOString() : '')}
              minDate={new Date()}
              className={modifiedFields.has('due_date') ? 'border-accent' : ''}
            />
          </div>

          {/* Custom Fields */}
          <div className="col-span-2">
            <CustomFieldsSection
              entityType="task"
              entityId={task.id}
              canEdit={true}
              compact={true}
              className="mt-4"
            />
          </div>

          {/* List */}
          <div>
            <Label className={`text-sm font-medium mb-2 block ${
              modifiedFields.has('list_id') ? 'text-accent' : 'text-primary'
            }`}>
              Current List {modifiedFields.has('list_id') && <span className="text-accent">•</span>}
              {modifiedFields.has('status') && (
                <span className="text-xs text-accent ml-2">(Status will update)</span>
              )}
            </Label>
            <CustomDropdownMenu
              value={formData.list_id}
              onChange={(value) => handleFieldChange('list_id', value)}
              className={modifiedFields.has('list_id') ? 'border-accent' : ''}
              options={lists.map((list) => ({
                value: list.id,
                label: list.name,
                icon: null
              }))}
            />
          </div>
        </div>

        {/* Time Tracking Section */}
        <div className="border-t border-secondary pt-6">
          <TaskTimeTracking
            taskId={task.id}
            taskTitle={task.title}
            projectId={task.project_id}
            canEdit={true}
          />
        </div>

        {/* Dependencies Section */}
        <div className="border-t border-secondary pt-6">
          <TaskDependencies
            taskId={task.id}
            projectId={task.project_id || ''}
            currentTaskStatus={task.status}
            onDependenciesChange={onTaskUpdated}
          />
        </div>

        {/* Comments Section */}
        <div className="border-t border-secondary pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-primary flex items-center">
              <MessageSquare className="h-4 w-4 mr-2" />
              Comments ({comments.length})
            </h4>
          </div>

          {/* Add Comment */}
          <div className="flex space-x-3 mb-4">
            <Avatar size="sm" name={currentUser.full_name} />
            <div className="flex-1 space-y-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full min-h-[60px] px-3 py-2 bg-input border border-input-border rounded-md text-input placeholder:text-input-placeholder focus:border-input-border-focus focus:outline-none resize-none"
                rows={2}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isAddingComment}
                  leftIcon={<Send className="h-3 w-3" />}
                >
                  {isAddingComment ? 'Adding...' : 'Comment'}
                </Button>
              </div>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-4">
            {loadingComments ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted">Loading comments...</p>
              </div>
            ) : comments.length > 0 ? (
              comments.map((comment) => (
                <CommentItem 
                  key={comment.id} 
                  comment={comment} 
                  currentUser={currentUser}
                  onReply={(commentId) => setReplyingTo(commentId)}
                  replyingTo={replyingTo}
                  replyContent={replyContent}
                  onReplyContentChange={setReplyContent}
                  onSubmitReply={handleAddReply}
                  onCancelReply={() => {
                    setReplyingTo(null);
                    setReplyContent('');
                  }}
                  formatRelativeDate={formatRelativeDate}
                  depth={0}
                />
              ))
            ) : (
              <div className="text-center py-6">
                <MessageSquare className="h-8 w-8 text-muted mx-auto mb-2" />
                <p className="text-sm text-muted">No comments yet</p>
                <p className="text-xs text-muted">Be the first to comment on this task</p>
              </div>
            )}
          </div>
        </div>

        {/* Task Metadata */}
        <div className="border-t border-secondary pt-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted">Created:</span>
              <span className="text-primary ml-2">{formatDetailedDate(task.created_at)}</span>
            </div>
            <div>
              <span className="text-muted">Activity:</span>
              <span className="text-primary ml-2">
                {comments.length} comments • {task.attachments_count || 0} attachments
              </span>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <div className="flex justify-between w-full">
          <div className="flex gap-2">
            {task.status === 'deleted' ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleRecoverTask}
                  className="text-success hover:bg-success hover:text-white"
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Recovering...' : 'Recover Task'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-error hover:bg-error hover:text-white"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                >
                  Delete Permanently
                </Button>
              </>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteConfirm(true)}
                className="text-error hover:bg-error hover:text-white"
                leftIcon={<Trash2 className="h-4 w-4" />}
              >
                Delete
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            {hasUnsavedChanges && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleDiscardChanges}
                  leftIcon={<X className="h-4 w-4" />}
                >
                  Discard Changes
                </Button>
                <Button 
                  onClick={handleSaveChanges} 
                  disabled={isSaving}
                  leftIcon={isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogFooter>

      {/* Delete/Permanent Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={task.status === 'deleted' ? handlePermanentDelete : handleDeleteTask}
        title={task.status === 'deleted' ? "Permanently Delete Task" : "Delete Task"}
        description={
          task.status === 'deleted' 
            ? `Are you sure you want to permanently delete "${task.title}"? This action cannot be undone and will remove all comments and attachments associated with this task.`
            : `Are you sure you want to delete "${task.title}"? The task will be moved to the recycle bin where it can be recovered later.`
        }
        confirmText={task.status === 'deleted' ? "Delete Permanently" : "Move to Recycle Bin"}
        cancelText="Cancel"
        type="danger"
        loading={isDeleting}
      />
    </>
  );
} 