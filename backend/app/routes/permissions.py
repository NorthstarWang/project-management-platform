"""
Permission API Routes

This module provides API endpoints for enterprise permissions management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from ..models.permission_models import (
    Permission, PermissionRule, Role, RoleAssignment,
    PermissionGrant, PermissionCheck, PermissionCheckResult,
    PermissionTemplate, PermissionPolicy, PermissionMatrix,
    RoleCreateRequest, RoleUpdateRequest, RoleAssignRequest,
    PermissionGrantRequest, BulkPermissionCheck, BulkPermissionCheckResult,
    PermissionAuditRequest, PermissionAuditResult,
    ResourceType, PermissionAction
)
from ..models.audit_models import AuditEventType
from ..services.permission_service import PermissionService
from ..services.audit_service import AuditService
from ..logger import logger
from .dependencies import get_current_user
from ..data_manager import data_manager

router = APIRouter(prefix="/api/permissions", tags=["permissions"])

def get_permission_service() -> PermissionService:
    """Get permission service instance"""
    return data_manager.permission_service

def get_audit_service() -> AuditService:
    """Get audit service instance"""
    return data_manager.audit_service

# Permission endpoints

@router.get("/permissions", response_model=List[Permission])
async def get_all_permissions(
    resource_type: Optional[ResourceType] = None,
    current_user: dict = Depends(get_current_user),
    permission_service: PermissionService = Depends(get_permission_service),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Get all available permissions"""
    try:
        # Check if user can view permissions
        check = PermissionCheck(
            user_id=current_user["id"],
            resource_type=ResourceType.SYSTEM,
            action=PermissionAction.READ,
            context={}
        )
        result = permission_service.check_permission(check)
        
        if not result.allowed and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Insufficient permissions to view permissions")
        
        if resource_type:
            permissions = permission_service.permission_repo.get_permissions_by_resource_type(resource_type)
        else:
            permissions = permission_service.permission_repo.get_all_permissions()
        
        # Log access
        audit_service.log_event(
            event_type=AuditEventType.DATA_ACCESSED,
            actor_id=current_user["id"],
            action="view_permissions",
            resource_type="permission",
            context={"resource_type_filter": resource_type}
        )
        
        logger.log_action(
            current_user.get("session_id"),
            "PERMISSIONS_VIEWED",
            {
                "text": f"User viewed {len(permissions)} permissions",
                "resource_type": resource_type,
                "permission_count": len(permissions)
            }
        )
        
        return permissions
        
    except Exception as e:
        logger.error(f"Failed to get permissions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/permissions/{permission_id}", response_model=Permission)
async def get_permission(
    permission_id: str,
    current_user: dict = Depends(get_current_user),
    permission_service: PermissionService = Depends(get_permission_service)
):
    """Get a specific permission"""
    permission = permission_service.permission_repo.get_permission(permission_id)
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    return permission

# Role endpoints

@router.post("/roles", response_model=Role, status_code=201)
async def create_role(
    request: RoleCreateRequest,
    current_user: dict = Depends(get_current_user),
    permission_service: PermissionService = Depends(get_permission_service),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Create a new role"""
    try:
        # Check permission
        check = PermissionCheck(
            user_id=current_user["id"],
            resource_type=ResourceType.SYSTEM,
            action=PermissionAction.MANAGE_PERMISSIONS,
            context={}
        )
        result = permission_service.check_permission(check)
        
        if not result.allowed and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Insufficient permissions to create roles")
        
        # Create role
        role = permission_service.create_role(request, current_user["id"])
        
        # Log creation
        audit_service.log_data_change(
            user_id=current_user["id"],
            resource_type="role",
            resource_id=role.id,
            resource_name=role.name,
            action="create",
            changes={"role": request.dict()}
        )
        
        logger.log_action(
            current_user.get("session_id"),
            "ROLE_CREATED",
            {
                "text": f"User created role '{role.name}'",
                "role_id": role.id,
                "role_name": role.name,
                "permission_count": len(role.permission_ids)
            }
        )
        
        return role
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create role: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/roles", response_model=List[Role])
async def get_roles(
    scope_type: Optional[str] = Query(None, description="Filter by scope type"),
    scope_id: Optional[str] = Query(None, description="Filter by scope ID"),
    current_user: dict = Depends(get_current_user),
    permission_service: PermissionService = Depends(get_permission_service),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Get all roles"""
    try:
        if scope_type:
            roles = permission_service.get_roles_for_scope(scope_type, scope_id)
        else:
            roles = permission_service.get_all_roles()
        
        # Log access
        audit_service.log_event(
            event_type=AuditEventType.DATA_ACCESSED,
            actor_id=current_user["id"],
            action="view_roles",
            resource_type="role",
            context={"scope_type": scope_type, "scope_id": scope_id}
        )
        
        return roles
        
    except Exception as e:
        logger.error(f"Failed to get roles: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/roles/{role_id}", response_model=Role)
async def get_role(
    role_id: str,
    current_user: dict = Depends(get_current_user),
    permission_service: PermissionService = Depends(get_permission_service)
):
    """Get a specific role"""
    role = permission_service.get_role(role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    return role

@router.put("/roles/{role_id}", response_model=Role)
async def update_role(
    role_id: str,
    request: RoleUpdateRequest,
    current_user: dict = Depends(get_current_user),
    permission_service: PermissionService = Depends(get_permission_service),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Update a role"""
    try:
        # Check permission
        check = PermissionCheck(
            user_id=current_user["id"],
            resource_type=ResourceType.SYSTEM,
            action=PermissionAction.MANAGE_PERMISSIONS,
            context={}
        )
        result = permission_service.check_permission(check)
        
        if not result.allowed and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Insufficient permissions to update roles")
        
        # Get original role for audit
        original_role = permission_service.get_role(role_id)
        if not original_role:
            raise HTTPException(status_code=404, detail="Role not found")
        
        # Update role
        updated_role = permission_service.update_role(role_id, request, current_user["id"])
        if not updated_role:
            raise HTTPException(status_code=404, detail="Role not found")
        
        # Log update
        changes = {}
        for field, value in request.dict(exclude_unset=True).items():
            if hasattr(original_role, field) and getattr(original_role, field) != value:
                changes[field] = {"old": getattr(original_role, field), "new": value}
        
        if changes:
            audit_service.log_data_change(
                user_id=current_user["id"],
                resource_type="role",
                resource_id=role_id,
                resource_name=updated_role.name,
                action="update",
                changes=changes
            )
        
        logger.log_action(
            current_user.get("session_id"),
            "ROLE_UPDATED",
            {
                "text": f"User updated role '{updated_role.name}'",
                "role_id": role_id,
                "changes": changes
            }
        )
        
        return updated_role
        
    except Exception as e:
        logger.error(f"Failed to update role: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/roles/{role_id}")
async def delete_role(
    role_id: str,
    current_user: dict = Depends(get_current_user),
    permission_service: PermissionService = Depends(get_permission_service),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Delete a role"""
    try:
        # Check permission
        check = PermissionCheck(
            user_id=current_user["id"],
            resource_type=ResourceType.SYSTEM,
            action=PermissionAction.MANAGE_PERMISSIONS,
            context={}
        )
        result = permission_service.check_permission(check)
        
        if not result.allowed and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Insufficient permissions to delete roles")
        
        # Get role for logging
        role = permission_service.get_role(role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        
        # Delete role
        success = permission_service.delete_role(role_id)
        if not success:
            raise HTTPException(status_code=404, detail="Role not found")
        
        # Log deletion
        audit_service.log_data_change(
            user_id=current_user["id"],
            resource_type="role",
            resource_id=role_id,
            resource_name=role.name,
            action="delete",
            changes={}
        )
        
        logger.log_action(
            current_user.get("session_id"),
            "ROLE_DELETED",
            {
                "text": f"User deleted role '{role.name}'",
                "role_id": role_id,
                "role_name": role.name
            }
        )
        
        return {"message": "Role deleted successfully"}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to delete role: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Role assignment endpoints

@router.post("/roles/assign", response_model=List[RoleAssignment])
async def assign_roles(
    request: RoleAssignRequest,
    current_user: dict = Depends(get_current_user),
    permission_service: PermissionService = Depends(get_permission_service),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Assign a role to users"""
    try:
        # Check permission
        check = PermissionCheck(
            user_id=current_user["id"],
            resource_type=ResourceType.USER,
            action=PermissionAction.MANAGE_MEMBERS,
            context={"scope_type": request.scope_type, "scope_id": request.scope_id}
        )
        result = permission_service.check_permission(check)
        
        if not result.allowed and current_user["role"] not in ["admin", "manager"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions to assign roles")
        
        # Assign roles
        assignments = permission_service.assign_roles(request, current_user["id"])
        
        # Log assignments
        for assignment in assignments:
            audit_service.log_event(
                event_type=AuditEventType.ROLE_ASSIGNED,
                actor_id=current_user["id"],
                action="assign_role",
                resource_type="user",
                resource_id=assignment.user_id,
                context={
                    "role_id": assignment.role_id,
                    "scope_type": assignment.scope_type,
                    "scope_id": assignment.scope_id
                }
            )
        
        logger.log_action(
            current_user.get("session_id"),
            "ROLES_ASSIGNED",
            {
                "text": f"User assigned role to {len(assignments)} users",
                "role_id": request.role_id,
                "user_count": len(assignments),
                "scope_type": request.scope_type
            }
        )
        
        return assignments
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to assign roles: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/roles/assignments/{assignment_id}")
async def revoke_role_assignment(
    assignment_id: str,
    current_user: dict = Depends(get_current_user),
    permission_service: PermissionService = Depends(get_permission_service),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Revoke a role assignment"""
    try:
        # Get assignment
        assignment = permission_service.permission_repo.role_assignments.get(assignment_id)
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Check permission
        check = PermissionCheck(
            user_id=current_user["id"],
            resource_type=ResourceType.USER,
            action=PermissionAction.MANAGE_MEMBERS,
            context={"scope_type": assignment.scope_type, "scope_id": assignment.scope_id}
        )
        result = permission_service.check_permission(check)
        
        if not result.allowed and current_user["role"] not in ["admin", "manager"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions to revoke roles")
        
        # Revoke assignment
        success = permission_service.revoke_role_assignment(assignment_id)
        if not success:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Log revocation
        audit_service.log_event(
            event_type=AuditEventType.ROLE_REMOVED,
            actor_id=current_user["id"],
            action="revoke_role",
            resource_type="user",
            resource_id=assignment.user_id,
            context={
                "role_id": assignment.role_id,
                "assignment_id": assignment_id
            }
        )
        
        return {"message": "Role assignment revoked successfully"}
        
    except Exception as e:
        logger.error(f"Failed to revoke role assignment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users/{user_id}/roles", response_model=List[Dict[str, Any]])
async def get_user_roles(
    user_id: str,
    scope_type: Optional[str] = None,
    scope_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    permission_service: PermissionService = Depends(get_permission_service),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Get roles assigned to a user"""
    try:
        # Check if user can view other user's roles
        if user_id != current_user["id"]:
            check = PermissionCheck(
                user_id=current_user["id"],
                resource_type=ResourceType.USER,
                action=PermissionAction.READ,
                context={}
            )
            result = permission_service.check_permission(check)
            
            if not result.allowed and current_user["role"] not in ["admin", "manager"]:
                raise HTTPException(status_code=403, detail="Insufficient permissions to view user roles")
        
        # Get user roles
        user_roles = permission_service.get_user_roles(user_id, scope_type, scope_id)
        
        # Log access
        if user_id != current_user["id"]:
            audit_service.log_event(
                event_type=AuditEventType.DATA_ACCESSED,
                actor_id=current_user["id"],
                action="view_user_roles",
                resource_type="user",
                resource_id=user_id
            )
        
        return user_roles
        
    except Exception as e:
        logger.error(f"Failed to get user roles: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Permission grant endpoints

@router.post("/permissions/grant", response_model=PermissionGrant)
async def grant_permission(
    request: PermissionGrantRequest,
    current_user: dict = Depends(get_current_user),
    permission_service: PermissionService = Depends(get_permission_service),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Grant a permission directly to a user"""
    try:
        # Check permission
        check = PermissionCheck(
            user_id=current_user["id"],
            resource_type=ResourceType.SYSTEM,
            action=PermissionAction.MANAGE_PERMISSIONS,
            context={}
        )
        result = permission_service.check_permission(check)
        
        if not result.allowed and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Insufficient permissions to grant permissions")
        
        # Grant permission
        grant = permission_service.grant_permission(request, current_user["id"])
        
        # Log grant
        audit_service.log_event(
            event_type=AuditEventType.PERMISSION_GRANTED,
            actor_id=current_user["id"],
            action="grant_permission",
            resource_type="user",
            resource_id=request.user_id,
            context={
                "permission_id": request.permission_id,
                "resource_type": request.resource_type,
                "resource_id": request.resource_id,
                "reason": request.reason
            }
        )
        
        logger.log_action(
            current_user.get("session_id"),
            "PERMISSION_GRANTED",
            {
                "text": f"User granted permission to user {request.user_id}",
                "user_id": request.user_id,
                "permission_id": request.permission_id,
                "reason": request.reason
            }
        )
        
        return grant
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to grant permission: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/permissions/grants/{grant_id}")
async def revoke_permission_grant(
    grant_id: str,
    current_user: dict = Depends(get_current_user),
    permission_service: PermissionService = Depends(get_permission_service),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Revoke a permission grant"""
    try:
        # Get grant
        grant = permission_service.permission_repo.permission_grants.get(grant_id)
        if not grant:
            raise HTTPException(status_code=404, detail="Grant not found")
        
        # Check permission
        check = PermissionCheck(
            user_id=current_user["id"],
            resource_type=ResourceType.SYSTEM,
            action=PermissionAction.MANAGE_PERMISSIONS,
            context={}
        )
        result = permission_service.check_permission(check)
        
        if not result.allowed and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Insufficient permissions to revoke permissions")
        
        # Revoke grant
        success = permission_service.revoke_permission_grant(grant_id)
        if not success:
            raise HTTPException(status_code=404, detail="Grant not found")
        
        # Log revocation
        audit_service.log_event(
            event_type=AuditEventType.PERMISSION_REVOKED,
            actor_id=current_user["id"],
            action="revoke_permission",
            resource_type="user",
            resource_id=grant.user_id,
            context={
                "permission_id": grant.permission_id,
                "grant_id": grant_id
            }
        )
        
        return {"message": "Permission grant revoked successfully"}
        
    except Exception as e:
        logger.error(f"Failed to revoke permission grant: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Permission checking endpoints

@router.post("/check", response_model=PermissionCheckResult)
async def check_permission(
    check: PermissionCheck,
    current_user: dict = Depends(get_current_user),
    permission_service: PermissionService = Depends(get_permission_service),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Check if a user has a specific permission"""
    try:
        # Use current user if not specified
        if not check.user_id:
            check.user_id = current_user["id"]
        
        # Check if user can check other user's permissions
        if check.user_id != current_user["id"]:
            admin_check = PermissionCheck(
                user_id=current_user["id"],
                resource_type=ResourceType.SYSTEM,
                action=PermissionAction.READ,
                context={}
            )
            admin_result = permission_service.check_permission(admin_check)
            
            if not admin_result.allowed and current_user["role"] not in ["admin", "manager"]:
                raise HTTPException(status_code=403, detail="Insufficient permissions to check other users")
        
        # Perform permission check
        result = permission_service.check_permission(check)
        
        # Log denied checks
        if not result.allowed:
            audit_service.log_resource_access(
                user_id=check.user_id,
                resource_type=check.resource_type,
                resource_id=check.resource_id,
                action=check.action,
                granted=False
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to check permission: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/check-bulk", response_model=BulkPermissionCheckResult)
async def check_permissions_bulk(
    bulk_check: BulkPermissionCheck,
    current_user: dict = Depends(get_current_user),
    permission_service: PermissionService = Depends(get_permission_service)
):
    """Check multiple permissions at once"""
    try:
        # Use current user if not specified
        if not bulk_check.user_id:
            bulk_check.user_id = current_user["id"]
        
        # Check if user can check other user's permissions
        if bulk_check.user_id != current_user["id"] and current_user["role"] not in ["admin", "manager"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions to check other users")
        
        # Perform bulk check
        result = permission_service.check_permissions_bulk(bulk_check)
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to check permissions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users/{user_id}/matrix", response_model=PermissionMatrix)
async def get_permission_matrix(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    permission_service: PermissionService = Depends(get_permission_service),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Get complete permission matrix for a user"""
    try:
        # Check permission
        if user_id != current_user["id"]:
            check = PermissionCheck(
                user_id=current_user["id"],
                resource_type=ResourceType.SYSTEM,
                action=PermissionAction.READ,
                context={}
            )
            result = permission_service.check_permission(check)
            
            if not result.allowed and current_user["role"] != "admin":
                raise HTTPException(status_code=403, detail="Insufficient permissions to view permission matrix")
        
        # Get matrix
        matrix = permission_service.get_permission_matrix(user_id)
        
        # Log access
        audit_service.log_event(
            event_type=AuditEventType.DATA_ACCESSED,
            actor_id=current_user["id"],
            action="view_permission_matrix",
            resource_type="user",
            resource_id=user_id
        )
        
        return matrix
        
    except Exception as e:
        logger.error(f"Failed to get permission matrix: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Permission template endpoints

@router.get("/templates", response_model=List[PermissionTemplate])
async def get_permission_templates(
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    permission_service: PermissionService = Depends(get_permission_service)
):
    """Get permission templates"""
    try:
        templates = permission_service.get_permission_templates(category)
        return templates
    except Exception as e:
        logger.error(f"Failed to get permission templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/templates/{template_id}/apply", response_model=Dict[str, Any])
async def apply_permission_template(
    template_id: str,
    scope_type: str,
    scope_id: str,
    current_user: dict = Depends(get_current_user),
    permission_service: PermissionService = Depends(get_permission_service),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Apply a permission template"""
    try:
        # Check permission
        check = PermissionCheck(
            user_id=current_user["id"],
            resource_type=ResourceType.SYSTEM,
            action=PermissionAction.MANAGE_PERMISSIONS,
            context={"scope_type": scope_type, "scope_id": scope_id}
        )
        result = permission_service.check_permission(check)
        
        if not result.allowed and current_user["role"] not in ["admin", "manager"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions to apply templates")
        
        # Apply template
        result = permission_service.apply_permission_template(
            template_id, scope_type, scope_id, current_user["id"]
        )
        
        # Log application
        audit_service.log_event(
            event_type=AuditEventType.SETTINGS_CHANGED,
            actor_id=current_user["id"],
            action="apply_permission_template",
            context={
                "template_id": template_id,
                "scope_type": scope_type,
                "scope_id": scope_id,
                "result": result
            }
        )
        
        logger.log_action(
            current_user.get("session_id"),
            "PERMISSION_TEMPLATE_APPLIED",
            {
                "text": f"User applied permission template",
                "template_id": template_id,
                "scope_type": scope_type,
                "scope_id": scope_id,
                "created_roles": result["created_roles"],
                "created_rules": result["created_rules"]
            }
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to apply permission template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Permission audit endpoints

@router.post("/audit", response_model=PermissionAuditResult)
async def audit_permissions(
    request: PermissionAuditRequest,
    current_user: dict = Depends(get_current_user),
    permission_service: PermissionService = Depends(get_permission_service),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Audit permissions based on criteria"""
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
            raise HTTPException(status_code=403, detail="Insufficient permissions to audit permissions")
        
        # Perform audit
        audit_result = permission_service.audit_permissions(request)
        
        # Log audit
        audit_service.log_event(
            event_type=AuditEventType.SYSTEM_ERROR if audit_result.summary["issues_found"] > 0 else AuditEventType.MAINTENANCE_EVENT,
            actor_id=current_user["id"],
            action="audit_permissions",
            severity=audit_service.audit_repo.AuditSeverity.WARNING if audit_result.summary["issues_found"] > 0 else audit_service.audit_repo.AuditSeverity.INFO,
            context={
                "audit_id": audit_result.audit_id,
                "issues_found": audit_result.summary["issues_found"],
                "users_audited": audit_result.summary["total_users"]
            }
        )
        
        return audit_result
        
    except Exception as e:
        logger.error(f"Failed to audit permissions: {e}")
        raise HTTPException(status_code=500, detail=str(e))