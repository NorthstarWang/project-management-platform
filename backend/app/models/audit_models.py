"""
Enterprise Audit Models

This module defines models for comprehensive audit logging and compliance tracking.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class AuditEventType(str, Enum):
    """Types of events that are audited"""
    # Authentication events
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET = "password_reset"
    
    # Resource lifecycle events
    RESOURCE_CREATED = "resource_created"
    RESOURCE_UPDATED = "resource_updated"
    RESOURCE_DELETED = "resource_deleted"
    RESOURCE_ARCHIVED = "resource_archived"
    RESOURCE_RESTORED = "resource_restored"
    
    # Permission events
    PERMISSION_GRANTED = "permission_granted"
    PERMISSION_REVOKED = "permission_revoked"
    ROLE_ASSIGNED = "role_assigned"
    ROLE_REMOVED = "role_removed"
    PERMISSION_CHECK_DENIED = "permission_check_denied"
    
    # Data access events
    DATA_ACCESSED = "data_accessed"
    DATA_EXPORTED = "data_exported"
    DATA_IMPORTED = "data_imported"
    
    # Configuration changes
    SETTINGS_CHANGED = "settings_changed"
    WORKFLOW_MODIFIED = "workflow_modified"
    CUSTOM_FIELD_CHANGED = "custom_field_changed"
    
    # Team/User management
    USER_CREATED = "user_created"
    USER_MODIFIED = "user_modified"
    USER_DEACTIVATED = "user_deactivated"
    TEAM_MEMBER_ADDED = "team_member_added"
    TEAM_MEMBER_REMOVED = "team_member_removed"
    
    # Security events
    SECURITY_ALERT = "security_alert"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    POLICY_VIOLATION = "policy_violation"
    
    # System events
    SYSTEM_ERROR = "system_error"
    INTEGRATION_EVENT = "integration_event"
    BACKUP_CREATED = "backup_created"
    MAINTENANCE_EVENT = "maintenance_event"


class AuditSeverity(str, Enum):
    """Severity levels for audit events"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AuditEntry(BaseModel):
    """Individual audit log entry"""
    id: str
    timestamp: datetime
    
    # Event details
    event_type: AuditEventType
    severity: AuditSeverity = AuditSeverity.INFO
    
    # Actor information
    actor_id: Optional[str] = None  # User who performed the action
    actor_type: str = "user"  # "user", "system", "integration"
    actor_details: Dict[str, Any] = Field(default_factory=dict)
    # Examples: {"ip": "192.168.1.1", "user_agent": "...", "session_id": "..."}
    
    # Target resource
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    resource_name: Optional[str] = None
    
    # Action details
    action: str
    action_details: Dict[str, Any] = Field(default_factory=dict)
    
    # Change tracking
    changes: Optional[Dict[str, Any]] = None
    # Format: {"field": {"old": value, "new": value}}
    
    # Result of the action
    result: str = "success"  # "success", "failure", "partial"
    error_message: Optional[str] = None
    
    # Context information
    context: Dict[str, Any] = Field(default_factory=dict)
    # Examples: {"team_id": "...", "project_id": "...", "request_id": "..."}
    
    # Compliance and retention
    compliance_tags: List[str] = Field(default_factory=list)
    retention_period_days: int = 2555  # 7 years default
    
    # Search optimization
    search_terms: List[str] = Field(default_factory=list)


class AuditSession(BaseModel):
    """Audit session tracking user activity"""
    id: str
    user_id: str
    session_start: datetime
    session_end: Optional[datetime] = None
    
    # Session details
    ip_address: str
    user_agent: str
    location: Optional[Dict[str, Any]] = None
    
    # Session activity
    event_count: int = 0
    resource_access_count: Dict[str, int] = Field(default_factory=dict)
    
    # Security indicators
    risk_score: float = 0.0
    anomalies_detected: List[str] = Field(default_factory=list)
    
    is_active: bool = True


class AuditReport(BaseModel):
    """Audit report configuration and results"""
    id: str
    name: str
    description: str
    
    # Report parameters
    filters: Dict[str, Any] = Field(default_factory=dict)
    # Examples:
    # {"event_types": ["login_success", "login_failure"]}
    # {"date_range": {"start": "2024-01-01", "end": "2024-01-31"}}
    # {"users": ["user1", "user2"]}
    
    # Report configuration
    group_by: List[str] = Field(default_factory=list)  # ["user", "event_type", "date"]
    metrics: List[str] = Field(default_factory=list)   # ["count", "unique_users", "error_rate"]
    
    # Report schedule (optional)
    schedule: Optional[Dict[str, Any]] = None
    # {"frequency": "daily", "time": "09:00", "recipients": ["admin@example.com"]}
    
    # Report metadata
    created_at: datetime
    created_by: str
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    
    is_active: bool = True


class AuditReportResult(BaseModel):
    """Results of an audit report execution"""
    id: str
    report_id: str
    generated_at: datetime
    
    # Report data
    summary: Dict[str, Any]
    data: List[Dict[str, Any]]
    
    # Visualizations
    charts: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Export options
    export_formats: List[str] = ["json", "csv", "pdf"]
    
    # Report metadata
    row_count: int
    execution_time_ms: int


class ComplianceRequirement(BaseModel):
    """Compliance requirement definition"""
    id: str
    name: str
    description: str
    
    # Compliance standard
    standard: str  # "GDPR", "HIPAA", "SOC2", "ISO27001", etc.
    requirement_id: str  # ID within the standard
    
    # Audit requirements
    required_events: List[AuditEventType]
    retention_days: int
    
    # Validation rules
    validation_rules: List[Dict[str, Any]] = Field(default_factory=list)
    # Examples:
    # {"rule": "password_complexity", "min_length": 12}
    # {"rule": "session_timeout", "max_minutes": 30}
    
    # Compliance status
    is_active: bool = True
    last_assessment: Optional[datetime] = None
    compliance_status: Optional[str] = None  # "compliant", "non_compliant", "partial"
    
    created_at: datetime
    updated_at: datetime


class AuditPolicy(BaseModel):
    """Organization-wide audit policy"""
    id: str
    name: str
    description: str
    
    # Policy rules
    rules: List[Dict[str, Any]] = Field(default_factory=list)
    # Examples:
    # {"event_type": "login_failure", "threshold": 5, "action": "lock_account"}
    # {"resource_type": "sensitive_data", "require_reason": true}
    
    # Event configuration
    enabled_events: List[AuditEventType]
    event_details_level: str = "full"  # "minimal", "standard", "full"
    
    # Retention policy
    retention_rules: Dict[str, int] = Field(default_factory=dict)
    # {"default": 365, "security_events": 2555, "routine_events": 90}
    
    # Alert configuration
    alert_rules: List[Dict[str, Any]] = Field(default_factory=list)
    
    is_active: bool = True
    created_at: datetime
    created_by: str
    updated_at: datetime
    updated_by: str


class AuditAlert(BaseModel):
    """Alert triggered by audit events"""
    id: str
    triggered_at: datetime
    
    # Alert details
    alert_type: str
    severity: AuditSeverity
    title: str
    description: str
    
    # Triggering event(s)
    trigger_event_ids: List[str]
    trigger_rule: Dict[str, Any]
    
    # Alert status
    status: str = "open"  # "open", "acknowledged", "resolved", "false_positive"
    
    # Response actions
    assigned_to: Optional[str] = None
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    
    # Automated actions taken
    automated_actions: List[Dict[str, Any]] = Field(default_factory=list)


# Request/Response models for API endpoints

class AuditSearchRequest(BaseModel):
    """Request to search audit logs"""
    # Time range
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    # Filters
    event_types: Optional[List[AuditEventType]] = None
    severities: Optional[List[AuditSeverity]] = None
    actor_ids: Optional[List[str]] = None
    resource_types: Optional[List[str]] = None
    resource_ids: Optional[List[str]] = None
    
    # Search
    search_query: Optional[str] = None
    
    # Pagination
    page: int = Field(1, ge=1)
    per_page: int = Field(50, ge=1, le=1000)
    
    # Sorting
    sort_by: str = "timestamp"
    sort_order: str = "desc"


class AuditSearchResult(BaseModel):
    """Result of audit log search"""
    entries: List[AuditEntry]
    total: int
    page: int
    per_page: int
    pages: int


class AuditExportRequest(BaseModel):
    """Request to export audit logs"""
    filters: AuditSearchRequest
    format: str = "json"  # "json", "csv", "pdf"
    include_metadata: bool = True
    encryption_key: Optional[str] = None  # For encrypted exports


class AuditStatistics(BaseModel):
    """Audit statistics summary"""
    period_start: datetime
    period_end: datetime
    
    # Event statistics
    total_events: int
    events_by_type: Dict[str, int]
    events_by_severity: Dict[str, int]
    events_by_day: List[Dict[str, Any]]
    
    # User statistics
    active_users: int
    top_users: List[Dict[str, Any]]
    
    # Resource statistics
    resources_accessed: Dict[str, int]
    resources_modified: Dict[str, int]
    
    # Security statistics
    failed_logins: int
    security_alerts: int
    policy_violations: int
    
    # Compliance statistics
    compliance_score: float
    compliance_issues: List[Dict[str, Any]]


class AuditRetentionPolicy(BaseModel):
    """Audit log retention policy"""
    id: str
    name: str
    description: str
    
    # Retention rules by event type
    retention_rules: Dict[AuditEventType, int]  # days to retain
    
    # Archive configuration
    archive_enabled: bool = True
    archive_location: Optional[str] = None
    archive_encryption: bool = True
    
    # Purge configuration
    auto_purge: bool = True
    purge_schedule: Optional[Dict[str, Any]] = None
    
    created_at: datetime
    created_by: str
    updated_at: datetime
    updated_by: str


class AuditIntegration(BaseModel):
    """Integration with external audit/SIEM systems"""
    id: str
    name: str
    integration_type: str  # "splunk", "elasticsearch", "datadog", etc.
    
    # Connection configuration
    endpoint_url: str
    api_key_id: str  # Reference to secure storage
    
    # Data configuration
    event_types: List[AuditEventType]  # Events to forward
    include_pii: bool = False
    data_format: str = "json"
    
    # Integration status
    is_active: bool = True
    last_sync: Optional[datetime] = None
    sync_errors: List[Dict[str, Any]] = Field(default_factory=list)
    
    created_at: datetime
    created_by: str