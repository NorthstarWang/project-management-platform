"""
Audit API Routes

This module provides API endpoints for enterprise audit logging and compliance.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from ..models.audit_models import (
    AuditEntry, AuditSession, AuditReport, AuditReportResult,
    ComplianceRequirement, AuditPolicy, AuditAlert,
    AuditEventType, AuditSeverity, AuditRetentionPolicy,
    AuditIntegration, AuditSearchRequest, AuditSearchResult,
    AuditStatistics, AuditExportRequest
)
from ..models.permission_models import PermissionCheck, ResourceType, PermissionAction
from ..services.audit_service import AuditService
from ..services.permission_service import PermissionService
from ..logger import logger
from .dependencies import get_current_user
from ..data_manager import data_manager

router = APIRouter(prefix="/api/audit", tags=["audit"])

def get_audit_service() -> AuditService:
    """Get audit service instance"""
    return data_manager.audit_service

def get_permission_service() -> PermissionService:
    """Get permission service instance"""
    return data_manager.permission_service

# Audit log endpoints

@router.post("/logs/search", response_model=AuditSearchResult)
async def search_audit_logs(
    request: AuditSearchRequest,
    current_user: dict = Depends(get_current_user),
    audit_service: AuditService = Depends(get_audit_service),
    permission_service: PermissionService = Depends(get_permission_service)
):
    """Search audit logs"""
    try:
        # Check permission
        check = PermissionCheck(
            user_id=current_user["id"],
            resource_type=ResourceType.AUDIT,
            action=PermissionAction.VIEW_AUDIT_LOGS,
            context={}
        )
        result = permission_service.check_permission(check)
        
        if not result.allowed and current_user["role"] != "admin":
            # Allow users to search their own logs
            if not request.actor_ids or current_user["id"] not in request.actor_ids:
                raise HTTPException(status_code=403, detail="Insufficient permissions to view audit logs")
            request.actor_ids = [current_user["id"]]  # Limit to own logs
        
        # Search logs
        search_result = audit_service.search_audit_logs(request)
        
        # Log access
        logger.log_action(
            current_user.get("session_id"),
            "AUDIT_LOGS_SEARCHED",
            {
                "text": f"User searched audit logs, found {search_result.total} entries",
                "filters": request.dict(exclude_unset=True),
                "result_count": search_result.total
            }
        )
        
        return search_result
        
    except Exception as e:
        logger.error(f"Failed to search audit logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/logs/{entry_id}", response_model=AuditEntry)
async def get_audit_entry(
    entry_id: str,
    current_user: dict = Depends(get_current_user),
    audit_service: AuditService = Depends(get_audit_service),
    permission_service: PermissionService = Depends(get_permission_service)
):
    """Get a specific audit log entry"""
    try:
        # Get entry
        entry = audit_service.audit_repo.get_audit_entry(entry_id)
        if not entry:
            raise HTTPException(status_code=404, detail="Audit entry not found")
        
        # Check permission
        check = PermissionCheck(
            user_id=current_user["id"],
            resource_type=ResourceType.AUDIT,
            action=PermissionAction.VIEW_AUDIT_LOGS,
            context={}
        )
        result = permission_service.check_permission(check)
        
        if not result.allowed and current_user["role"] != "admin":
            # Allow users to view their own logs
            if entry.actor_id != current_user["id"]:
                raise HTTPException(status_code=403, detail="Insufficient permissions to view this audit entry")
        
        return entry
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get audit entry: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/logs/export")
async def export_audit_logs(
    request: AuditExportRequest,
    current_user: dict = Depends(get_current_user),
    audit_service: AuditService = Depends(get_audit_service),
    permission_service: PermissionService = Depends(get_permission_service)
):
    """Export audit logs"""
    try:
        # Check permission
        check = PermissionCheck(
            user_id=current_user["id"],
            resource_type=ResourceType.AUDIT,
            action=PermissionAction.EXPORT_AUDIT_LOGS,
            context={}
        )
        result = permission_service.check_permission(check)
        
        if not result.allowed and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Insufficient permissions to export audit logs")
        
        # Export logs
        export_result = audit_service.export_audit_logs(request)
        
        # Log export
        logger.log_action(
            current_user.get("session_id"),
            "AUDIT_LOGS_EXPORTED",
            {
                "text": f"User exported {export_result['entry_count']} audit log entries",
                "format": request.format,
                "entry_count": export_result["entry_count"]
            }
        )
        
        # Return file response
        return Response(
            content=export_result["content"],
            media_type=export_result["content_type"],
            headers={
                "Content-Disposition": f"attachment; filename={export_result['filename']}"
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to export audit logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/statistics", response_model=AuditStatistics)
async def get_audit_statistics(
    start_date: datetime = Query(..., description="Start date for statistics"),
    end_date: datetime = Query(..., description="End date for statistics"),
    current_user: dict = Depends(get_current_user),
    audit_service: AuditService = Depends(get_audit_service),
    permission_service: PermissionService = Depends(get_permission_service)
):
    """Get audit statistics for a period"""
    try:
        # Check permission
        check = PermissionCheck(
            user_id=current_user["id"],
            resource_type=ResourceType.AUDIT,
            action=PermissionAction.VIEW_AUDIT_LOGS,
            context={}
        )
        result = permission_service.check_permission(check)
        
        if not result.allowed and current_user["role"] not in ["admin", "manager"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions to view audit statistics")
        
        # Get statistics
        stats = audit_service.get_audit_statistics(start_date, end_date)
        
        return stats
        
    except Exception as e:
        logger.error(f"Failed to get audit statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Session endpoints

@router.get("/sessions", response_model=List[AuditSession])
async def get_user_sessions(
    user_id: Optional[str] = None,
    active_only: bool = Query(True, description="Only return active sessions"),
    current_user: dict = Depends(get_current_user),
    audit_service: AuditService = Depends(get_audit_service),
    permission_service: PermissionService = Depends(get_permission_service)
):
    """Get audit sessions"""
    try:
        # Default to current user
        if not user_id:
            user_id = current_user["id"]
        
        # Check permission for viewing other users
        if user_id != current_user["id"]:
            check = PermissionCheck(
                user_id=current_user["id"],
                resource_type=ResourceType.AUDIT,
                action=PermissionAction.VIEW_AUDIT_LOGS,
                context={}
            )
            result = permission_service.check_permission(check)
            
            if not result.allowed and current_user["role"] != "admin":
                raise HTTPException(status_code=403, detail="Insufficient permissions to view other users' sessions")
        
        # Get sessions
        sessions = audit_service.get_user_sessions(user_id, active_only)
        
        return sessions
        
    except Exception as e:
        logger.error(f"Failed to get user sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions/{session_id}/end")
async def end_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    audit_service: AuditService = Depends(get_audit_service),
    permission_service: PermissionService = Depends(get_permission_service)
):
    """End an audit session"""
    try:
        # Get session
        session = audit_service.audit_repo.get_audit_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Check permission
        if session.user_id != current_user["id"] and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Can only end your own sessions")
        
        # End session
        success = audit_service.end_session(session_id)
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {"message": "Session ended successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to end session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Alert endpoints

@router.get("/alerts", response_model=List[AuditAlert])
async def get_alerts(
    status: Optional[str] = Query(None, description="Filter by alert status"),
    assigned_to: Optional[str] = Query(None, description="Filter by assigned user"),
    current_user: dict = Depends(get_current_user),
    audit_service: AuditService = Depends(get_audit_service),
    permission_service: PermissionService = Depends(get_permission_service)
):
    """Get audit alerts"""
    try:
        # Check permission
        check = PermissionCheck(
            user_id=current_user["id"],
            resource_type=ResourceType.AUDIT,
            action=PermissionAction.VIEW_AUDIT_LOGS,
            context={}
        )
        result = permission_service.check_permission(check)
        
        if not result.allowed and current_user["role"] not in ["admin", "manager"]:
            # Users can only see their own alerts
            assigned_to = current_user["id"]
        
        # Get alerts
        if assigned_to:
            alerts = audit_service.get_user_alerts(assigned_to)
        else:
            alerts = audit_service.get_open_alerts()
        
        # Filter by status if specified
        if status:
            alerts = [a for a in alerts if a.status == status]
        
        return alerts
        
    except Exception as e:
        logger.error(f"Failed to get alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    current_user: dict = Depends(get_current_user),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Acknowledge an alert"""
    try:
        # Get alert
        alert = audit_service.audit_repo.get_audit_alert(alert_id)
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        # Check if user can acknowledge
        if alert.assigned_to and alert.assigned_to != current_user["id"] and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Can only acknowledge alerts assigned to you")
        
        # Acknowledge alert
        success = audit_service.acknowledge_alert(alert_id, current_user["id"])
        if not success:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        logger.log_action(
            current_user.get("session_id"),
            "ALERT_ACKNOWLEDGED",
            {
                "text": f"User acknowledged alert {alert_id}",
                "alert_id": alert_id,
                "alert_type": alert.alert_type
            }
        )
        
        return {"message": "Alert acknowledged successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to acknowledge alert: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    resolution_notes: str,
    current_user: dict = Depends(get_current_user),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Resolve an alert"""
    try:
        # Get alert
        alert = audit_service.audit_repo.get_audit_alert(alert_id)
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        # Check if user can resolve
        if alert.assigned_to and alert.assigned_to != current_user["id"] and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Can only resolve alerts assigned to you")
        
        # Resolve alert
        success = audit_service.resolve_alert(alert_id, current_user["id"], resolution_notes)
        if not success:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        logger.log_action(
            current_user.get("session_id"),
            "ALERT_RESOLVED",
            {
                "text": f"User resolved alert {alert_id}",
                "alert_id": alert_id,
                "resolution": resolution_notes
            }
        )
        
        return {"message": "Alert resolved successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to resolve alert: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Report endpoints

@router.post("/reports", response_model=AuditReport, status_code=201)
async def create_audit_report(
    report: AuditReport,
    current_user: dict = Depends(get_current_user),
    audit_service: AuditService = Depends(get_audit_service),
    permission_service: PermissionService = Depends(get_permission_service)
):
    """Create an audit report"""
    try:
        # Check permission
        check = PermissionCheck(
            user_id=current_user["id"],
            resource_type=ResourceType.REPORT,
            action=PermissionAction.CREATE,
            context={}
        )
        result = permission_service.check_permission(check)
        
        if not result.allowed and current_user["role"] not in ["admin", "manager"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions to create reports")
        
        # Set creator
        report.created_by = current_user["id"]
        report.created_at = datetime.now()
        
        # Create report
        created_report = audit_service.create_audit_report(report)
        
        logger.log_action(
            current_user.get("session_id"),
            "AUDIT_REPORT_CREATED",
            {
                "text": f"User created audit report '{report.name}'",
                "report_id": created_report.id,
                "report_name": report.name
            }
        )
        
        return created_report
        
    except Exception as e:
        logger.error(f"Failed to create audit report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports", response_model=List[AuditReport])
async def get_audit_reports(
    current_user: dict = Depends(get_current_user),
    audit_service: AuditService = Depends(get_audit_service),
    permission_service: PermissionService = Depends(get_permission_service)
):
    """Get audit reports"""
    try:
        # Check permission
        check = PermissionCheck(
            user_id=current_user["id"],
            resource_type=ResourceType.REPORT,
            action=PermissionAction.READ,
            context={}
        )
        result = permission_service.check_permission(check)
        
        if not result.allowed and current_user["role"] not in ["admin", "manager"]:
            # Users can only see their own reports
            reports = [r for r in audit_service.audit_repo.audit_reports.values() 
                      if r.created_by == current_user["id"]]
        else:
            reports = list(audit_service.audit_repo.audit_reports.values())
        
        return reports
        
    except Exception as e:
        logger.error(f"Failed to get audit reports: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reports/{report_id}/run", response_model=AuditReportResult)
async def run_audit_report(
    report_id: str,
    current_user: dict = Depends(get_current_user),
    audit_service: AuditService = Depends(get_audit_service),
    permission_service: PermissionService = Depends(get_permission_service)
):
    """Run an audit report"""
    try:
        # Get report
        report = audit_service.audit_repo.get_audit_report(report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        # Check permission
        check = PermissionCheck(
            user_id=current_user["id"],
            resource_type=ResourceType.REPORT,
            action=PermissionAction.READ,
            context={}
        )
        result = permission_service.check_permission(check)
        
        if not result.allowed and report.created_by != current_user["id"]:
            raise HTTPException(status_code=403, detail="Can only run your own reports")
        
        # Run report
        report_result = audit_service.run_audit_report(report_id)
        
        logger.log_action(
            current_user.get("session_id"),
            "AUDIT_REPORT_RUN",
            {
                "text": f"User ran audit report '{report.name}'",
                "report_id": report_id,
                "row_count": report_result.row_count,
                "execution_time_ms": report_result.execution_time_ms
            }
        )
        
        return report_result
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to run audit report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Compliance endpoints

@router.get("/compliance/requirements", response_model=List[ComplianceRequirement])
async def get_compliance_requirements(
    standard: Optional[str] = Query(None, description="Filter by compliance standard"),
    current_user: dict = Depends(get_current_user),
    audit_service: AuditService = Depends(get_audit_service),
    permission_service: PermissionService = Depends(get_permission_service)
):
    """Get compliance requirements"""
    try:
        # Check permission
        check = PermissionCheck(
            user_id=current_user["id"],
            resource_type=ResourceType.AUDIT,
            action=PermissionAction.VIEW_AUDIT_LOGS,
            context={}
        )
        result = permission_service.check_permission(check)
        
        if not result.allowed and current_user["role"] not in ["admin", "manager"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions to view compliance requirements")
        
        # Get requirements
        if standard:
            requirements = audit_service.audit_repo.get_compliance_requirements_by_standard(standard)
        else:
            requirements = list(audit_service.audit_repo.compliance_requirements.values())
        
        return requirements
        
    except Exception as e:
        logger.error(f"Failed to get compliance requirements: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/compliance/requirements/{requirement_id}/assess")
async def assess_compliance(
    requirement_id: str,
    current_user: dict = Depends(get_current_user),
    audit_service: AuditService = Depends(get_audit_service),
    permission_service: PermissionService = Depends(get_permission_service)
):
    """Assess compliance for a requirement"""
    try:
        # Check permission
        check = PermissionCheck(
            user_id=current_user["id"],
            resource_type=ResourceType.AUDIT,
            action=PermissionAction.MANAGE_SETTINGS,
            context={}
        )
        result = permission_service.check_permission(check)
        
        if not result.allowed and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Insufficient permissions to assess compliance")
        
        # Assess compliance
        assessment = audit_service.assess_compliance(requirement_id)
        
        logger.log_action(
            current_user.get("session_id"),
            "COMPLIANCE_ASSESSED",
            {
                "text": f"User assessed compliance for requirement {requirement_id}",
                "requirement_id": requirement_id,
                "status": assessment["status"],
                "score": assessment["score"]
            }
        )
        
        return assessment
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to assess compliance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/compliance/dashboard")
async def get_compliance_dashboard(
    current_user: dict = Depends(get_current_user),
    audit_service: AuditService = Depends(get_audit_service),
    permission_service: PermissionService = Depends(get_permission_service)
):
    """Get compliance dashboard data"""
    try:
        # Check permission
        check = PermissionCheck(
            user_id=current_user["id"],
            resource_type=ResourceType.AUDIT,
            action=PermissionAction.VIEW_AUDIT_LOGS,
            context={}
        )
        result = permission_service.check_permission(check)
        
        if not result.allowed and current_user["role"] not in ["admin", "manager"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions to view compliance dashboard")
        
        # Get dashboard data
        dashboard = audit_service.get_compliance_dashboard()
        
        return dashboard
        
    except Exception as e:
        logger.error(f"Failed to get compliance dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Policy endpoints

@router.get("/policies", response_model=List[AuditPolicy])
async def get_audit_policies(
    active_only: bool = Query(True, description="Only return active policies"),
    current_user: dict = Depends(get_current_user),
    audit_service: AuditService = Depends(get_audit_service),
    permission_service: PermissionService = Depends(get_permission_service)
):
    """Get audit policies"""
    try:
        # Check permission
        check = PermissionCheck(
            user_id=current_user["id"],
            resource_type=ResourceType.SYSTEM,
            action=PermissionAction.READ,
            context={}
        )
        result = permission_service.check_permission(check)
        
        if not result.allowed and current_user["role"] not in ["admin", "manager"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions to view audit policies")
        
        # Get policies
        if active_only:
            policies = audit_service.get_active_policies()
        else:
            policies = list(audit_service.audit_repo.audit_policies.values())
        
        return policies
        
    except Exception as e:
        logger.error(f"Failed to get audit policies: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/policies", response_model=AuditPolicy, status_code=201)
async def create_audit_policy(
    policy: AuditPolicy,
    current_user: dict = Depends(get_current_user),
    audit_service: AuditService = Depends(get_audit_service),
    permission_service: PermissionService = Depends(get_permission_service)
):
    """Create an audit policy"""
    try:
        # Check permission
        check = PermissionCheck(
            user_id=current_user["id"],
            resource_type=ResourceType.SYSTEM,
            action=PermissionAction.MANAGE_SETTINGS,
            context={}
        )
        result = permission_service.check_permission(check)
        
        if not result.allowed and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Insufficient permissions to create audit policies")
        
        # Set creator
        policy.created_by = current_user["id"]
        policy.updated_by = current_user["id"]
        policy.created_at = datetime.now()
        policy.updated_at = datetime.now()
        
        # Create policy
        created_policy = audit_service.create_audit_policy(policy)
        
        # Log creation
        audit_service.log_event(
            event_type=AuditEventType.SETTINGS_CHANGED,
            actor_id=current_user["id"],
            action="create_audit_policy",
            resource_type="policy",
            resource_id=created_policy.id,
            resource_name=created_policy.name
        )
        
        logger.log_action(
            current_user.get("session_id"),
            "AUDIT_POLICY_CREATED",
            {
                "text": f"User created audit policy '{policy.name}'",
                "policy_id": created_policy.id,
                "policy_name": policy.name
            }
        )
        
        return created_policy
        
    except Exception as e:
        logger.error(f"Failed to create audit policy: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Retention endpoints

@router.get("/retention/statistics")
async def get_retention_statistics(
    current_user: dict = Depends(get_current_user),
    audit_service: AuditService = Depends(get_audit_service),
    permission_service: PermissionService = Depends(get_permission_service)
):
    """Get retention statistics"""
    try:
        # Check permission
        check = PermissionCheck(
            user_id=current_user["id"],
            resource_type=ResourceType.SYSTEM,
            action=PermissionAction.READ,
            context={}
        )
        result = permission_service.check_permission(check)
        
        if not result.allowed and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Insufficient permissions to view retention statistics")
        
        # Get statistics
        stats = audit_service.get_retention_statistics()
        
        return stats
        
    except Exception as e:
        logger.error(f"Failed to get retention statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/retention/apply")
async def apply_retention_policies(
    current_user: dict = Depends(get_current_user),
    audit_service: AuditService = Depends(get_audit_service),
    permission_service: PermissionService = Depends(get_permission_service)
):
    """Apply retention policies"""
    try:
        # Check permission
        check = PermissionCheck(
            user_id=current_user["id"],
            resource_type=ResourceType.SYSTEM,
            action=PermissionAction.MANAGE_SETTINGS,
            context={}
        )
        result = permission_service.check_permission(check)
        
        if not result.allowed and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Insufficient permissions to apply retention policies")
        
        # Apply policies
        results = audit_service.apply_retention_policies()
        
        logger.log_action(
            current_user.get("session_id"),
            "RETENTION_POLICIES_APPLIED",
            {
                "text": f"User applied retention policies",
                "policies_applied": results["policies_applied"],
                "total_removed": results["total_removed"],
                "total_archived": results["total_archived"]
            }
        )
        
        return results
        
    except Exception as e:
        logger.error(f"Failed to apply retention policies: {e}")
        raise HTTPException(status_code=500, detail=str(e))