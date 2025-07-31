'use client';

import React, { useState, useEffect } from 'react';
import { TaskDependency, DependencyType, CreateDependencyRequest, DependencyValidation } from '@/types/dependency';
import { Task } from '@/types';
import { dependencyService } from '@/services/dependencyService';
import apiClient from '@/services/apiClient';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AlertCircle, ArrowRight, Clock, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';

interface TaskDependenciesProps {
  taskId: string;
  projectId: string;
  currentTaskStatus: string;
  onDependenciesChange?: () => void;
}

export function TaskDependencies({ taskId, projectId, currentTaskStatus, onDependenciesChange }: TaskDependenciesProps) {
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [dependents, setDependents] = useState<TaskDependency[]>([]);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [validation, setValidation] = useState<DependencyValidation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingDependency, setIsAddingDependency] = useState(false);
  const [newDependency, setNewDependency] = useState<CreateDependencyRequest>({
    depends_on_id: '',
    dependency_type: DependencyType.FINISH_TO_START,
    lag_time: 0
  });

  useEffect(() => {
    loadDependencies();
    loadProjectTasks();
  }, [taskId]);

  const loadDependencies = async () => {
    try {
      setIsLoading(true);
      const [deps, depts, valid] = await Promise.all([
        dependencyService.getTaskDependencies(taskId),
        dependencyService.getTaskDependents(taskId),
        dependencyService.validateDependencies(taskId)
      ]);
      setDependencies(deps);
      setDependents(depts);
      setValidation(valid);
    } catch (error) {
      console.error('Error loading dependencies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjectTasks = async () => {
    try {
      const response = await apiClient.get(`/api/projects/${projectId}`);
      const projectData = response.data;
      // Filter out the current task and get all tasks
      const allTasks = projectData.boards.flatMap((board: any) => 
        board.lists.flatMap((list: any) => list.tasks || [])
      );
      setProjectTasks(allTasks.filter((t: Task) => t.id !== taskId));
    } catch (error) {
      console.error('Error loading project tasks:', error);
    }
  };

  const handleAddDependency = async () => {
    if (!newDependency.depends_on_id) return;

    try {
      await dependencyService.createDependency(taskId, newDependency);
      await loadDependencies();
      setNewDependency({
        depends_on_id: '',
        dependency_type: DependencyType.FINISH_TO_START,
        lag_time: 0
      });
      setIsAddingDependency(false);
      onDependenciesChange?.();
    } catch (error) {
      console.error('Error adding dependency:', error);
    }
  };

  const handleDeleteDependency = async (dependencyId: string) => {
    try {
      await dependencyService.deleteDependency(dependencyId);
      await loadDependencies();
      onDependenciesChange?.();
    } catch (error) {
      console.error('Error deleting dependency:', error);
    }
  };

  const getTaskById = (id: string): Task | undefined => {
    return projectTasks.find(t => t.id === id);
  };

  const getDependencyIcon = (type: DependencyType) => {
    switch (type) {
      case DependencyType.FINISH_TO_START:
        return <ArrowRight className="h-4 w-4" />;
      case DependencyType.START_TO_START:
        return <Clock className="h-4 w-4" />;
      default:
        return <ArrowRight className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading dependencies...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Validation Status */}
      {validation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Dependency Status
              {validation.is_valid ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!validation.can_start && currentTaskStatus === 'pending' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This task cannot start yet. Waiting for dependencies to complete.
                </AlertDescription>
              </Alert>
            )}

            {validation.errors.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-red-600">Errors:</div>
                {validation.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-600 flex items-start gap-2">
                    <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    {error}
                  </div>
                ))}
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-orange-600">Warnings:</div>
                {validation.warnings.map((warning, index) => (
                  <div key={index} className="text-sm text-orange-600 flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    {warning}
                  </div>
                ))}
              </div>
            )}

            {validation.blocking_tasks.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Blocking Tasks:</div>
                <div className="space-y-1">
                  {validation.blocking_tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 text-sm">
                      <div className={`h-2 w-2 rounded-full ${getStatusColor(task.status)}`} />
                      <span>{task.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dependencies (Tasks this task depends on) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Dependencies ({dependencies.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dependencies.map((dep) => {
            const task = getTaskById(dep.depends_on_id);
            return (
              <div key={dep.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getDependencyIcon(dep.dependency_type as DependencyType)}
                  <div>
                    <div className="font-medium text-sm">{task?.title || 'Unknown Task'}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span>{dependencyService.getDependencyTypeLabel(dep.dependency_type)}</span>
                      {dep.lag_time > 0 && (
                        <>
                          <span>•</span>
                          <span>Lag: {dep.lag_time}h</span>
                        </>
                      )}
                    </div>
                  </div>
                  {task && (
                    <Badge variant="outline" className="text-xs">
                      {task.status}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteDependency(dep.id)}
                  data-testid={`delete-dependency-${dep.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}

          {!isAddingDependency ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setIsAddingDependency(true)}
              data-testid="add-dependency-button"
            >
              Add Dependency
            </Button>
          ) : (
            <div className="space-y-3 border rounded-lg p-3">
              <Select
                value={newDependency.depends_on_id}
                onValueChange={(value) => setNewDependency({ ...newDependency, depends_on_id: value })}
              >
                <SelectTrigger data-testid="dependency-task-select">
                  <SelectValue placeholder="Select a task" />
                </SelectTrigger>
                <SelectContent>
                  {projectTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={newDependency.dependency_type}
                onValueChange={(value) => setNewDependency({ ...newDependency, dependency_type: value as DependencyType })}
              >
                <SelectTrigger data-testid="dependency-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DependencyType.FINISH_TO_START}>Finish to Start</SelectItem>
                  <SelectItem value={DependencyType.START_TO_START}>Start to Start</SelectItem>
                  <SelectItem value={DependencyType.FINISH_TO_FINISH}>Finish to Finish</SelectItem>
                  <SelectItem value={DependencyType.START_TO_FINISH}>Start to Finish</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Lag (hours):</label>
                <Input
                  type="number"
                  min="0"
                  value={newDependency.lag_time}
                  onChange={(e) => setNewDependency({ ...newDependency, lag_time: parseInt(e.target.value) || 0 })}
                  className="w-24"
                  data-testid="dependency-lag-input"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddingDependency(false);
                    setNewDependency({
                      depends_on_id: '',
                      dependency_type: DependencyType.FINISH_TO_START,
                      lag_time: 0
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddDependency}
                  disabled={!newDependency.depends_on_id}
                  data-testid="save-dependency-button"
                >
                  Add
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dependents (Tasks that depend on this task) */}
      {dependents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Dependent Tasks ({dependents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dependents.map((dep) => {
                const task = getTaskById(dep.task_id);
                return (
                  <div key={dep.id} className="flex items-center gap-3 p-2">
                    {getDependencyIcon(dep.dependency_type as DependencyType)}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{task?.title || 'Unknown Task'}</div>
                      <div className="text-xs text-gray-500">
                        {dependencyService.getDependencyTypeLabel(dep.dependency_type)}
                      </div>
                    </div>
                    {task && (
                      <Badge variant="outline" className="text-xs">
                        {task.status}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}