// Audit-related types

export interface AuditEntry {
  id: string;
  timestamp: string;
  event_type: AuditEventType;
  severity: AuditSeverity;
  actor_id?: string;
  actor_type: string;
  actor_details?: Record<string, any>;
  resource_type?: string;
  resource_id?: string;
  resource_name?: string;
  action: string;
  action_details?: Record<string, any>;
  changes?: Record<string, any>;
  result: string;
  error_message?: string;
  context?: Record<string, any>;
  compliance_tags: string[];
  search_terms: string[];
  metadata?: Record<string, any>;
}

export interface AuditSession {
  id: string;
  user_id: string;
  session_start: string;
  session_end?: string;
  ip_address: string;
  user_agent: string;
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
  activities_count: number;
  high_risk_activities: number;
  is_active: boolean;
}

export interface AuditReport {
  id: string;
  name: string;
  description: string;
  report_type: string;
  query_config: Record<string, any>;
  columns: string[];
  filters?: Record<string, any>;
  schedule?: {
    frequency: string;
    time?: string;
    day_of_week?: number;
    day_of_month?: number;
  };
  recipients?: string[];
  format: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  last_run?: string;
  next_run?: string;
  is_active: boolean;
}

export interface AuditReportResult {
  report_id: string;
  executed_at: string;
  row_count: number;
  data: any[];
  metadata?: Record<string, any>;
  execution_time_ms: number;
}

export interface ComplianceRequirement {
  id: string;
  standard: string;
  name: string;
  description: string;
  category: string;
  controls: string[];
  evidence_required: string[];
  frequency: string;
  last_assessment?: string;
  next_assessment?: string;
  compliance_status?: string;
  compliance_score?: number;
  responsible_users?: string[];
  created_at: string;
  updated_at: string;
}

export interface AuditPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  policy_type: string;
  enabled_events: AuditEventType[];
  rules: PolicyRule[];
  actions: PolicyAction[];
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
}

export interface PolicyRule {
  event_type?: string;
  resource_type?: string;
  severity?: string;
  result?: string;
  threshold?: number;
  time_window?: number;
  action?: string;
}

export interface PolicyAction {
  type: string;
  config: Record<string, any>;
}

export interface AuditAlert {
  id: string;
  alert_type: string;
  severity: AuditSeverity;
  title: string;
  description: string;
  triggered_at: string;
  triggered_by: string;
  resource_type?: string;
  resource_id?: string;
  assigned_to?: string;
  status: AlertStatus;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  automated_actions: any[];
}

export interface AuditRetentionPolicy {
  id: string;
  name: string;
  description: string;
  event_types?: AuditEventType[];
  severity_levels?: AuditSeverity[];
  retention_days: number;
  archive_enabled: boolean;
  archive_location?: string;
  delete_enabled: boolean;
  is_active: boolean;
  created_at: string;
  created_by: string;
  last_applied?: string;
}

export interface AuditIntegration {
  id: string;
  name: string;
  integration_type: string;
  config: Record<string, any>;
  enabled_events?: AuditEventType[];
  transform_rules?: Record<string, any>;
  is_active: boolean;
  last_sync?: string;
  created_at: string;
  created_by: string;
}

export interface AuditSearchRequest {
  query?: string;
  event_types?: AuditEventType[];
  severity_levels?: AuditSeverity[];
  actor_ids?: string[];
  resource_types?: string[];
  resource_ids?: string[];
  start_date?: string;
  end_date?: string;
  result?: string;
  compliance_tags?: string[];
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface AuditSearchResult {
  entries: AuditEntry[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface AuditStatistics {
  period_start: string;
  period_end: string;
  total_events: number;
  events_by_type: Record<string, number>;
  events_by_severity: Record<string, number>;
  events_by_result: Record<string, number>;
  top_actors: Array<{ user_id: string; event_count: number }>;
  top_resources: Array<{ resource_type: string; resource_id: string; access_count: number }>;
  failed_attempts: number;
  high_risk_events: number;
  compliance_violations: number;
}

export interface AuditExportRequest {
  filters: AuditSearchRequest;
  format: "json" | "csv" | "pdf";
  include_metadata?: boolean;
  compress?: boolean;
}

// Enums
export enum AuditEventType {
  // Authentication
  LOGIN_SUCCESS = "login_success",
  LOGIN_FAILURE = "login_failure",
  LOGOUT = "logout",
  SESSION_EXPIRED = "session_expired",
  PASSWORD_CHANGED = "password_changed",
  PASSWORD_RESET = "password_reset",
  MFA_ENABLED = "mfa_enabled",
  MFA_DISABLED = "mfa_disabled",
  
  // Authorization
  PERMISSION_GRANTED = "permission_granted",
  PERMISSION_REVOKED = "permission_revoked",
  PERMISSION_CHECK_DENIED = "permission_check_denied",
  ROLE_ASSIGNED = "role_assigned",
  ROLE_REMOVED = "role_removed",
  
  // Data Access
  DATA_ACCESSED = "data_accessed",
  DATA_EXPORTED = "data_exported",
  DATA_IMPORTED = "data_imported",
  
  // Data Modification
  RESOURCE_CREATED = "resource_created",
  RESOURCE_UPDATED = "resource_updated",
  RESOURCE_DELETED = "resource_deleted",
  RESOURCE_ARCHIVED = "resource_archived",
  RESOURCE_RESTORED = "resource_restored",
  
  // Settings
  SETTINGS_CHANGED = "settings_changed",
  CONFIG_UPDATED = "config_updated",
  
  // Security
  SECURITY_ALERT = "security_alert",
  SUSPICIOUS_ACTIVITY = "suspicious_activity",
  
  // System
  SYSTEM_ERROR = "system_error",
  MAINTENANCE_EVENT = "maintenance_event"
}

export enum AuditSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
  INFO = "info",
  WARNING = "warning",
  ERROR = "error"
}

export enum AlertStatus {
  OPEN = "open",
  ACKNOWLEDGED = "acknowledged",
  RESOLVED = "resolved",
  ESCALATED = "escalated",
  DISMISSED = "dismissed"
}