"""
Enterprise Permissions Models

This module defines models for enterprise-level permissions and role-based access control.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Set
from datetime import datetime
from enum import Enum


class ResourceType(str, Enum):
    """Types of resources that can have permissions"""
    PROJECT = "project"
    BOARD = "board" 
    TASK = "task"
    TEAM = "team"
    USER = "user"
    CUSTOM_FIELD = "custom_field"
    TIME_ENTRY = "time_entry"
    WORKFLOW = "workflow"
    REPORT = "report"
    AUDIT = "audit"
    SYSTEM = "system"


class PermissionAction(str, Enum):
    """Actions that can be performed on resources"""
    # Basic CRUD operations
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    
    # Resource-specific operations
    ASSIGN = "assign"
    ARCHIVE = "archive"
    RESTORE = "restore"
    EXPORT = "export"
    IMPORT = "import"
    
    # Administrative operations
    MANAGE_PERMISSIONS = "manage_permissions"
    MANAGE_MEMBERS = "manage_members"
    MANAGE_SETTINGS = "manage_settings"
    MANAGE_WORKFLOWS = "manage_workflows"
    MANAGE_CUSTOM_FIELDS = "manage_custom_fields"
    
    # Time tracking operations
    TRACK_TIME = "track_time"
    APPROVE_TIME = "approve_time"
    VIEW_REPORTS = "view_reports"
    
    # Audit operations
    VIEW_AUDIT_LOGS = "view_audit_logs"
    EXPORT_AUDIT_LOGS = "export_audit_logs"


class Permission(BaseModel):
    """Individual permission definition"""
    id: str
    name: str
    description: str
    resource_type: ResourceType
    action: PermissionAction
    is_system: bool = False  # System permissions cannot be modified
    created_at: datetime
    updated_at: datetime


class PermissionRule(BaseModel):
    """Rule that grants permissions based on conditions"""
    id: str
    name: str
    description: Optional[str] = None
    permission_id: str
    resource_type: ResourceType
    
    # Conditions for the rule
    conditions: Dict[str, Any] = Field(default_factory=dict)
    # Examples:
    # {"owner_id": "$user_id"} - User owns the resource
    # {"team_id": {"$in": "$user_teams"}} - Resource belongs to user's team
    # {"project.status": {"$ne": "archived"}} - Project is not archived
    
    # Optional scope limitations
    scope_type: Optional[str] = None  # "team", "project", "global"
    scope_id: Optional[str] = None
    
    is_active: bool = True
    created_at: datetime
    created_by: str
    updated_at: datetime
    updated_by: str


class Role(BaseModel):
    """Role definition with associated permissions"""
    id: str
    name: str
    description: str
    
    # Direct permissions granted by this role
    permission_ids: List[str] = Field(default_factory=list)
    
    # Permission rules that apply to this role
    permission_rule_ids: List[str] = Field(default_factory=list)
    
    # Role hierarchy
    parent_role_id: Optional[str] = None  # Inherits permissions from parent
    
    # Role metadata
    is_system: bool = False  # System roles cannot be modified
    is_default: bool = False  # Automatically assigned to new users
    
    # Scope of the role
    scope_type: str = "global"  # "global", "team", "project"
    scope_id: Optional[str] = None  # ID of team/project if scoped
    
    # Assignment limits
    max_users: Optional[int] = None  # Max users that can have this role
    
    created_at: datetime
    created_by: str
    updated_at: datetime
    updated_by: str


class RoleAssignment(BaseModel):
    """Assignment of a role to a user"""
    id: str
    user_id: str
    role_id: str
    
    # Assignment scope
    scope_type: str = "global"  # "global", "team", "project", "resource"
    scope_id: Optional[str] = None  # ID of the scoped resource
    
    # Assignment metadata
    assigned_by: str
    assigned_at: datetime
    expires_at: Optional[datetime] = None  # For temporary assignments
    
    # Assignment conditions
    conditions: Dict[str, Any] = Field(default_factory=dict)
    # Examples:
    # {"time_of_day": {"$gte": "09:00", "$lte": "17:00"}} - Only during work hours
    # {"ip_range": "192.168.1.0/24"} - Only from specific network
    
    is_active: bool = True
    notes: Optional[str] = None


class PermissionGrant(BaseModel):
    """Direct grant of permissions to a user (bypassing roles)"""
    id: str
    user_id: str
    permission_id: str
    
    # Grant scope
    resource_type: ResourceType
    resource_id: Optional[str] = None  # Specific resource or None for type-wide
    
    # Grant metadata
    granted_by: str
    granted_at: datetime
    expires_at: Optional[datetime] = None
    reason: Optional[str] = None
    
    is_active: bool = True


class PermissionCheck(BaseModel):
    """Request to check if a user has permission"""
    user_id: str
    resource_type: ResourceType
    resource_id: Optional[str] = None
    action: PermissionAction
    context: Dict[str, Any] = Field(default_factory=dict)


class PermissionCheckResult(BaseModel):
    """Result of a permission check"""
    allowed: bool
    user_id: str
    resource_type: ResourceType
    resource_id: Optional[str] = None
    action: PermissionAction
    
    # How the permission was granted
    grant_type: Optional[str] = None  # "role", "rule", "direct", "inherited"
    grant_source: Optional[str] = None  # Role/rule/grant ID
    
    # Applied conditions
    applied_conditions: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Denial reason if not allowed
    denial_reason: Optional[str] = None
    
    checked_at: datetime


class PermissionTemplate(BaseModel):
    """Template for common permission configurations"""
    id: str
    name: str
    description: str
    
    # Template configuration
    roles: List[Dict[str, Any]] = Field(default_factory=list)
    rules: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Template metadata
    category: str  # "project", "team", "department", etc.
    is_public: bool = False
    
    created_at: datetime
    created_by: str
    updated_at: datetime
    updated_by: str


class PermissionPolicy(BaseModel):
    """Organization-wide permission policy"""
    id: str
    name: str
    description: str
    
    # Policy rules
    rules: List[Dict[str, Any]] = Field(default_factory=list)
    # Examples:
    # {"resource_type": "project", "max_owners": 3}
    # {"resource_type": "task", "require_assignee": true}
    # {"action": "delete", "require_confirmation": true}
    
    # Policy enforcement
    enforcement_level: str = "strict"  # "strict", "warning", "audit_only"
    
    is_active: bool = True
    created_at: datetime
    created_by: str
    updated_at: datetime
    updated_by: str


# Request/Response models for API endpoints

class RoleCreateRequest(BaseModel):
    """Request to create a new role"""
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=500)
    permission_ids: List[str] = Field(default_factory=list)
    permission_rule_ids: List[str] = Field(default_factory=list)
    parent_role_id: Optional[str] = None
    scope_type: str = "global"
    scope_id: Optional[str] = None
    max_users: Optional[int] = Field(None, ge=1)


class RoleUpdateRequest(BaseModel):
    """Request to update a role"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    permission_ids: Optional[List[str]] = None
    permission_rule_ids: Optional[List[str]] = None
    parent_role_id: Optional[str] = None
    max_users: Optional[int] = Field(None, ge=1)


class RoleAssignRequest(BaseModel):
    """Request to assign a role to users"""
    role_id: str
    user_ids: List[str]
    scope_type: str = "global"
    scope_id: Optional[str] = None
    expires_at: Optional[datetime] = None
    conditions: Dict[str, Any] = Field(default_factory=dict)
    notes: Optional[str] = Field(None, max_length=500)


class PermissionGrantRequest(BaseModel):
    """Request to grant permissions directly"""
    user_id: str
    permission_id: str
    resource_type: ResourceType
    resource_id: Optional[str] = None
    expires_at: Optional[datetime] = None
    reason: Optional[str] = Field(None, max_length=500)


class BulkPermissionCheck(BaseModel):
    """Request to check multiple permissions at once"""
    user_id: str
    checks: List[PermissionCheck]


class BulkPermissionCheckResult(BaseModel):
    """Result of bulk permission check"""
    user_id: str
    results: List[PermissionCheckResult]
    checked_at: datetime


class PermissionMatrix(BaseModel):
    """Matrix showing all permissions for a user or resource"""
    subject_type: str  # "user" or "resource"
    subject_id: str
    
    # Permission matrix
    permissions: Dict[str, Dict[str, bool]]  # resource_type -> action -> allowed
    
    # Sources of permissions
    roles: List[Role]
    direct_grants: List[PermissionGrant]
    applicable_rules: List[PermissionRule]
    
    generated_at: datetime


class PermissionAuditRequest(BaseModel):
    """Request to audit permissions"""
    user_ids: Optional[List[str]] = None
    resource_types: Optional[List[ResourceType]] = None
    resource_ids: Optional[List[str]] = None
    actions: Optional[List[PermissionAction]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    include_denied: bool = True


class PermissionAuditResult(BaseModel):
    """Result of permission audit"""
    audit_id: str
    summary: Dict[str, Any]
    findings: List[Dict[str, Any]]
    recommendations: List[str]
    generated_at: datetime
    generated_by: str