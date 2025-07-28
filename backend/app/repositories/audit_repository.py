"""
Audit Repository

This module provides data access layer for enterprise audit logging and compliance.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from ..models.audit_models import (
    AuditEntry, AuditSession, AuditReport, AuditReportResult,
    ComplianceRequirement, AuditPolicy, AuditAlert,
    AuditEventType, AuditSeverity, AuditRetentionPolicy,
    AuditIntegration, AuditSearchRequest, AuditStatistics
)
# from ..logger import logger
import uuid
from collections import defaultdict


class AuditRepository:
    """Repository for managing audit logs, compliance, and security monitoring"""
    
    def __init__(self):
        self.audit_entries: Dict[str, AuditEntry] = {}
        self.audit_sessions: Dict[str, AuditSession] = {}
        self.audit_reports: Dict[str, AuditReport] = {}
        self.audit_report_results: Dict[str, AuditReportResult] = {}
        self.compliance_requirements: Dict[str, ComplianceRequirement] = {}
        self.audit_policies: Dict[str, AuditPolicy] = {}
        self.audit_alerts: Dict[str, AuditAlert] = {}
        self.retention_policies: Dict[str, AuditRetentionPolicy] = {}
        self.audit_integrations: Dict[str, AuditIntegration] = {}
        
        # Index for faster searching
        self.entries_by_user: Dict[str, List[str]] = defaultdict(list)
        self.entries_by_resource: Dict[str, List[str]] = defaultdict(list)
        self.entries_by_date: Dict[str, List[str]] = defaultdict(list)
        self.entries_by_event_type: Dict[AuditEventType, List[str]] = defaultdict(list)
        
        # Initialize default policies
        self._initialize_default_policies()
    
    def _initialize_default_policies(self):
        """Initialize default audit policies"""
        # Default retention policy
        default_retention = AuditRetentionPolicy(
            id="default_retention",
            name="Default Retention Policy",
            description="Default retention periods for audit logs",
            retention_rules={
                AuditEventType.LOGIN_SUCCESS: 90,
                AuditEventType.LOGIN_FAILURE: 365,
                AuditEventType.RESOURCE_CREATED: 365,
                AuditEventType.RESOURCE_UPDATED: 365,
                AuditEventType.RESOURCE_DELETED: 2555,  # 7 years
                AuditEventType.PERMISSION_GRANTED: 2555,
                AuditEventType.PERMISSION_REVOKED: 2555,
                AuditEventType.DATA_EXPORTED: 2555,
                AuditEventType.SECURITY_ALERT: 2555,
                AuditEventType.POLICY_VIOLATION: 2555,
            },
            archive_enabled=True,
            archive_encryption=True,
            auto_purge=True,
            created_at=datetime.now(),
            created_by="system",
            updated_at=datetime.now(),
            updated_by="system"
        )
        self.retention_policies["default_retention"] = default_retention
        
        # Default audit policy
        default_policy = AuditPolicy(
            id="default_policy",
            name="Default Audit Policy",
            description="Default policy for audit logging",
            rules=[
                {
                    "event_type": "login_failure",
                    "threshold": 5,
                    "window_minutes": 15,
                    "action": "alert",
                    "severity": "warning"
                },
                {
                    "event_type": "permission_check_denied",
                    "threshold": 10,
                    "window_minutes": 5,
                    "action": "alert",
                    "severity": "warning"
                },
                {
                    "resource_type": "sensitive",
                    "actions": ["read", "export"],
                    "require_reason": True
                }
            ],
            enabled_events=list(AuditEventType),
            event_details_level="full",
            retention_rules={
                "default": 365,
                "security_events": 2555,
                "routine_events": 90
            },
            alert_rules=[],
            is_active=True,
            created_at=datetime.now(),
            created_by="system",
            updated_at=datetime.now(),
            updated_by="system"
        )
        self.audit_policies["default_policy"] = default_policy
    
    # Audit entry operations
    
    def create_audit_entry(self, entry: AuditEntry) -> AuditEntry:
        """Create a new audit entry"""
        if not entry.id:
            entry.id = str(uuid.uuid4())
        
        self.audit_entries[entry.id] = entry
        
        # Update indexes
        if entry.actor_id:
            self.entries_by_user[entry.actor_id].append(entry.id)
        
        if entry.resource_id:
            resource_key = f"{entry.resource_type}:{entry.resource_id}"
            self.entries_by_resource[resource_key].append(entry.id)
        
        date_key = entry.timestamp.strftime("%Y-%m-%d")
        self.entries_by_date[date_key].append(entry.id)
        
        self.entries_by_event_type[entry.event_type].append(entry.id)
        
        # Check for alert conditions
        self._check_alert_conditions(entry)
        
        # Update session if exists
        if entry.actor_id and "session_id" in entry.actor_details:
            session_id = entry.actor_details["session_id"]
            self._update_session_activity(session_id, entry)
        
        # logger.info(f"Created audit entry: {entry.id} - {entry.event_type}")
        return entry
    
    def get_audit_entry(self, entry_id: str) -> Optional[AuditEntry]:
        """Get an audit entry by ID"""
        return self.audit_entries.get(entry_id)
    
    def search_audit_entries(self, request: AuditSearchRequest) -> Dict[str, Any]:
        """Search audit entries with filters"""
        # Start with all entries
        entry_ids = set(self.audit_entries.keys())
        
        # Apply filters
        if request.start_date:
            filtered_ids = set()
            for entry_id in entry_ids:
                entry = self.audit_entries[entry_id]
                if entry.timestamp >= request.start_date:
                    filtered_ids.add(entry_id)
            entry_ids = entry_ids.intersection(filtered_ids)
        
        if request.end_date:
            filtered_ids = set()
            for entry_id in entry_ids:
                entry = self.audit_entries[entry_id]
                if entry.timestamp <= request.end_date:
                    filtered_ids.add(entry_id)
            entry_ids = entry_ids.intersection(filtered_ids)
        
        if request.event_types:
            filtered_ids = set()
            for event_type in request.event_types:
                filtered_ids.update(self.entries_by_event_type[event_type])
            entry_ids = entry_ids.intersection(filtered_ids)
        
        if request.actor_ids:
            filtered_ids = set()
            for actor_id in request.actor_ids:
                filtered_ids.update(self.entries_by_user[actor_id])
            entry_ids = entry_ids.intersection(filtered_ids)
        
        if request.resource_ids:
            filtered_ids = set()
            for resource_id in request.resource_ids:
                if request.resource_types:
                    for resource_type in request.resource_types:
                        key = f"{resource_type}:{resource_id}"
                        filtered_ids.update(self.entries_by_resource.get(key, []))
                else:
                    # Search across all resource types
                    for key in self.entries_by_resource:
                        if key.endswith(f":{resource_id}"):
                            filtered_ids.update(self.entries_by_resource[key])
            entry_ids = entry_ids.intersection(filtered_ids)
        
        if request.severities:
            filtered_ids = set()
            for entry_id in entry_ids:
                entry = self.audit_entries[entry_id]
                if entry.severity in request.severities:
                    filtered_ids.add(entry_id)
            entry_ids = filtered_ids
        
        if request.search_query:
            filtered_ids = set()
            query_lower = request.search_query.lower()
            for entry_id in entry_ids:
                entry = self.audit_entries[entry_id]
                # Search in various fields
                searchable_text = " ".join([
                    entry.action,
                    entry.resource_name or "",
                    entry.error_message or "",
                    " ".join(entry.search_terms)
                ]).lower()
                if query_lower in searchable_text:
                    filtered_ids.add(entry_id)
            entry_ids = filtered_ids
        
        # Sort entries
        entries = [self.audit_entries[id] for id in entry_ids]
        
        if request.sort_by == "timestamp":
            entries.sort(key=lambda e: e.timestamp, reverse=(request.sort_order == "desc"))
        elif request.sort_by == "severity":
            severity_order = {
                AuditSeverity.INFO: 0,
                AuditSeverity.WARNING: 1,
                AuditSeverity.ERROR: 2,
                AuditSeverity.CRITICAL: 3
            }
            entries.sort(
                key=lambda e: severity_order.get(e.severity, 0),
                reverse=(request.sort_order == "desc")
            )
        
        # Paginate
        total = len(entries)
        start_idx = (request.page - 1) * request.per_page
        end_idx = start_idx + request.per_page
        page_entries = entries[start_idx:end_idx]
        
        return {
            "entries": page_entries,
            "total": total,
            "page": request.page,
            "per_page": request.per_page,
            "pages": (total + request.per_page - 1) // request.per_page
        }
    
    def get_audit_statistics(self, start_date: datetime, end_date: datetime) -> AuditStatistics:
        """Get audit statistics for a period"""
        stats = AuditStatistics(
            period_start=start_date,
            period_end=end_date,
            total_events=0,
            events_by_type={},
            events_by_severity={},
            events_by_day=[],
            active_users=0,
            top_users=[],
            resources_accessed={},
            resources_modified={},
            failed_logins=0,
            security_alerts=0,
            policy_violations=0,
            compliance_score=100.0,
            compliance_issues=[]
        )
        
        # Collect statistics
        user_activity = defaultdict(int)
        daily_events = defaultdict(int)
        
        for entry in self.audit_entries.values():
            if start_date <= entry.timestamp <= end_date:
                stats.total_events += 1
                
                # Events by type
                event_type = entry.event_type.value
                stats.events_by_type[event_type] = stats.events_by_type.get(event_type, 0) + 1
                
                # Events by severity
                severity = entry.severity.value
                stats.events_by_severity[severity] = stats.events_by_severity.get(severity, 0) + 1
                
                # Daily events
                day_key = entry.timestamp.strftime("%Y-%m-%d")
                daily_events[day_key] += 1
                
                # User activity
                if entry.actor_id:
                    user_activity[entry.actor_id] += 1
                
                # Resource statistics
                if entry.resource_type:
                    if entry.event_type == AuditEventType.DATA_ACCESSED:
                        stats.resources_accessed[entry.resource_type] = \
                            stats.resources_accessed.get(entry.resource_type, 0) + 1
                    elif entry.event_type in [AuditEventType.RESOURCE_UPDATED, 
                                            AuditEventType.RESOURCE_CREATED,
                                            AuditEventType.RESOURCE_DELETED]:
                        stats.resources_modified[entry.resource_type] = \
                            stats.resources_modified.get(entry.resource_type, 0) + 1
                
                # Security statistics
                if entry.event_type == AuditEventType.LOGIN_FAILURE:
                    stats.failed_logins += 1
                elif entry.event_type == AuditEventType.SECURITY_ALERT:
                    stats.security_alerts += 1
                elif entry.event_type == AuditEventType.POLICY_VIOLATION:
                    stats.policy_violations += 1
        
        # Format daily events
        current_date = start_date.date()
        while current_date <= end_date.date():
            day_key = current_date.strftime("%Y-%m-%d")
            stats.events_by_day.append({
                "date": day_key,
                "count": daily_events.get(day_key, 0)
            })
            current_date += timedelta(days=1)
        
        # Top users
        stats.active_users = len(user_activity)
        sorted_users = sorted(user_activity.items(), key=lambda x: x[1], reverse=True)
        stats.top_users = [
            {"user_id": user_id, "event_count": count}
            for user_id, count in sorted_users[:10]
        ]
        
        # Calculate compliance score (simplified)
        if stats.total_events > 0:
            violations = stats.policy_violations + stats.security_alerts
            stats.compliance_score = max(0, 100 - (violations / stats.total_events * 100))
        
        return stats
    
    # Session management
    
    def create_audit_session(self, session: AuditSession) -> AuditSession:
        """Create a new audit session"""
        if not session.id:
            session.id = str(uuid.uuid4())
        
        self.audit_sessions[session.id] = session
        # logger.info(f"Created audit session: {session.id} for user {session.user_id}")
        return session
    
    def get_audit_session(self, session_id: str) -> Optional[AuditSession]:
        """Get an audit session by ID"""
        return self.audit_sessions.get(session_id)
    
    def get_active_sessions_for_user(self, user_id: str) -> List[AuditSession]:
        """Get active sessions for a user"""
        sessions = []
        for session in self.audit_sessions.values():
            if session.user_id == user_id and session.is_active:
                sessions.append(session)
        return sessions
    
    def end_audit_session(self, session_id: str) -> bool:
        """End an audit session"""
        session = self.audit_sessions.get(session_id)
        if not session:
            return False
        
        session.session_end = datetime.now()
        session.is_active = False
        # logger.info(f"Ended audit session: {session_id}")
        return True
    
    def _update_session_activity(self, session_id: str, entry: AuditEntry):
        """Update session activity based on audit entry"""
        session = self.audit_sessions.get(session_id)
        if session and session.is_active:
            session.event_count += 1
            
            if entry.resource_type:
                session.resource_access_count[entry.resource_type] = \
                    session.resource_access_count.get(entry.resource_type, 0) + 1
            
            # Update risk score based on suspicious activities
            if entry.severity in [AuditSeverity.WARNING, AuditSeverity.ERROR, AuditSeverity.CRITICAL]:
                session.risk_score += 0.1
            
            if entry.event_type in [AuditEventType.LOGIN_FAILURE, 
                                   AuditEventType.PERMISSION_CHECK_DENIED,
                                   AuditEventType.POLICY_VIOLATION]:
                session.risk_score += 0.2
                session.anomalies_detected.append(entry.event_type.value)
    
    # Alert management
    
    def create_audit_alert(self, alert: AuditAlert) -> AuditAlert:
        """Create a new audit alert"""
        if not alert.id:
            alert.id = str(uuid.uuid4())
        
        self.audit_alerts[alert.id] = alert
        # logger.warning(f"Created audit alert: {alert.id} - {alert.title}")
        return alert
    
    def get_audit_alert(self, alert_id: str) -> Optional[AuditAlert]:
        """Get an audit alert by ID"""
        return self.audit_alerts.get(alert_id)
    
    def get_open_alerts(self) -> List[AuditAlert]:
        """Get all open alerts"""
        return [a for a in self.audit_alerts.values() if a.status == "open"]
    
    def acknowledge_alert(self, alert_id: str, user_id: str) -> bool:
        """Acknowledge an alert"""
        alert = self.audit_alerts.get(alert_id)
        if not alert:
            return False
        
        alert.status = "acknowledged"
        alert.acknowledged_by = user_id
        alert.acknowledged_at = datetime.now()
        # logger.info(f"Alert {alert_id} acknowledged by {user_id}")
        return True
    
    def resolve_alert(self, alert_id: str, user_id: str, notes: str) -> bool:
        """Resolve an alert"""
        alert = self.audit_alerts.get(alert_id)
        if not alert:
            return False
        
        alert.status = "resolved"
        alert.resolved_by = user_id
        alert.resolved_at = datetime.now()
        alert.resolution_notes = notes
        # logger.info(f"Alert {alert_id} resolved by {user_id}")
        return True
    
    def _check_alert_conditions(self, entry: AuditEntry):
        """Check if an audit entry triggers any alert conditions"""
        # Get active policies
        for policy in self.audit_policies.values():
            if not policy.is_active:
                continue
            
            for rule in policy.rules:
                if self._matches_alert_rule(entry, rule):
                    # Check threshold within time window
                    if self._check_threshold(entry, rule):
                        # Create alert
                        alert = AuditAlert(
                            id=str(uuid.uuid4()),
                            triggered_at=datetime.now(),
                            alert_type=rule.get("action", "alert"),
                            severity=AuditSeverity(rule.get("severity", "warning")),
                            title=f"Alert: {rule.get('description', entry.event_type.value)}",
                            description=f"Threshold exceeded for {entry.event_type.value}",
                            trigger_event_ids=[entry.id],
                            trigger_rule=rule,
                            status="open"
                        )
                        self.create_audit_alert(alert)
    
    def _matches_alert_rule(self, entry: AuditEntry, rule: Dict[str, Any]) -> bool:
        """Check if entry matches alert rule conditions"""
        if "event_type" in rule and entry.event_type.value != rule["event_type"]:
            return False
        
        if "resource_type" in rule and entry.resource_type != rule["resource_type"]:
            return False
        
        if "severity" in rule and entry.severity.value != rule["severity"]:
            return False
        
        return True
    
    def _check_threshold(self, entry: AuditEntry, rule: Dict[str, Any]) -> bool:
        """Check if threshold is exceeded within time window"""
        threshold = rule.get("threshold", 1)
        window_minutes = rule.get("window_minutes", 60)
        
        # Count matching events within window
        count = 0
        window_start = entry.timestamp - timedelta(minutes=window_minutes)
        
        for other_entry in self.audit_entries.values():
            if (other_entry.timestamp >= window_start and
                other_entry.timestamp <= entry.timestamp and
                self._matches_alert_rule(other_entry, rule)):
                count += 1
        
        return count >= threshold
    
    # Report management
    
    def create_audit_report(self, report: AuditReport) -> AuditReport:
        """Create a new audit report"""
        if not report.id:
            report.id = str(uuid.uuid4())
        
        self.audit_reports[report.id] = report
        # logger.info(f"Created audit report: {report.id} - {report.name}")
        return report
    
    def get_audit_report(self, report_id: str) -> Optional[AuditReport]:
        """Get an audit report by ID"""
        return self.audit_reports.get(report_id)
    
    def get_scheduled_reports(self) -> List[AuditReport]:
        """Get all scheduled reports"""
        return [r for r in self.audit_reports.values() if r.schedule and r.is_active]
    
    def run_audit_report(self, report_id: str) -> AuditReportResult:
        """Run an audit report and generate results"""
        report = self.audit_reports.get(report_id)
        if not report:
            raise ValueError(f"Report {report_id} not found")
        
        start_time = datetime.now()
        
        # Apply report filters
        search_request = AuditSearchRequest(
            start_date=report.filters.get("date_range", {}).get("start"),
            end_date=report.filters.get("date_range", {}).get("end"),
            event_types=report.filters.get("event_types"),
            actor_ids=report.filters.get("users"),
            resource_types=report.filters.get("resource_types"),
            per_page=1000  # Get all results for reporting
        )
        
        search_results = self.search_audit_entries(search_request)
        entries = search_results["entries"]
        
        # Generate report data
        report_data = []
        summary = {
            "total_events": len(entries),
            "date_range": report.filters.get("date_range", {}),
            "filters_applied": len(report.filters)
        }
        
        # Group data if specified
        if report.group_by:
            grouped_data = defaultdict(list)
            for entry in entries:
                for group_field in report.group_by:
                    if group_field == "user":
                        key = entry.actor_id or "system"
                    elif group_field == "event_type":
                        key = entry.event_type.value
                    elif group_field == "date":
                        key = entry.timestamp.strftime("%Y-%m-%d")
                    else:
                        key = "other"
                    grouped_data[key].append(entry)
            
            for key, group_entries in grouped_data.items():
                report_data.append({
                    "group": key,
                    "count": len(group_entries),
                    "entries": group_entries[:100]  # Limit entries per group
                })
        else:
            report_data = [{"entries": entries}]
        
        # Create report result
        result = AuditReportResult(
            id=str(uuid.uuid4()),
            report_id=report_id,
            generated_at=datetime.now(),
            summary=summary,
            data=report_data,
            charts=[],  # Charts would be generated by frontend
            row_count=len(entries),
            execution_time_ms=int((datetime.now() - start_time).total_seconds() * 1000)
        )
        
        self.audit_report_results[result.id] = result
        
        # Update report last run time
        report.last_run = datetime.now()
        
        # logger.info(f"Generated audit report result: {result.id} for report {report_id}")
        return result
    
    def get_audit_report_result(self, result_id: str) -> Optional[AuditReportResult]:
        """Get an audit report result by ID"""
        return self.audit_report_results.get(result_id)
    
    # Compliance management
    
    def create_compliance_requirement(self, requirement: ComplianceRequirement) -> ComplianceRequirement:
        """Create a compliance requirement"""
        if not requirement.id:
            requirement.id = str(uuid.uuid4())
        
        self.compliance_requirements[requirement.id] = requirement
        # logger.info(f"Created compliance requirement: {requirement.id} - {requirement.name}")
        return requirement
    
    def get_compliance_requirement(self, requirement_id: str) -> Optional[ComplianceRequirement]:
        """Get a compliance requirement by ID"""
        return self.compliance_requirements.get(requirement_id)
    
    def get_compliance_requirements_by_standard(self, standard: str) -> List[ComplianceRequirement]:
        """Get compliance requirements for a standard"""
        return [r for r in self.compliance_requirements.values() if r.standard == standard]
    
    def assess_compliance(self, requirement_id: str) -> Dict[str, Any]:
        """Assess compliance for a requirement"""
        requirement = self.compliance_requirements.get(requirement_id)
        if not requirement:
            raise ValueError(f"Requirement {requirement_id} not found")
        
        assessment = {
            "requirement_id": requirement_id,
            "assessed_at": datetime.now(),
            "status": "compliant",
            "findings": [],
            "score": 100.0
        }
        
        # Check required events are being logged
        missing_events = []
        for event_type in requirement.required_events:
            if not self.entries_by_event_type.get(event_type):
                missing_events.append(event_type.value)
        
        if missing_events:
            assessment["status"] = "non_compliant"
            assessment["findings"].append({
                "type": "missing_events",
                "description": f"Required events not being logged: {', '.join(missing_events)}",
                "severity": "high"
            })
            assessment["score"] -= 50.0
        
        # Check retention compliance
        # This is simplified - real implementation would check actual retention
        retention_policy = self.retention_policies.get("default_retention")
        if retention_policy:
            for event_type in requirement.required_events:
                required_days = requirement.retention_days
                actual_days = retention_policy.retention_rules.get(event_type, 0)
                if actual_days < required_days:
                    assessment["status"] = "partial"
                    assessment["findings"].append({
                        "type": "retention_insufficient",
                        "description": f"Retention for {event_type.value} is {actual_days} days, required {required_days}",
                        "severity": "medium"
                    })
                    assessment["score"] -= 10.0
        
        # Update requirement
        requirement.last_assessment = datetime.now()
        requirement.compliance_status = assessment["status"]
        
        return assessment
    
    # Retention and cleanup
    
    def apply_retention_policy(self, policy_id: str) -> Dict[str, int]:
        """Apply retention policy and remove expired entries"""
        policy = self.retention_policies.get(policy_id)
        if not policy:
            raise ValueError(f"Retention policy {policy_id} not found")
        
        removed_count = 0
        archived_count = 0
        current_time = datetime.now()
        
        entries_to_remove = []
        
        for entry_id, entry in self.audit_entries.items():
            # Get retention period for event type
            retention_days = policy.retention_rules.get(
                entry.event_type,
                policy.retention_rules.get("default", 365)
            )
            
            expire_time = entry.timestamp + timedelta(days=retention_days)
            
            if current_time > expire_time:
                if policy.archive_enabled:
                    # In real implementation, would archive to external storage
                    archived_count += 1
                
                if policy.auto_purge:
                    entries_to_remove.append(entry_id)
                    removed_count += 1
        
        # Remove expired entries
        for entry_id in entries_to_remove:
            self._remove_audit_entry(entry_id)
        
        # logger.info(f"Applied retention policy {policy_id}: removed {removed_count}, archived {archived_count}")
        
        return {
            "removed": removed_count,
            "archived": archived_count
        }
    
    def _remove_audit_entry(self, entry_id: str):
        """Remove an audit entry and update indexes"""
        entry = self.audit_entries.get(entry_id)
        if not entry:
            return
        
        # Remove from indexes
        if entry.actor_id:
            self.entries_by_user[entry.actor_id].remove(entry_id)
        
        if entry.resource_id:
            resource_key = f"{entry.resource_type}:{entry.resource_id}"
            self.entries_by_resource[resource_key].remove(entry_id)
        
        date_key = entry.timestamp.strftime("%Y-%m-%d")
        self.entries_by_date[date_key].remove(entry_id)
        
        self.entries_by_event_type[entry.event_type].remove(entry_id)
        
        # Remove entry
        del self.audit_entries[entry_id]