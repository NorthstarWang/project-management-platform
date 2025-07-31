'use client';

import React, { useState, useEffect } from 'react';
import {
  WorkflowTemplate,
  WorkflowStep,
  CreateWorkflowRequest,
  ActionType,
  WorkflowInstance,
  WorkflowStatus
} from '@/types/dependency';
import { dependencyService } from '@/services/dependencyService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {
  Plus,
  Trash2,
  Edit2,
  Play,
  Settings,
  ChevronUp,
  ChevronDown,
  Zap,
  Activity
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';

interface WorkflowBuilderProps {
  boardId: string;
  onWorkflowCreated?: (template: WorkflowTemplate) => void;
}

interface StepConfig {
  name: string;
  description: string;
  action_type: ActionType;
  action_config: Record<string, any>;
  conditions: Array<{
    condition_type: string;
    condition_config: Record<string, any>;
  }>;
}

export function WorkflowBuilder({ boardId, onWorkflowCreated }: WorkflowBuilderProps) {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newTemplate, setNewTemplate] = useState<CreateWorkflowRequest>({
    name: '',
    description: '',
    board_id: boardId,
    steps: [],
    triggers: []
  });
  const [steps, setSteps] = useState<StepConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWorkflows();
  }, [boardId]);

  const loadWorkflows = async () => {
    try {
      setIsLoading(true);
      const [temps, insts] = await Promise.all([
        dependencyService.getWorkflowTemplates(boardId),
        dependencyService.getWorkflowInstances()
      ]);
      setTemplates(temps);
      setInstances(insts);
    } catch (error) {
      console.error('Error loading workflows:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWorkflow = async () => {
    if (!newTemplate.name || steps.length === 0) return;

    try {
      const request: CreateWorkflowRequest = {
        ...newTemplate,
        steps: steps
      };
      const template = await dependencyService.createWorkflowTemplate(request);
      await loadWorkflows();
      setIsCreating(false);
      resetForm();
      onWorkflowCreated?.(template);
    } catch (error) {
      console.error('Error creating workflow:', error);
    }
  };

  const handleToggleActive = async (template: WorkflowTemplate) => {
    try {
      await dependencyService.updateWorkflowTemplate(template.id, {
        is_active: !template.is_active
      });
      await loadWorkflows();
    } catch (error) {
      console.error('Error updating workflow:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this workflow template?')) return;

    try {
      await dependencyService.deleteWorkflowTemplate(templateId);
      await loadWorkflows();
    } catch (error) {
      console.error('Error deleting workflow:', error);
    }
  };

  const addStep = () => {
    setSteps([...steps, {
      name: '',
      description: '',
      action_type: ActionType.UPDATE_TASK,
      action_config: {},
      conditions: []
    }]);
  };

  const updateStep = (index: number, updates: Partial<StepConfig>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === steps.length - 1)
    ) {
      return;
    }

    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    setSteps(newSteps);
  };

  const resetForm = () => {
    setNewTemplate({
      name: '',
      description: '',
      board_id: boardId,
      steps: [],
      triggers: []
    });
    setSteps([]);
  };

  const getInstancesForTemplate = (templateId: string) => {
    return instances.filter(i => i.template_id === templateId);
  };

  const getActionConfigUI = (actionType: ActionType) => {
    switch (actionType) {
      case ActionType.UPDATE_TASK:
        return (
          <div className="space-y-2">
            <Label>New Status</Label>
            <Select
              onValueChange={(value) => updateStep(steps.length - 1, {
                action_config: { status: value }
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case ActionType.ASSIGN_TASK:
        return (
          <div className="space-y-2">
            <Label>Assignment Method</Label>
            <Select
              onValueChange={(value) => updateStep(steps.length - 1, {
                action_config: { assignment_method: value }
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="round_robin">Round Robin</SelectItem>
                <SelectItem value="least_loaded">Least Loaded</SelectItem>
                <SelectItem value="specific_role">Specific Role</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case ActionType.SEND_NOTIFICATION:
        return (
          <div className="space-y-2">
            <Label>Message Template</Label>
            <Textarea
              placeholder="Enter message template..."
              onChange={(e) => updateStep(steps.length - 1, {
                action_config: { message_template: e.target.value }
              })}
            />
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading workflows...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Workflow Automation</h3>
        <Button
          onClick={() => setIsCreating(true)}
          data-testid="create-workflow-button"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="instances">Active Instances</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {templates.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Zap className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No workflow templates yet.</p>
                <p className="text-sm text-gray-400 mt-2">Create your first workflow to automate tasks.</p>
              </CardContent>
            </Card>
          ) : (
            templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={template.is_active}
                        onCheckedChange={() => handleToggleActive(template)}
                        data-testid={`toggle-workflow-${template.id}`}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {template.steps.length} steps
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {getInstancesForTemplate(template.id).length} instances
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Triggers:</div>
                    <div className="flex flex-wrap gap-2">
                      {template.triggers.map((trigger, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {trigger.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="instances" className="space-y-4">
          {instances.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No active workflow instances.</p>
              </CardContent>
            </Card>
          ) : (
            instances.map((instance) => {
              const template = templates.find(t => t.id === instance.template_id);
              return (
                <Card key={instance.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">
                          {template?.name || 'Unknown Workflow'}
                        </CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                          Started {new Date(instance.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge
                        className={dependencyService.getWorkflowStatusColor(instance.status)}
                      >
                        {instance.status}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Workflow Dialog */}
      <Dialog open={isCreating || isEditing} onOpenChange={(open) => {
        if (!open) {
          setIsCreating(false);
          setIsEditing(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? 'Create New Workflow' : 'Edit Workflow'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Workflow Name</Label>
              <Input
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="e.g., Development Workflow"
                data-testid="workflow-name-input"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="Describe what this workflow does..."
                data-testid="workflow-description-input"
              />
            </div>

            <div>
              <Label>Triggers</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['task_completed', 'task_moved', 'task_created'].map((trigger) => (
                  <label key={trigger} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newTemplate.triggers?.includes(trigger)}
                      onChange={(e) => {
                        const triggers = e.target.checked
                          ? [...(newTemplate.triggers || []), trigger]
                          : (newTemplate.triggers || []).filter(t => t !== trigger);
                        setNewTemplate({ ...newTemplate, triggers });
                      }}
                    />
                    <span className="text-sm">{trigger.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Workflow Steps</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addStep}
                  data-testid="add-step-button"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Step
                </Button>
              </div>

              <div className="space-y-3">
                {steps.map((step, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="font-medium text-sm">Step {index + 1}</div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveStep(index, 'up')}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveStep(index, 'down')}
                            disabled={index === steps.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeStep(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Input
                          value={step.name}
                          onChange={(e) => updateStep(index, { name: e.target.value })}
                          placeholder="Step name"
                        />

                        <Textarea
                          value={step.description}
                          onChange={(e) => updateStep(index, { description: e.target.value })}
                          placeholder="Step description"
                          rows={2}
                        />

                        <Select
                          value={step.action_type}
                          onValueChange={(value) => updateStep(index, {
                            action_type: value as ActionType,
                            action_config: {}
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select action type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ActionType.UPDATE_TASK}>Update Task</SelectItem>
                            <SelectItem value={ActionType.ASSIGN_TASK}>Assign Task</SelectItem>
                            <SelectItem value={ActionType.SEND_NOTIFICATION}>Send Notification</SelectItem>
                            <SelectItem value={ActionType.CREATE_TASK}>Create Task</SelectItem>
                            <SelectItem value={ActionType.ADD_COMMENT}>Add Comment</SelectItem>
                          </SelectContent>
                        </Select>

                        {step.action_type && getActionConfigUI(step.action_type)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreating(false);
                setIsEditing(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateWorkflow}
              disabled={!newTemplate.name || steps.length === 0}
              data-testid="save-workflow-button"
            >
              {isCreating ? 'Create Workflow' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}