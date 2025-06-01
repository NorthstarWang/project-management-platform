'use client';

import React, { useState, useRef } from 'react';
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { useDroppable } from '@dnd-kit/react';
import { CollisionPriority } from '@dnd-kit/abstract';
import { move } from '@dnd-kit/helpers';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/CustomToast';
import { 
  CustomDialog as Dialog,
  CustomDialogContent as DialogContent,
  CustomDialogHeader as DialogHeader,
  CustomDialogTitle as DialogTitle,
  CustomDialogDescription as DialogDescription
} from '@/components/ui/CustomDialog';
import { 
  GripVertical, 
  Trash2, 
  RotateCcw, 
  Plus,
  AlertTriangle
} from 'lucide-react';

// Status interface
interface Status {
  id: string;
  name: string;
  color: string;
  position: number;
  isDeletable: boolean;
  isCustom?: boolean;
}

// Default statuses that cannot be deleted
const DEFAULT_STATUSES: Status[] = [
  { id: 'backlog', name: 'Backlog', color: '#6B7280', position: 0, isDeletable: true },
  { id: 'todo', name: 'To Do', color: '#3B82F6', position: 1, isDeletable: true },
  { id: 'in_progress', name: 'In Progress', color: '#F59E0B', position: 2, isDeletable: true },
  { id: 'review', name: 'Review', color: '#8B5CF6', position: 3, isDeletable: true },
  { id: 'done', name: 'Done', color: '#10B981', position: 4, isDeletable: true },
  { id: 'archived', name: 'Archived', color: '#9CA3AF', position: 5, isDeletable: false },
  { id: 'deleted', name: 'Deleted', color: '#EF4444', position: 6, isDeletable: false }
];

// Draggable Status Item Component
interface DraggableStatusProps {
  status: Status;
  index: number;
  onDelete: (status: Status) => void;
  onColorChange: (statusId: string, color: string) => void;
  onNameChange: (statusId: string, name: string) => void;
}

function DraggableStatus({ 
  status, 
  index, 
  onDelete, 
  onColorChange, 
  onNameChange 
}: DraggableStatusProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(status.name);
  
  const { ref, isDragging } = useSortable({
    id: status.id,
    index,
    type: 'status',
    accept: 'status'
  });

  const handleNameSave = () => {
    if (editName.trim() && editName !== status.name) {
      onNameChange(status.id, editName.trim());
    } else {
      setEditName(status.name);
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setEditName(status.name);
      setIsEditing(false);
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-3 p-4 bg-card rounded-lg border border-card',
        'hover:shadow-md transition-all duration-200',
        isDragging && 'opacity-50 scale-95 z-50 shadow-lg'
      )}
    >
      {/* Drag Handle */}
      <div className="cursor-grab active:cursor-grabbing text-muted hover:text-secondary transition-colors">
        <GripVertical className="h-5 w-5" />
      </div>
      
      {/* Status Color */}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={status.color}
          onChange={(e) => onColorChange(status.id, e.target.value)}
          className="w-8 h-8 rounded border border-muted cursor-pointer"
          title={`Change ${status.name} color`}
          aria-label={`Change ${status.name} color`}
          disabled={!status.isDeletable && status.id !== 'archived' && status.id !== 'deleted'}
        />
      </div>
      
      {/* Status Name */}
      <div className="flex-1">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={handleKeyPress}
            className="w-full px-2 py-1 text-sm font-medium bg-surface border border-muted rounded focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label={`Edit ${status.name} status name`}
            autoFocus
          />
        ) : (
          <div
            className={cn(
              "text-sm font-medium text-primary",
              status.isDeletable && "cursor-pointer hover:text-accent"
            )}
            onClick={() => status.isDeletable && setIsEditing(true)}
          >
            {status.name}
            {!status.isDeletable && (
              <span className="ml-2 text-xs text-muted">(non-removable)</span>
            )}
          </div>
        )}
      </div>
      
      {/* Position Indicator */}
      <div className="text-xs text-muted bg-surface px-2 py-1 rounded">
        #{index + 1}
      </div>
      
      {/* Delete Button */}
      {status.isDeletable && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(status)}
          className="text-error hover:text-error hover:bg-error/10 p-1"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// Droppable Container for Statuses
interface DroppableStatusContainerProps {
  children: React.ReactNode;
}

function DroppableStatusContainer({ children }: DroppableStatusContainerProps) {
  const { isDropTarget, ref } = useDroppable({
    id: 'status-container',
    type: 'container',
    accept: 'status',
    collisionPriority: CollisionPriority.Low,
  });

  return (
    <div
      ref={ref}
      className={cn(
        'space-y-3 min-h-[400px] p-4 rounded-lg border-2 border-dashed',
        'transition-all duration-200',
        isDropTarget ? 'border-accent bg-accent/5' : 'border-muted bg-surface/50'
      )}
    >
      {children}
    </div>
  );
}

// Task Migration Step Component
interface TaskMigrationStepProps {
  deletedStatuses: Status[];
  statuses: Status[];
  taskCounts: Record<string, number>;
  migrationMapping: Record<string, string>;
  onMappingChange: (oldStatusId: string, newStatusId: string) => void;
}

function TaskMigrationStep({ 
  deletedStatuses, 
  statuses, 
  taskCounts, 
  migrationMapping, 
  onMappingChange 
}: TaskMigrationStepProps) {
  if (deletedStatuses.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-warning">
        <AlertTriangle className="h-5 w-5" />
        <h3 className="font-medium">Task Migration Required</h3>
      </div>
      
      <p className="text-sm text-secondary">
        You&apos;ve removed some statuses that contain tasks. Please choose where to move these tasks:
      </p>
      
      <div className="space-y-3">
        {deletedStatuses.map((deletedStatus) => {
          const taskCount = taskCounts[deletedStatus.id] || 0;
          if (taskCount === 0) return null;
          
          return (
            <div key={deletedStatus.id} className="flex items-center justify-between p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: deletedStatus.color }}
                />
                <div>
                  <span className="font-medium text-primary">{deletedStatus.name}</span>
                  <span className="ml-2 text-sm text-secondary">({taskCount} tasks)</span>
                </div>
              </div>
              
              <select
                value={migrationMapping[deletedStatus.id] || ''}
                onChange={(e) => onMappingChange(deletedStatus.id, e.target.value)}
                className="px-3 py-1 text-sm bg-surface border border-muted rounded focus:outline-none focus:ring-2 focus:ring-accent"
                aria-label={`Choose destination for ${deletedStatus.name} tasks`}
              >
                <option value="">Choose destination...</option>
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Main Modal Component
interface CustomizeStatusesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStatuses?: Status[];
  onSave: (statuses: Status[], migrationMapping: Record<string, string>) => Promise<void>;
  taskCounts?: Record<string, number>;
}

export function CustomizeStatusesModal({ 
  open, 
  onOpenChange, 
  initialStatuses = DEFAULT_STATUSES,
  onSave,
  taskCounts = {}
}: CustomizeStatusesModalProps) {
  const [statuses, setStatuses] = useState<Status[]>(() => 
    [...initialStatuses].sort((a, b) => a.position - b.position)
  );
  const [statusOrder, setStatusOrder] = useState<string[]>(() => 
    statuses.map(s => s.id)
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [statusToDelete, setStatusToDelete] = useState<Status | null>(null);
  const [isStep1, setIsStep1] = useState(true);
  const [deletedStatuses, setDeletedStatuses] = useState<Status[]>([]);
  const [migrationMapping, setMigrationMapping] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Keep ref of previous state for cancellation
  const previousStatusOrder = useRef(statusOrder);

  React.useEffect(() => {
    const newStatuses = [...initialStatuses].sort((a, b) => a.position - b.position);
    setStatuses(newStatuses);
    setStatusOrder(newStatuses.map(s => s.id));
    setIsStep1(true);
    setDeletedStatuses([]);
    setMigrationMapping({});
  }, [open, initialStatuses]);

  const handleDeleteStatus = (status: Status) => {
    if (!status.isDeletable) {
      toast.error('This status cannot be deleted');
      return;
    }

    const remainingDeletableStatuses = statuses.filter(s => s.isDeletable && s.id !== status.id);
    if (remainingDeletableStatuses.length === 0) {
      toast.error('You must keep at least one deletable status');
      return;
    }

    setStatusToDelete(status);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (!statusToDelete) return;

    // Check if status has tasks
    const taskCount = taskCounts[statusToDelete.id] || 0;
    if (taskCount > 0) {
      setDeletedStatuses(prev => [...prev, statusToDelete]);
    }

    // Remove from current statuses
    setStatuses(prev => prev.filter(s => s.id !== statusToDelete.id));
    setStatusOrder(prev => prev.filter(id => id !== statusToDelete.id));
    
    setStatusToDelete(null);
    setShowDeleteConfirm(false);
    toast.success(`Removed "${statusToDelete.name}" status`);
  };

  const handleColorChange = (statusId: string, color: string) => {
    setStatuses(prev => prev.map(s => 
      s.id === statusId ? { ...s, color } : s
    ));
  };

  const handleNameChange = (statusId: string, name: string) => {
    if (!name.trim()) return;
    
    setStatuses(prev => prev.map(s => 
      s.id === statusId ? { ...s, name: name.trim() } : s
    ));
  };

  const handleResetToDefault = () => {
    setStatuses([...DEFAULT_STATUSES]);
    setStatusOrder(DEFAULT_STATUSES.map(s => s.id));
    setDeletedStatuses([]);
    setMigrationMapping({});
    setIsStep1(true);
    toast.success('Reset to default statuses');
  };

  const handleAddCustomStatus = () => {
    const customId = `custom_${Date.now()}`;
    const newStatus: Status = {
      id: customId,
      name: 'New Status',
      color: '#6366F1',
      position: statuses.length,
      isDeletable: true,
      isCustom: true
    };
    
    setStatuses(prev => [...prev, newStatus]);
    setStatusOrder(prev => [...prev, customId]);
    toast.success('Added new custom status');
  };

  const canProceedToStep2 = () => {
    if (deletedStatuses.length === 0) return true;
    
    return deletedStatuses.every(deletedStatus => {
      const taskCount = taskCounts[deletedStatus.id] || 0;
      return taskCount === 0 || migrationMapping[deletedStatus.id];
    });
  };

  const handleSave = async () => {
    if (!canProceedToStep2()) {
      toast.error('Please select destination for all tasks from deleted statuses');
      return;
    }

    setIsSaving(true);
    try {
      // Update positions based on current order
      const updatedStatuses = statusOrder.map((id, index) => {
        const status = statuses.find(s => s.id === id);
        return status ? { ...status, position: index } : null;
      }).filter(Boolean) as Status[];

      await onSave(updatedStatuses, migrationMapping);
      onOpenChange(false);
      toast.success('Status configuration saved successfully');
    } catch (error) {
      console.error('Failed to save status configuration:', error);
      toast.error('Failed to save status configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = () => {
    const currentOrder = statusOrder.join(',');
    const originalOrder = initialStatuses.map(s => s.id).join(',');
    return currentOrder !== originalOrder || 
           deletedStatuses.length > 0 ||
           JSON.stringify(statuses) !== JSON.stringify(initialStatuses);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {isStep1 ? 'Customize Status Columns' : 'Task Migration'}
            </DialogTitle>
            <DialogDescription>
              {isStep1 
                ? 'Drag and drop to reorder statuses, customize names and colors, or delete unwanted statuses.'
                : 'Choose where to move tasks from deleted statuses.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {isStep1 ? (
              <div className="space-y-6">
                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Plus className="h-4 w-4" />}
                      onClick={handleAddCustomStatus}
                    >
                      Add Status
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<RotateCcw className="h-4 w-4" />}
                      onClick={handleResetToDefault}
                    >
                      Reset to Default
                    </Button>
                  </div>
                  <div className="text-sm text-secondary">
                    {statuses.length} statuses
                  </div>
                </div>

                {/* Instructions */}
                <div className="p-3 bg-surface/50 rounded-lg border border-muted">
                  <p className="text-sm text-secondary">
                    <strong>Instructions:</strong> Drag the grip handle to reorder statuses. 
                    Click on status names to edit them. The Archived and Deleted statuses are required and cannot be removed.
                    You must keep at least one regular status.
                  </p>
                </div>

                {/* Drag and Drop Area */}
                <DragDropProvider
                  onDragStart={() => {
                    previousStatusOrder.current = statusOrder;
                  }}
                  onDragOver={(event) => {
                    const { source } = event.operation;
                    if (!source || source?.type !== 'status') return;
                    
                    setStatusOrder((order) => move(order, event));
                  }}
                  onDragEnd={(event) => {
                    if (event.canceled) {
                      setStatusOrder(previousStatusOrder.current);
                      return;
                    }
                  }}
                >
                  <DroppableStatusContainer>
                    {statusOrder.map((statusId, index) => {
                      const status = statuses.find(s => s.id === statusId);
                      if (!status) return null;
                      
                      return (
                        <DraggableStatus
                          key={status.id}
                          status={status}
                          index={index}
                          onDelete={handleDeleteStatus}
                          onColorChange={handleColorChange}
                          onNameChange={handleNameChange}
                        />
                      );
                    })}
                  </DroppableStatusContainer>
                </DragDropProvider>
              </div>
            ) : (
              <TaskMigrationStep
                deletedStatuses={deletedStatuses}
                statuses={statuses}
                taskCounts={taskCounts}
                migrationMapping={migrationMapping}
                onMappingChange={(oldStatusId, newStatusId) => {
                  setMigrationMapping(prev => ({ ...prev, [oldStatusId]: newStatusId }));
                }}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-muted">
            <div className="text-sm text-secondary">
              {hasChanges() && (
                <span className="text-warning">• Unsaved changes</span>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              
              {isStep1 && deletedStatuses.length > 0 ? (
                <Button
                  onClick={() => setIsStep1(false)}
                  disabled={!hasChanges()}
                >
                  Next: Migrate Tasks
                </Button>
              ) : (
                <Button
                  onClick={handleSave}
                  disabled={isSaving || (!hasChanges() && isStep1) || (!canProceedToStep2() && !isStep1)}
                  loading={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Status"
        description={`Are you sure you want to delete the "${statusToDelete?.name}" status? ${
          taskCounts[statusToDelete?.id || ''] > 0 
            ? `This status contains ${taskCounts[statusToDelete?.id || '']} tasks that will need to be moved.`
            : 'This action cannot be undone.'
        }`}
        confirmText="Delete Status"
        type="danger"
      />
    </>
  );
} 