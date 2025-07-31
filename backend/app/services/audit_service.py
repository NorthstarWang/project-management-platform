"""
Audit Service

This module provides business logic for enterprise audit logging and compliance.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from ..models.audit_models import (
    AuditEntry, AuditSession, AuditReport, AuditReportResult,
    ComplianceRequirement, AuditPolicy, AuditAlert,
    AuditEventType, AuditSeverity, AuditRetentionPolicy,
    AuditIntegration, AuditSearchRequest, AuditSearchResult,
    AuditStatistics, AuditExportRequest
)
from ..repositories.audit_repository import AuditRepository
from ..repositories.user_repository import UserRepository
from ..logger import logger
import uuid
import json
import csv
from io import StringIO


class AuditService:
    """Service for managing audit logs, compliance, and security monitoring"""
    
    def __init__(self, audit_repository: AuditRepository, user_repository: UserRepository):
        self.audit_repo = audit_repository
        self.user_repo = user_repository
        self._active_sessions: Dict[str, str] = {}  # user_id -> session_id
    
    # Audit logging
    
    def log_event(self, event_type: AuditEventType, actor_id: Optional[str], 
                  action: str, resource_type: Optional[str] = None,
                  resource_id: Optional[str] = None, resource_name: Optional[str] = None,
                  severity: AuditSeverity = AuditSeverity.INFO,
                  result: str = "success", error_message: Optional[str] = None,
                  changes: Optional[Dict[str, Any]] = None,
                  context: Optional[Dict[str, Any]] = None,
                  actor_details: Optional[Dict[str, Any]] = None) -> AuditEntry:
        """Log an audit event"""
        
        # Build search terms for better searchability
        search_terms = [action, event_type.value]
        if resource_name:
            search_terms.append(resource_name)
        if resource_type:
            search_terms.append(resource_type)
        if actor_id:
            user = self.user_repo.find_by_id(actor_id)
            if user:
                search_terms.extend([user.get('username', ''), user.get('full_name', '')])
        
        # Get session ID if user has active session
        session_id = None
        if actor_id and actor_id in self._active_sessions:
            session_id = self._active_sessions[actor_id]
        
        # Build actor details
        if not actor_details:
            actor_details = {}
        if session_id:
            actor_details["session_id"] = session_id
        
        # Determine compliance tags based on event type
        compliance_tags = []
        if event_type in [AuditEventType.LOGIN_SUCCESS, AuditEventType.LOGIN_FAILURE]:
            compliance_tags.append("authentication")
        if event_type in [AuditEventType.DATA_EXPORTED, AuditEventType.DATA_ACCESSED]:
            compliance_tags.append("data_access")
        if event_type in [AuditEventType.PERMISSION_GRANTED, AuditEventType.PERMISSION_REVOKED]:
            compliance_tags.append("access_control")
        if severity in [AuditSeverity.ERROR, AuditSeverity.CRITICAL]:
            compliance_tags.append("security")
        
        # Create audit entry
        entry = AuditEntry(
            id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            event_type=event_type,
            severity=severity,
            actor_id=actor_id,
            actor_type="user" if actor_id else "system",
            actor_details=actor_details,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            action=action,
            action_details={},
            changes=changes,
            result=result,
            error_message=error_message,
            context=context or {},
            compliance_tags=compliance_tags,
            search_terms=search_terms
        )
        
        return self.audit_repo.create_audit_entry(entry)
    
    def log_authentication(self, user_id: str, success: bool, 
                          ip_address: str, user_agent: str,
                          error_reason: Optional[str] = None) -> AuditEntry:
        """Log authentication attempt"""
        event_type = AuditEventType.LOGIN_SUCCESS if success else AuditEventType.LOGIN_FAILURE
        severity = AuditSeverity.INFO if success else AuditSeverity.WARNING
        
        return self.log_event(
            event_type=event_type,
            actor_id=user_id,
            action="user_login",
            severity=severity,
            result="success" if success else "failure",
            error_message=error_reason,
            actor_details={
                "ip": ip_address,
                "user_agent": user_agent
            }
        )
    
    def log_resource_access(self, user_id: str, resource_type: str, 
                           resource_id: str, action: str,
                           granted: bool = True) -> AuditEntry:
        """Log resource access attempt"""
        event_type = AuditEventType.DATA_ACCESSED if granted else AuditEventType.PERMISSION_CHECK_DENIED
        severity = AuditSeverity.INFO if granted else AuditSeverity.WARNING
        
        return self.log_event(
            event_type=event_type,
            actor_id=user_id,
            action=f"{action}_resource",
            resource_type=resource_type,
            resource_id=resource_id,
            severity=severity,
            result="success" if granted else "denied"
        )
    
    def log_data_change(self, user_id: str, resource_type: str,
                       resource_id: str, resource_name: str,
                       action: str, changes: Dict[str, Any]) -> AuditEntry:
        """Log data modification"""
        # Determine event type based on action
        if action == "create":
            event_type = AuditEventType.RESOURCE_CREATED
        elif action == "update":
            event_type = AuditEventType.RESOURCE_UPDATED
        elif action == "delete":
            event_type = AuditEventType.RESOURCE_DELETED
        elif action == "archive":
            event_type = AuditEventType.RESOURCE_ARCHIVED
        elif action == "restore":
            event_type = AuditEventType.RESOURCE_RESTORED
        else:
            event_type = AuditEventType.RESOURCE_UPDATED
        
        return self.log_event(
            event_type=event_type,
            actor_id=user_id,
            action=f"{action}_{resource_type}",
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            changes=changes
        )
    
    # Session management
    
    def start_session(self, user_id: str, ip_address: str, user_agent: str,
                     location: Optional[Dict[str, Any]] = None) -> AuditSession:
        """Start a new audit session"""
        # End any existing session
        if user_id in self._active_sessions:
            self.end_session(self._active_sessions[user_id])
        
        # Create new session
        session = AuditSession(
            id=str(uuid.uuid4()),
            user_id=user_id,
            session_start=datetime.now(),
            ip_address=ip_address,
            user_agent=user_agent,
            location=location
        )
        
        created_session = self.audit_repo.create_audit_session(session)
        self._active_sessions[user_id] = created_session.id
        
        # Log session start
        self.log_event(
            event_type=AuditEventType.LOGIN_SUCCESS,
            actor_id=user_id,
            action="session_start",
            actor_details={
                "ip": ip_address,
                "user_agent": user_agent,
                "session_id": created_session.id
            }
        )
        
        return created_session
    
    def end_session(self, session_id: str) -> bool:
        """End an audit session"""
        session = self.audit_repo.get_audit_session(session_id)
        if not session:
            return False
        
        # Remove from active sessions
        if session.user_id in self._active_sessions:
            del self._active_sessions[session.user_id]
        
        # End session
        success = self.audit_repo.end_audit_session(session_id)
        
        if success:
            # Log session end
            self.log_event(
                event_type=AuditEventType.LOGOUT,
                actor_id=session.user_id,
                action="session_end",
                actor_details={
                    "session_id": session_id,
                    "duration_minutes": int((datetime.now() - session.session_start).total_seconds() / 60)
                }
            )
        
        return success
    
    def get_user_sessions(self, user_id: str, active_only: bool = True) -> List[AuditSession]:
        """Get sessions for a user"""
        if active_only:
            return self.audit_repo.get_active_sessions_for_user(user_id)
        
        # Get all sessions for user
        sessions = []
        for session in self.audit_repo.audit_sessions.values():
            if session.user_id == user_id:
                sessions.append(session)
        
        return sorted(sessions, key=lambda s: s.session_start, reverse=True)
    
    # Audit search and reporting
    
    def search_audit_logs(self, request: AuditSearchRequest) -> AuditSearchResult:
        """Search audit logs"""
        result = self.audit_repo.search_audit_entries(request)
        
        return AuditSearchResult(
            entries=result["entries"],
            total=result["total"],
            page=result["page"],
            per_page=result["per_page"],
            pages=result["pages"]
        )
    
    def get_audit_statistics(self, start_date: datetime, end_date: datetime) -> AuditStatistics:
        """Get audit statistics for a period"""
        return self.audit_repo.get_audit_statistics(start_date, end_date)
    
    def export_audit_logs(self, request: AuditExportRequest) -> Dict[str, Any]:
        """Export audit logs in requested format"""
        # Search for entries
        search_result = self.audit_repo.search_audit_entries(request.filters)
        entries = search_result["entries"]
        
        if request.format == "json":
            # JSON export
            data = []
            for entry in entries:
                entry_dict = entry.dict()
                # Convert datetime to ISO format
                entry_dict["timestamp"] = entry.timestamp.isoformat()
                if request.include_metadata:
                    entry_dict["_metadata"] = {
                        "exported_at": datetime.now().isoformat(),
                        "total_entries": len(entries)
                    }
                data.append(entry_dict)
            
            content = json.dumps(data, indent=2)
            content_type = "application/json"
            filename = f"audit_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            
        elif request.format == "csv":
            # CSV export
            output = StringIO()
            
            # Define CSV columns
            fieldnames = [
                "timestamp", "event_type", "severity", "actor_id", "action",
                "resource_type", "resource_id", "resource_name", "result",
                "error_message"
            ]
            
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            
            for entry in entries:
                row = {
                    "timestamp": entry.timestamp.isoformat(),
                    "event_type": entry.event_type.value,
                    "severity": entry.severity.value,
                    "actor_id": entry.actor_id or "system",
                    "action": entry.action,
                    "resource_type": entry.resource_type or "",
                    "resource_id": entry.resource_id or "",
                    "resource_name": entry.resource_name or "",
                    "result": entry.result,
                    "error_message": entry.error_message or ""
                }
                writer.writerow(row)
            
            content = output.getvalue()
            content_type = "text/csv"
            filename = f"audit_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            
        else:
            raise ValueError(f"Unsupported export format: {request.format}")
        
        # Log the export
        self.log_event(
            event_type=AuditEventType.DATA_EXPORTED,
            actor_id=None,  # System export
            action="export_audit_logs",
            context={
                "format": request.format,
                "entry_count": len(entries),
                "filters": request.filters.dict()
            }
        )
        
        return {
            "content": content,
            "content_type": content_type,
            "filename": filename,
            "entry_count": len(entries)
        }
    
    # Report management
    
    def create_audit_report(self, report: AuditReport) -> AuditReport:
        """Create an audit report"""
        return self.audit_repo.create_audit_report(report)
    
    def update_audit_report(self, report_id: str, updates: Dict[str, Any]) -> Optional[AuditReport]:
        """Update an audit report"""
        report = self.audit_repo.get_audit_report(report_id)
        if not report:
            return None
        
        for key, value in updates.items():
            if hasattr(report, key):
                setattr(report, key, value)
        
        return report
    
    def delete_audit_report(self, report_id: str) -> bool:
        """Delete an audit report"""
        if report_id in self.audit_repo.audit_reports:
            del self.audit_repo.audit_reports[report_id]
            return True
        return False
    
    def run_audit_report(self, report_id: str) -> AuditReportResult:
        """Run an audit report"""
        return self.audit_repo.run_audit_report(report_id)
    
    def get_scheduled_reports_due(self) -> List[AuditReport]:
        """Get scheduled reports that are due to run"""
        due_reports = []
        current_time = datetime.now()
        
        for report in self.audit_repo.get_scheduled_reports():
            if report.next_run and report.next_run <= current_time:
                due_reports.append(report)
        
        return due_reports
    
    def update_report_schedule(self, report_id: str) -> Optional[datetime]:
        """Update next run time for a scheduled report"""
        report = self.audit_repo.get_audit_report(report_id)
        if not report or not report.schedule:
            return None
        
        # Simple scheduling logic
        frequency = report.schedule.get("frequency", "daily")
        if frequency == "hourly":
            next_run = datetime.now() + timedelta(hours=1)
        elif frequency == "daily":
            next_run = datetime.now() + timedelta(days=1)
        elif frequency == "weekly":
            next_run = datetime.now() + timedelta(weeks=1)
        elif frequency == "monthly":
            next_run = datetime.now() + timedelta(days=30)
        else:
            next_run = datetime.now() + timedelta(days=1)
        
        report.next_run = next_run
        return next_run
    
    # Alert management
    
    def get_open_alerts(self) -> List[AuditAlert]:
        """Get all open alerts"""
        return self.audit_repo.get_open_alerts()
    
    def get_user_alerts(self, user_id: str) -> List[AuditAlert]:
        """Get alerts assigned to a user"""
        alerts = []
        for alert in self.audit_repo.audit_alerts.values():
            if alert.assigned_to == user_id and alert.status in ["open", "acknowledged"]:
                alerts.append(alert)
        
        return sorted(alerts, key=lambda a: a.triggered_at, reverse=True)
    
    def acknowledge_alert(self, alert_id: str, user_id: str) -> bool:
        """Acknowledge an alert"""
        success = self.audit_repo.acknowledge_alert(alert_id, user_id)
        
        if success:
            # Log alert acknowledgment
            self.log_event(
                event_type=AuditEventType.SECURITY_ALERT,
                actor_id=user_id,
                action="acknowledge_alert",
                context={"alert_id": alert_id}
            )
        
        return success
    
    def resolve_alert(self, alert_id: str, user_id: str, resolution_notes: str) -> bool:
        """Resolve an alert"""
        success = self.audit_repo.resolve_alert(alert_id, user_id, resolution_notes)
        
        if success:
            # Log alert resolution
            self.log_event(
                event_type=AuditEventType.SECURITY_ALERT,
                actor_id=user_id,
                action="resolve_alert",
                context={
                    "alert_id": alert_id,
                    "resolution": resolution_notes
                }
            )
        
        return success
    
    def escalate_alert(self, alert_id: str, escalated_by: str, escalate_to: str, reason: str) -> bool:
        """Escalate an alert to another user"""
        alert = self.audit_repo.get_audit_alert(alert_id)
        if not alert:
            return False
        
        # Update assignment
        alert.assigned_to = escalate_to
        
        # Add to automated actions
        alert.automated_actions.append({
            "action": "escalated",
            "timestamp": datetime.now().isoformat(),
            "by": escalated_by,
            "to": escalate_to,
            "reason": reason
        })
        
        # Log escalation
        self.log_event(
            event_type=AuditEventType.SECURITY_ALERT,
            actor_id=escalated_by,
            action="escalate_alert",
            severity=AuditSeverity.WARNING,
            context={
                "alert_id": alert_id,
                "escalated_to": escalate_to,
                "reason": reason
            }
        )
        
        return True
    
    # Compliance management
    
    def create_compliance_requirement(self, requirement: ComplianceRequirement) -> ComplianceRequirement:
        """Create a compliance requirement"""
        return self.audit_repo.create_compliance_requirement(requirement)
    
    def update_compliance_requirement(self, requirement_id: str, updates: Dict[str, Any]) -> Optional[ComplianceRequirement]:
        """Update a compliance requirement"""
        requirement = self.audit_repo.get_compliance_requirement(requirement_id)
        if not requirement:
            return None
        
        for key, value in updates.items():
            if hasattr(requirement, key):
                setattr(requirement, key, value)
        
        requirement.updated_at = datetime.now()
        return requirement
    
    def assess_compliance(self, requirement_id: str) -> Dict[str, Any]:
        """Assess compliance for a requirement"""
        assessment = self.audit_repo.assess_compliance(requirement_id)
        
        # Log compliance assessment
        self.log_event(
            event_type=AuditEventType.SYSTEM_ERROR if assessment["status"] == "non_compliant" else AuditEventType.MAINTENANCE_EVENT,
            actor_id=None,
            action="compliance_assessment",
            severity=AuditSeverity.WARNING if assessment["status"] != "compliant" else AuditSeverity.INFO,
            context={
                "requirement_id": requirement_id,
                "status": assessment["status"],
                "score": assessment["score"]
            }
        )
        
        return assessment
    
    def get_compliance_dashboard(self) -> Dict[str, Any]:
        """Get compliance dashboard data"""
        requirements = list(self.audit_repo.compliance_requirements.values())
        
        dashboard = {
            "total_requirements": len(requirements),
            "by_standard": {},
            "by_status": {
                "compliant": 0,
                "non_compliant": 0,
                "partial": 0,
                "not_assessed": 0
            },
            "recent_assessments": [],
            "upcoming_assessments": []
        }
        
        # Group by standard and status
        for req in requirements:
            # By standard
            if req.standard not in dashboard["by_standard"]:
                dashboard["by_standard"][req.standard] = {
                    "total": 0,
                    "compliant": 0,
                    "non_compliant": 0
                }
            
            dashboard["by_standard"][req.standard]["total"] += 1
            
            # By status
            if not req.compliance_status:
                dashboard["by_status"]["not_assessed"] += 1
            else:
                dashboard["by_status"][req.compliance_status] += 1
                if req.compliance_status == "compliant":
                    dashboard["by_standard"][req.standard]["compliant"] += 1
                elif req.compliance_status == "non_compliant":
                    dashboard["by_standard"][req.standard]["non_compliant"] += 1
            
            # Recent assessments
            if req.last_assessment:
                dashboard["recent_assessments"].append({
                    "requirement_id": req.id,
                    "name": req.name,
                    "standard": req.standard,
                    "assessed_at": req.last_assessment,
                    "status": req.compliance_status
                })
        
        # Sort recent assessments
        dashboard["recent_assessments"].sort(
            key=lambda x: x["assessed_at"],
            reverse=True
        )
        dashboard["recent_assessments"] = dashboard["recent_assessments"][:10]
        
        return dashboard
    
    # Policy management
    
    def create_audit_policy(self, policy: AuditPolicy) -> AuditPolicy:
        """Create an audit policy"""
        return self.audit_repo.create_audit_policy(policy)
    
    def update_audit_policy(self, policy_id: str, updates: Dict[str, Any]) -> Optional[AuditPolicy]:
        """Update an audit policy"""
        return self.audit_repo.update_audit_policy(policy_id, updates)
    
    def get_active_policies(self) -> List[AuditPolicy]:
        """Get all active audit policies"""
        return self.audit_repo.get_active_permission_policies()
    
    def evaluate_policies(self, entry: AuditEntry) -> List[Dict[str, Any]]:
        """Evaluate which policies are triggered by an audit entry"""
        triggered_policies = []
        
        for policy in self.get_active_policies():
            if entry.event_type in policy.enabled_events:
                for rule in policy.rules:
                    if self._matches_policy_rule(entry, rule):
                        triggered_policies.append({
                            "policy_id": policy.id,
                            "policy_name": policy.name,
                            "rule": rule,
                            "action_required": rule.get("action", "none")
                        })
        
        return triggered_policies
    
    def _matches_policy_rule(self, entry: AuditEntry, rule: Dict[str, Any]) -> bool:
        """Check if an audit entry matches a policy rule"""
        if "event_type" in rule and entry.event_type.value != rule["event_type"]:
            return False
        
        if "resource_type" in rule and entry.resource_type != rule["resource_type"]:
            return False
        
        if "severity" in rule and entry.severity.value != rule["severity"]:
            return False
        
        if "result" in rule and entry.result != rule["result"]:
            return False
        
        return True
    
    # Retention management
    
    def apply_retention_policies(self) -> Dict[str, Any]:
        """Apply all active retention policies"""
        results = {
            "policies_applied": 0,
            "total_removed": 0,
            "total_archived": 0,
            "errors": []
        }
        
        for policy in self.audit_repo.retention_policies.values():
            try:
                result = self.audit_repo.apply_retention_policy(policy.id)
                results["policies_applied"] += 1
                results["total_removed"] += result["removed"]
                results["total_archived"] += result["archived"]
            except Exception as e:
                results["errors"].append({
                    "policy_id": policy.id,
                    "error": str(e)
                })
        
        # Log retention execution
        self.log_event(
            event_type=AuditEventType.MAINTENANCE_EVENT,
            actor_id=None,
            action="apply_retention_policies",
            context=results
        )
        
        return results
    
    def get_retention_statistics(self) -> Dict[str, Any]:
        """Get statistics about data retention"""
        stats = {
            "total_entries": len(self.audit_repo.audit_entries),
            "by_age": {},
            "by_event_type": {},
            "estimated_removals": 0
        }
        
        current_time = datetime.now()
        age_buckets = [(7, "week"), (30, "month"), (90, "quarter"), (365, "year")]
        
        for entry in self.audit_repo.audit_entries.values():
            age_days = (current_time - entry.timestamp).days
            
            # Age buckets
            for days, label in age_buckets:
                if age_days <= days:
                    key = f"last_{label}"
                    stats["by_age"][key] = stats["by_age"].get(key, 0) + 1
                    break
            else:
                stats["by_age"]["older_than_year"] = stats["by_age"].get("older_than_year", 0) + 1
            
            # By event type
            event_type = entry.event_type.value
            stats["by_event_type"][event_type] = stats["by_event_type"].get(event_type, 0) + 1
        
        return stats