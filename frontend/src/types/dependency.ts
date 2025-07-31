/**
 * Dependency & Workflow Types
 * 
 * Types for managing task dependencies and automated workflows
 */

// Dependency Types
export enum DependencyType {
  FINISH_TO_START = 'finish_to_start',
  START_TO_START = 'start_to_start',
  FINISH_TO_FINISH = 'finish_to_finish',
  START_TO_FINISH = 'start_to_finish'
}

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_id: string;
  dependency_type: DependencyType;
  lag_time: number; // in hours
  created_at: string;
  updated_at: string;
}

export interface CreateDependencyRequest {
  depends_on_id: string;
  dependency_type?: DependencyType;
  lag_time?: number;
}

export interface DependencyValidation {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  can_start: boolean;
  blocking_tasks: Array<{
    id: string;
    title: string;
    status: string;
    assignee_id?: string;
  }>;
}

export interface CriticalPathResult {
  critical_path: string[]; // Task IDs
  total_duration: number; // in days
  critical_tasks: Array<{
    task: {
      id: string;
      title: string;
      status: string;
      assignee_id?: string;
      estimated_hours?: number;
    };
    earliest_start: number;
    latest_start: number;
    duration: number;
    slack: number;
  }>;
  all_tasks_slack: Record<string, number>;
}

export interface DependencyGraph {
  nodes: Array<{
    id: string;
    label: string;
    status: string;
    assignee?: string;
    duration: number;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type: DependencyType;
    lag: number;
  }>;
  stats: {
    total_tasks: number;
    total_dependencies: number;
    dependency_types: Record<string, number>;
  };
}

// Workflow Types
export enum WorkflowStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum StepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  CANCELLED = 'cancelled'
}

export enum ActionType {
  CREATE_TASK = 'create_task',
  UPDATE_TASK = 'update_task',
  MOVE_TASK = 'move_task',
  ASSIGN_TASK = 'assign_task',
  ADD_COMMENT = 'add_comment',
  SEND_NOTIFICATION = 'send_notification',
  CREATE_SUBTASK = 'create_subtask',
  UPDATE_CUSTOM_FIELD = 'update_custom_field',
  TRIGGER_WEBHOOK = 'trigger_webhook'
}

export interface WorkflowStep {
  id: string;
  template_id: string;
  name: string;
  description: string;
  order: number;
  action_type: ActionType;
  action_config: Record<string, any>;
  conditions: Array<{
    condition_type: string;
    condition_config: Record<string, any>;
  }>;
  created_at: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  board_id: string;
  is_active: boolean;
  triggers: string[];
  steps: WorkflowStep[];
  created_at: string;
  updated_at: string;
}

export interface CreateWorkflowRequest {
  name: string;
  description: string;
  board_id: string;
  steps: Array<{
    name: string;
    description?: string;
    action_type: ActionType;
    action_config: Record<string, any>;
    conditions?: Array<{
      condition_type: string;
      condition_config: Record<string, any>;
    }>;
  }>;
  triggers?: string[];
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
  triggers?: string[];
}

export interface WorkflowInstance {
  id: string;
  template_id: string;
  trigger_task_id?: string;
  triggered_by: string;
  status: WorkflowStatus;
  variables: Record<string, any>;
  context: Record<string, any>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface StepExecution {
  id: string;
  instance_id: string;
  step_id: string;
  step_name: string;
  status: StepStatus;
  result?: Record<string, any>;
  error?: string;
  created_at: string;
  completed_at?: string;
}

export interface TriggerWorkflowRequest {
  template_id: string;
  trigger_task_id: string;
  variables?: Record<string, any>;
}

export interface WorkflowProgress {
  instance_id: string;
  status: WorkflowStatus;
  total_steps: number;
  completed_steps: number;
  progress_percentage: number;
  current_step?: {
    id: string;
    name: string;
    status: StepStatus;
  };
  created_at: string;
  completed_at?: string;
}

export interface WorkflowAnalytics {
  template_id: string;
  total_instances: number;
  completion_rate: number;
  average_duration_hours: number;
  status_breakdown: Record<WorkflowStatus, number>;
  recent_instances: WorkflowInstance[];
}

export interface DependencyBottleneck {
  task: {
    id: string;
    title: string;
    status: string;
    assignee_id?: string;
  };
  blocking_count: number;
  blocked_tasks: Array<{
    id: string;
    title: string;
    status: string;
    assignee_id?: string;
  }>;
  severity: 'high' | 'medium' | 'low';
}

export interface BottleneckAnalysis {
  project_id: string;
  bottlenecks: DependencyBottleneck[];
  total_dependencies: number;
  high_severity_count: number;
  recommendations: string[];
}