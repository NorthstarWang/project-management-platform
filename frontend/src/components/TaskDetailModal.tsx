'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
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
import { 
  User,
  Calendar,
  MessageSquare,
  Edit,
  Save,
  X,
  Send,
  AlertCircle,
  Trash2
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import { toast } from '@/components/ui/CustomToast';

interface Task {
  id: string;
  title: string;
  description: string;
  list_id: string;
  assignee_id?: string;
  assignee_name?: string;
  priority: string;
  status: string;
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
  user_id: string;
  user_name: string;
  task_id: string;
  created_at: string;
  updated_at?: string;
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
      track(actionType, payload);
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }
};

export default function TaskDetailModal({
  task,
  lists,
  users,
  currentUser,
  onClose,
  onTaskUpdated
}: TaskDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  
  const [editForm, setEditForm] = useState({
    title: task.title,
    description: task.description,
    assignee_id: task.assignee_id || '',
    priority: task.priority,
    due_date: task.due_date || '',
    list_id: task.list_id
  });

  useEffect(() => {
    loadComments();
    trackEvent('TASK_DETAIL_VIEW', {
      task_id: task.id,
      task_title: task.title,
      timestamp: new Date().toISOString()
    });
  }, [task.id]);

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

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const loadComments = async () => {
    try {
      setLoadingComments(true);
      const response = await apiClient.get(`/api/tasks/${task.id}/comments`);
      setComments(response.data);
    } catch (error) {
      console.error('Failed to load comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSaveChanges = async () => {
    try {
      setIsUpdating(true);
      
      const updates = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        assignee_id: editForm.assignee_id || undefined,
        priority: editForm.priority,
        due_date: editForm.due_date || undefined,
        list_id: editForm.list_id
      };

      await apiClient.put(`/api/tasks/${task.id}`, updates);
      
      trackEvent('TASK_UPDATE', {
        task_id: task.id,
        updates: Object.keys(updates),
        timestamp: new Date().toISOString()
      });
      
      toast.success('Task updated successfully!');
      setIsEditing(false);
      onTaskUpdated();
    } catch (error: any) {
      console.error('Failed to update task:', error);
      toast.error(error.response?.data?.detail || 'Failed to update task');
    } finally {
      setIsUpdating(false);
    }
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
      
      trackEvent('COMMENT_ADD', {
        task_id: task.id,
        comment_length: newComment.length,
        timestamp: new Date().toISOString()
      });
      
      setComments(prev => [...prev, response.data]);
      setNewComment('');
      toast.success('Comment added successfully!');
    } catch (error: any) {
      console.error('Failed to add comment:', error);
      toast.error(error.response?.data?.detail || 'Failed to add comment');
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.delete(`/api/tasks/${task.id}`);
      
      trackEvent('TASK_DELETE', {
        task_id: task.id,
        task_title: task.title,
        timestamp: new Date().toISOString()
      });
      
      toast.success('Task deleted successfully!');
      onTaskUpdated();
      onClose();
    } catch (error: any) {
      console.error('Failed to delete task:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete task');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
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

  return (
    <>
      <DialogHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-4">
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={editForm.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="text-lg font-semibold"
                  placeholder="Task title..."
                />
              </div>
            ) : (
              <DialogTitle className="text-xl">{task.title}</DialogTitle>
            )}
            <DialogDescription className="mt-2">
              Task #{task.id.slice(-6)} • Created {formatRelativeDate(task.created_at)}
            </DialogDescription>
          </div>
        </div>
        
        {/* Action Buttons Row - Separate from header to prevent overlapping */}
        <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-secondary">
          {!isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              leftIcon={<Edit className="h-4 w-4" />}
            >
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setEditForm({
                    title: task.title,
                    description: task.description,
                    assignee_id: task.assignee_id || '',
                    priority: task.priority,
                    due_date: task.due_date || '',
                    list_id: task.list_id
                  });
                }}
                leftIcon={<X className="h-4 w-4" />}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveChanges}
                disabled={isUpdating}
                leftIcon={<Save className="h-4 w-4" />}
              >
                {isUpdating ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      </DialogHeader>

      <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
        {/* Status and Priority Section */}
        <div className="flex items-center gap-4 flex-wrap">
          <Badge variant={getPriorityColor(isEditing ? editForm.priority : task.priority)} size="sm">
            {isEditing ? editForm.priority : task.priority} priority
          </Badge>
          <Badge variant="secondary" size="sm">
            {task.status.replace('_', ' ')}
          </Badge>
          {task.due_date && (
            <Badge variant="warning" size="sm">
              <Calendar className="h-3 w-3 mr-1" />
              Due {formatRelativeDate(task.due_date)}
            </Badge>
          )}
        </div>

        {/* Task Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Description */}
          <div className="md:col-span-2">
            <Label className="text-sm font-medium text-primary mb-2 block">Description</Label>
            {isEditing ? (
              <textarea
                value={editForm.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Add task description, user stories, acceptance criteria..."
                className="w-full min-h-[120px] px-3 py-2 bg-input border border-input-border rounded-md text-input placeholder:text-input-placeholder focus:border-input-border-focus focus:outline-none resize-none"
                rows={6}
              />
            ) : (
              <div className="bg-card-content p-4 rounded-lg border border-card-content">
                {task.description ? (
                  <div className="whitespace-pre-wrap text-sm text-secondary leading-relaxed">
                    {task.description}
                  </div>
                ) : (
                  <p className="text-sm text-muted italic">No description provided</p>
                )}
              </div>
            )}
          </div>

          {/* Assignee */}
          <div>
            <Label className="text-sm font-medium text-primary mb-2 block flex items-center">
              <User className="h-4 w-4 mr-2" />
              Assigned to
            </Label>
            {isEditing ? (
              <Select
                value={editForm.assignee_id}
                onValueChange={(value) => handleInputChange('assignee_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    <span className="text-muted">Unassigned</span>
                  </SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center">
                        <Avatar size="xs" name={user.full_name} className="mr-2" />
                        <span>{user.full_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center space-x-2">
                {task.assignee_name ? (
                  <>
                    <Avatar size="sm" name={task.assignee_name} />
                    <span className="text-sm text-primary">{task.assignee_name}</span>
                  </>
                ) : (
                  <span className="text-sm text-muted">Unassigned</span>
                )}
              </div>
            )}
          </div>

          {/* Priority */}
          <div>
            <Label className="text-sm font-medium text-primary mb-2 block flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              Priority
            </Label>
            {isEditing ? (
              <Select
                value={editForm.priority}
                onValueChange={(value) => handleInputChange('priority', value)}
              >
                <SelectTrigger>
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
            ) : (
              <Badge variant={getPriorityColor(task.priority)} size="sm">
                {task.priority}
              </Badge>
            )}
          </div>

          {/* Due Date */}
          <div>
            <Label className="text-sm font-medium text-primary mb-2 block flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Due Date
            </Label>
            {isEditing ? (
              <Input
                type="datetime-local"
                value={editForm.due_date}
                onChange={(e) => handleInputChange('due_date', e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            ) : (
              <span className="text-sm text-primary">
                {task.due_date ? formatDetailedDate(task.due_date) : 'No due date'}
              </span>
            )}
          </div>

          {/* List */}
          <div>
            <Label className="text-sm font-medium text-primary mb-2 block">Current List</Label>
            {isEditing ? (
              <Select
                value={editForm.list_id}
                onValueChange={(value) => handleInputChange('list_id', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm text-primary font-medium">
                {lists.find(l => l.id === task.list_id)?.name || 'Unknown List'}
              </span>
            )}
          </div>
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
                <div key={comment.id} className="flex space-x-3">
                  <Avatar size="sm" name={comment.user_name} />
                  <div className="flex-1">
                    <div className="bg-card-content p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-primary">
                          {comment.user_name}
                        </span>
                        <span className="text-xs text-muted">
                          {formatRelativeDate(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-secondary whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </div>
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
          <Button 
            variant="outline" 
            onClick={handleDeleteTask}
            className="text-error hover:bg-error hover:text-white"
            leftIcon={<Trash2 className="h-4 w-4" />}
          >
            Delete
          </Button>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {isEditing && (
              <Button 
                onClick={handleSaveChanges} 
                disabled={isUpdating}
                leftIcon={<Save className="h-4 w-4" />}
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
        </div>
      </DialogFooter>
    </>
  );
} 