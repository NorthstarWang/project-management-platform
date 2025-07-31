/**
 * Dependency & Workflow Service
 * 
 * Service for managing task dependencies and automated workflows
 */

import apiClient from './apiClient';
import {
  TaskDependency,
  CreateDependencyRequest,
  DependencyValidation,
  CriticalPathResult,
  DependencyGraph,
  WorkflowTemplate,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  WorkflowInstance,
  TriggerWorkflowRequest,
  WorkflowProgress,
  WorkflowAnalytics,
  BottleneckAnalysis,
  WorkflowStatus
} from '@/types/dependency';

class DependencyService {
  // Task Dependency Methods

  async createDependency(taskId: string, request: CreateDependencyRequest): Promise<TaskDependency> {
    const response = await apiClient.post(`/api/dependencies/tasks/${taskId}/dependencies`, request);
    return response.data;
  }

  async getTaskDependencies(taskId: string, includeTransitive = false): Promise<TaskDependency[]> {
    const response = await apiClient.get(`/api/dependencies/tasks/${taskId}/dependencies`, {
      include_transitive: includeTransitive.toString()
    });
    return response.data;
  }

  async getTaskDependents(taskId: string): Promise<TaskDependency[]> {
    const response = await apiClient.get(`/api/dependencies/tasks/${taskId}/dependents`);
    return response.data;
  }

  async deleteDependency(dependencyId: string): Promise<void> {
    await apiClient.delete(`/api/dependencies/dependencies/${dependencyId}`);
  }

  async validateDependencies(taskId: string): Promise<DependencyValidation> {
    const response = await apiClient.post(`/api/dependencies/tasks/${taskId}/validate-dependencies`);
    return response.data;
  }

  async getCriticalPath(projectId: string): Promise<CriticalPathResult> {
    const response = await apiClient.get(`/api/dependencies/projects/${projectId}/critical-path`);
    return response.data;
  }

  async getDependencyGraph(projectId: string): Promise<DependencyGraph> {
    const response = await apiClient.get(`/api/dependencies/projects/${projectId}/dependency-graph`);
    return response.data;
  }

  // Workflow Template Methods

  async createWorkflowTemplate(request: CreateWorkflowRequest): Promise<WorkflowTemplate> {
    const response = await apiClient.post('/api/dependencies/workflows/templates', request);
    return response.data;
  }

  async getWorkflowTemplates(boardId?: string, isActive?: boolean): Promise<WorkflowTemplate[]> {
    const params: Record<string, string> = {};
    if (boardId) params.board_id = boardId;
    if (isActive !== undefined) params.is_active = isActive.toString();
    
    const response = await apiClient.get('/api/dependencies/workflows/templates', params);
    return response.data;
  }

  async getWorkflowTemplate(templateId: string): Promise<WorkflowTemplate> {
    const response = await apiClient.get(`/api/dependencies/workflows/templates/${templateId}`);
    return response.data;
  }

  async updateWorkflowTemplate(templateId: string, request: UpdateWorkflowRequest): Promise<WorkflowTemplate> {
    const response = await apiClient.put(`/api/dependencies/workflows/templates/${templateId}`, request);
    return response.data;
  }

  async deleteWorkflowTemplate(templateId: string): Promise<void> {
    await apiClient.delete(`/api/dependencies/workflows/templates/${templateId}`);
  }

  // Workflow Instance Methods

  async triggerWorkflow(request: TriggerWorkflowRequest): Promise<WorkflowInstance> {
    const response = await apiClient.post('/api/dependencies/workflows/instances/trigger', request);
    return response.data;
  }

  async getWorkflowInstances(templateId?: string, status?: WorkflowStatus): Promise<WorkflowInstance[]> {
    const params: Record<string, string> = {};
    if (templateId) params.template_id = templateId;
    if (status) params.status = status;
    
    const response = await apiClient.get('/api/dependencies/workflows/instances', params);
    return response.data;
  }

  async getWorkflowInstance(instanceId: string): Promise<WorkflowInstance> {
    const response = await apiClient.get(`/api/dependencies/workflows/instances/${instanceId}`);
    return response.data;
  }

  async advanceWorkflow(instanceId: string, stepId: string): Promise<void> {
    await apiClient.post(`/api/dependencies/workflows/instances/${instanceId}/advance`, {
      step_id: stepId
    });
  }

  async cancelWorkflow(instanceId: string, reason: string): Promise<void> {
    await apiClient.post(`/api/dependencies/workflows/instances/${instanceId}/cancel`, {
      reason: reason
    });
  }

  async getWorkflowProgress(instanceId: string): Promise<WorkflowProgress> {
    const response = await apiClient.get(`/api/dependencies/workflows/instances/${instanceId}/progress`);
    return response.data;
  }

  // Analytics Methods

  async getWorkflowAnalytics(templateId: string): Promise<WorkflowAnalytics> {
    const response = await apiClient.get(`/api/dependencies/analytics/workflow-performance/${templateId}`);
    return response.data;
  }

  async getDependencyBottlenecks(projectId: string): Promise<BottleneckAnalysis> {
    const response = await apiClient.get(`/api/dependencies/analytics/dependency-bottlenecks/${projectId}`);
    return response.data;
  }

  // Helper Methods

  getDependencyTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      finish_to_start: 'Finish to Start',
      start_to_start: 'Start to Start',
      finish_to_finish: 'Finish to Finish',
      start_to_finish: 'Start to Finish'
    };
    return labels[type] || type;
  }

  getActionTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      create_task: 'Create Task',
      update_task: 'Update Task',
      move_task: 'Move Task',
      assign_task: 'Assign Task',
      add_comment: 'Add Comment',
      send_notification: 'Send Notification',
      create_subtask: 'Create Subtask',
      update_custom_field: 'Update Custom Field',
      trigger_webhook: 'Trigger Webhook'
    };
    return labels[type] || type;
  }

  getWorkflowStatusColor(status: WorkflowStatus): string {
    const colors: Record<WorkflowStatus, string> = {
      [WorkflowStatus.PENDING]: 'bg-gray-500',
      [WorkflowStatus.IN_PROGRESS]: 'bg-blue-500',
      [WorkflowStatus.COMPLETED]: 'bg-green-500',
      [WorkflowStatus.FAILED]: 'bg-red-500',
      [WorkflowStatus.CANCELLED]: 'bg-orange-500'
    };
    return colors[status] || 'bg-gray-500';
  }
}

export const dependencyService = new DependencyService();