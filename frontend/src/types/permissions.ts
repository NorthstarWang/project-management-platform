// Permission-related types

export interface Permission {
  id: string;
  name: string;
  description: string;
  action: PermissionAction;
  resource_type: ResourceType;
  is_system: boolean;
  can_delegate: boolean;
  created_at: string;
}

export interface PermissionRule {
  id: string;
  name: string;
  description: string;
  permission_id: string;
  resource_type: ResourceType;
  conditions: Record<string, any>;
  scope_type?: string;
  scope_id?: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permission_ids: string[];
  permission_rule_ids: string[];
  parent_role_id?: string;
  scope_type?: string;
  scope_id?: string;
  is_system: boolean;
  is_active: boolean;
  max_users?: number;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export interface RoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  scope_type: string;
  scope_id?: string;
  assigned_by: string;
  assigned_at: string;
  expires_at?: string;
  conditions?: Record<string, any>;
  notes?: string;
  is_active: boolean;
}

export interface PermissionGrant {
  id: string;
  user_id: string;
  permission_id: string;
  resource_type?: ResourceType;
  resource_id?: string;
  granted_by: string;
  granted_at: string;
  expires_at?: string;
  reason: string;
  revoked_at?: string;
  revoked_by?: string;
  is_active: boolean;
}

export interface PermissionCheck {
  user_id: string;
  resource_type: ResourceType;
  resource_id?: string;
  action: PermissionAction;
  context?: Record<string, any>;
}

export interface PermissionCheckResult {
  allowed: boolean;
  user_id: string;
  resource_type: ResourceType;
  resource_id?: string;
  action: PermissionAction;
  grant_type?: string;
  grant_source?: string;
  denial_reason?: string;
  applied_conditions: any[];
  checked_at: string;
}

export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  roles: RoleTemplate[];
  permissions: PermissionTemplate[];
  rules: PermissionRuleTemplate[];
  created_at: string;
  created_by: string;
  is_active: boolean;
}

export interface RoleTemplate {
  name: string;
  description: string;
  permissions: string[];
  rules: string[];
  parent_role?: string;
}

export interface PermissionTemplate {
  permission_id: string;
  scope_type?: string;
  conditions?: Record<string, any>;
}

export interface PermissionRuleTemplate {
  name: string;
  description: string;
  permission_id: string;
  conditions: Record<string, any>;
}

export interface PermissionPolicy {
  id: string;
  name: string;
  description: string;
  rules: PolicyRule[];
  enforcement_level: EnforcementLevel;
  is_active: boolean;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export interface PolicyRule {
  resource_type?: ResourceType;
  action?: PermissionAction;
  require_confirmation?: boolean;
  require_reason?: boolean;
  notify_users?: string[];
  max_grant_duration?: number;
}

export interface PermissionMatrix {
  subject_type: string;
  subject_id: string;
  permissions: Record<ResourceType, Record<PermissionAction, boolean>>;
  roles: Role[];
  direct_grants: PermissionGrant[];
  applicable_rules: PermissionRule[];
  generated_at: string;
}

// Request types
export interface RoleCreateRequest {
  name: string;
  description: string;
  permission_ids: string[];
  permission_rule_ids?: string[];
  parent_role_id?: string;
  scope_type?: string;
  scope_id?: string;
  max_users?: number;
}

export interface RoleUpdateRequest {
  name?: string;
  description?: string;
  permission_ids?: string[];
  permission_rule_ids?: string[];
  parent_role_id?: string;
  is_active?: boolean;
  max_users?: number;
}

export interface RoleAssignRequest {
  role_id: string;
  user_ids: string[];
  scope_type: string;
  scope_id?: string;
  expires_at?: string;
  conditions?: Record<string, any>;
  notes?: string;
}

export interface PermissionGrantRequest {
  user_id: string;
  permission_id: string;
  resource_type?: ResourceType;
  resource_id?: string;
  expires_at?: string;
  reason: string;
}

export interface BulkPermissionCheck {
  user_id: string;
  checks: PermissionCheck[];
}

export interface BulkPermissionCheckResult {
  user_id: string;
  results: PermissionCheckResult[];
  checked_at: string;
}

export interface PermissionAuditRequest {
  user_ids?: string[];
  role_ids?: string[];
  start_date?: string;
  end_date?: string;
  include_inactive?: boolean;
}

export interface PermissionAuditResult {
  audit_id: string;
  summary: Record<string, any>;
  findings: PermissionAuditFinding[];
  recommendations: string[];
  generated_at: string;
  generated_by: string;
}

export interface PermissionAuditFinding {
  type: string;
  severity: string;
  user_id?: string;
  role_id?: string;
  description: string;
  details: Record<string, any>;
}

// Enums
export enum ResourceType {
  SYSTEM = "system",
  PROJECT = "project",
  BOARD = "board",
  TASK = "task",
  COMMENT = "comment",
  USER = "user",
  TEAM = "team",
  NOTIFICATION = "notification",
  CUSTOM_FIELD = "custom_field",
  TIME_TRACKING = "time_tracking",
  DEPENDENCY = "dependency",
  WORKFLOW = "workflow",
  REPORT = "report",
  AUDIT = "audit"
}

export enum PermissionAction {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
  ARCHIVE = "archive",
  RESTORE = "restore",
  ASSIGN = "assign",
  UNASSIGN = "unassign",
  APPROVE = "approve",
  REJECT = "reject",
  EXPORT = "export",
  IMPORT = "import",
  MANAGE_MEMBERS = "manage_members",
  MANAGE_PERMISSIONS = "manage_permissions",
  MANAGE_SETTINGS = "manage_settings",
  VIEW_ANALYTICS = "view_analytics",
  VIEW_AUDIT_LOGS = "view_audit_logs",
  EXPORT_AUDIT_LOGS = "export_audit_logs"
}

export enum EnforcementLevel {
  STRICT = "strict",
  MODERATE = "moderate",
  AUDIT_ONLY = "audit_only"
}