"""
Permission Service

This module provides business logic for enterprise permissions management.
"""

from typing import List, Optional, Dict, Any, Set
from datetime import datetime
from ..models.permission_models import (
    Permission, PermissionRule, Role, RoleAssignment,
    PermissionGrant, PermissionCheck, PermissionCheckResult,
    PermissionTemplate, PermissionPolicy, PermissionMatrix,
    ResourceType, PermissionAction,
    RoleCreateRequest, RoleUpdateRequest, RoleAssignRequest,
    PermissionGrantRequest, BulkPermissionCheck, BulkPermissionCheckResult,
    PermissionAuditRequest, PermissionAuditResult
)
from ..repositories.permission_repository import PermissionRepository
from ..logger import logger
import uuid


class PermissionService:
    """Service for managing permissions, roles, and access control"""
    
    def __init__(self, permission_repository: PermissionRepository):
        self.permission_repo = permission_repository
        self._permission_cache: Dict[str, Dict[str, bool]] = {}
    
    # Role management
    
    def create_role(self, request: RoleCreateRequest, created_by: str) -> Role:
        """Create a new role"""
        # Validate permissions exist
        for perm_id in request.permission_ids:
            if not self.permission_repo.get_permission(perm_id):
                raise ValueError(f"Permission {perm_id} does not exist")
        
        # Create role
        role = Role(
            id=str(uuid.uuid4()),
            name=request.name,
            description=request.description,
            permission_ids=request.permission_ids,
            permission_rule_ids=request.permission_rule_ids,
            parent_role_id=request.parent_role_id,
            scope_type=request.scope_type,
            scope_id=request.scope_id,
            max_users=request.max_users,
            created_at=datetime.now(),
            created_by=created_by,
            updated_at=datetime.now(),
            updated_by=created_by
        )
        
        return self.permission_repo.create_role(role)
    
    def update_role(self, role_id: str, request: RoleUpdateRequest, updated_by: str) -> Optional[Role]:
        """Update a role"""
        role = self.permission_repo.get_role(role_id)
        if not role:
            return None
        
        updates = request.dict(exclude_unset=True)
        updates["updated_by"] = updated_by
        
        return self.permission_repo.update_role(role_id, updates)
    
    def delete_role(self, role_id: str) -> bool:
        """Delete a role"""
        return self.permission_repo.delete_role(role_id)
    
    def get_role(self, role_id: str) -> Optional[Role]:
        """Get a role by ID"""
        return self.permission_repo.get_role(role_id)
    
    def get_all_roles(self) -> List[Role]:
        """Get all roles"""
        return self.permission_repo.get_all_roles()
    
    def get_roles_for_scope(self, scope_type: str, scope_id: Optional[str] = None) -> List[Role]:
        """Get roles available for a specific scope"""
        # Get global roles
        roles = self.permission_repo.get_roles_by_scope("global")
        
        # Add scope-specific roles
        if scope_type != "global":
            roles.extend(self.permission_repo.get_roles_by_scope(scope_type, scope_id))
        
        return roles
    
    # Role assignment
    
    def assign_roles(self, request: RoleAssignRequest, assigned_by: str) -> List[RoleAssignment]:
        """Assign a role to multiple users"""
        assignments = []
        
        for user_id in request.user_ids:
            assignment = RoleAssignment(
                id="",  # Will be set by repository
                user_id=user_id,
                role_id=request.role_id,
                scope_type=request.scope_type,
                scope_id=request.scope_id,
                assigned_by=assigned_by,
                assigned_at=datetime.now(),
                expires_at=request.expires_at,
                conditions=request.conditions,
                notes=request.notes
            )
            
            try:
                created_assignment = self.permission_repo.assign_role(assignment)
                assignments.append(created_assignment)
                
                # Clear permission cache for user
                self._clear_user_cache(user_id)
            except ValueError as e:
                logger.warning(f"Failed to assign role to user {user_id}: {e}")
        
        return assignments
    
    def revoke_role_assignment(self, assignment_id: str) -> bool:
        """Revoke a role assignment"""
        # Get assignment to find user
        assignments = [a for a in self.permission_repo.role_assignments.values() if a.id == assignment_id]
        if assignments:
            self._clear_user_cache(assignments[0].user_id)
        
        return self.permission_repo.revoke_role(assignment_id)
    
    def get_user_roles(self, user_id: str, scope_type: Optional[str] = None, scope_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all roles assigned to a user"""
        assignments = self.permission_repo.get_user_role_assignments(user_id, active_only=True)
        
        user_roles = []
        for assignment in assignments:
            # Filter by scope if specified
            if scope_type and assignment.scope_type != scope_type:
                continue
            if scope_id and assignment.scope_id != scope_id:
                continue
            
            role = self.permission_repo.get_role(assignment.role_id)
            if role:
                user_roles.append({
                    "assignment_id": assignment.id,
                    "role": role,
                    "scope_type": assignment.scope_type,
                    "scope_id": assignment.scope_id,
                    "assigned_at": assignment.assigned_at,
                    "expires_at": assignment.expires_at
                })
        
        return user_roles
    
    # Permission management
    
    def grant_permission(self, request: PermissionGrantRequest, granted_by: str) -> PermissionGrant:
        """Grant a permission directly to a user"""
        grant = PermissionGrant(
            id="",  # Will be set by repository
            user_id=request.user_id,
            permission_id=request.permission_id,
            resource_type=request.resource_type,
            resource_id=request.resource_id,
            granted_by=granted_by,
            granted_at=datetime.now(),
            expires_at=request.expires_at,
            reason=request.reason
        )
        
        created_grant = self.permission_repo.grant_permission(grant)
        
        # Clear permission cache for user
        self._clear_user_cache(request.user_id)
        
        return created_grant
    
    def revoke_permission_grant(self, grant_id: str) -> bool:
        """Revoke a permission grant"""
        # Get grant to find user
        grants = [g for g in self.permission_repo.permission_grants.values() if g.id == grant_id]
        if grants:
            self._clear_user_cache(grants[0].user_id)
        
        return self.permission_repo.revoke_permission_grant(grant_id)
    
    def get_user_permissions(self, user_id: str) -> List[Permission]:
        """Get all permissions for a user"""
        return list(self.permission_repo.get_user_permissions(user_id))
    
    # Permission checking
    
    def check_permission(self, check: PermissionCheck) -> PermissionCheckResult:
        """Check if a user has a specific permission"""
        # Check cache first
        cache_key = f"{check.user_id}:{check.resource_type}:{check.resource_id}:{check.action}"
        if cache_key in self._permission_cache:
            cached = self._permission_cache[cache_key]
            return PermissionCheckResult(
                allowed=cached["allowed"],
                user_id=check.user_id,
                resource_type=check.resource_type,
                resource_id=check.resource_id,
                action=check.action,
                grant_type=cached.get("grant_type"),
                grant_source=cached.get("grant_source"),
                checked_at=datetime.now()
            )
        
        # Perform check
        result = self.permission_repo.check_permission(check)
        
        # Apply permission rules
        if not result.allowed:
            result = self._check_permission_rules(check)
        
        # Apply permission policies
        if result.allowed:
            result = self._apply_permission_policies(check, result)
        
        # Cache result
        self._permission_cache[cache_key] = {
            "allowed": result.allowed,
            "grant_type": result.grant_type,
            "grant_source": result.grant_source
        }
        
        return result
    
    def check_permissions_bulk(self, bulk_check: BulkPermissionCheck) -> BulkPermissionCheckResult:
        """Check multiple permissions at once"""
        results = []
        
        for check in bulk_check.checks:
            check.user_id = bulk_check.user_id  # Ensure user_id is set
            results.append(self.check_permission(check))
        
        return BulkPermissionCheckResult(
            user_id=bulk_check.user_id,
            results=results,
            checked_at=datetime.now()
        )
    
    def get_permission_matrix(self, user_id: str) -> PermissionMatrix:
        """Get complete permission matrix for a user"""
        # Get user's roles and permissions
        user_permissions = self.permission_repo.get_user_permissions(user_id)
        user_assignments = self.permission_repo.get_user_role_assignments(user_id)
        user_grants = self.permission_repo.get_user_permission_grants(user_id)
        
        # Build permission matrix
        matrix: Dict[str, Dict[str, bool]] = {}
        
        for resource_type in ResourceType:
            matrix[resource_type] = {}
            for action in PermissionAction:
                check = PermissionCheck(
                    user_id=user_id,
                    resource_type=resource_type,
                    action=action,
                    context={}
                )
                result = self.check_permission(check)
                matrix[resource_type][action] = result.allowed
        
        # Get roles
        roles = []
        for assignment in user_assignments:
            role = self.permission_repo.get_role(assignment.role_id)
            if role:
                roles.append(role)
        
        # Get applicable rules
        rules = []
        for role in roles:
            for rule_id in role.permission_rule_ids:
                rule = self.permission_repo.get_permission_rule(rule_id)
                if rule:
                    rules.append(rule)
        
        return PermissionMatrix(
            subject_type="user",
            subject_id=user_id,
            permissions=matrix,
            roles=roles,
            direct_grants=user_grants,
            applicable_rules=rules,
            generated_at=datetime.now()
        )
    
    def _check_permission_rules(self, check: PermissionCheck) -> PermissionCheckResult:
        """Check permission rules for dynamic permissions"""
        result = PermissionCheckResult(
            allowed=False,
            user_id=check.user_id,
            resource_type=check.resource_type,
            resource_id=check.resource_id,
            action=check.action,
            checked_at=datetime.now()
        )
        
        # Get user's roles
        assignments = self.permission_repo.get_user_role_assignments(check.user_id)
        
        for assignment in assignments:
            role = self.permission_repo.get_role(assignment.role_id)
            if not role:
                continue
            
            # Check permission rules
            for rule_id in role.permission_rule_ids:
                rule = self.permission_repo.get_permission_rule(rule_id)
                if not rule or not rule.is_active:
                    continue
                
                if rule.resource_type != check.resource_type:
                    continue
                
                # Get the permission this rule grants
                permission = self.permission_repo.get_permission(rule.permission_id)
                if not permission or permission.action != check.action:
                    continue
                
                # Evaluate rule conditions
                if self._evaluate_rule_conditions(rule, check):
                    result.allowed = True
                    result.grant_type = "rule"
                    result.grant_source = rule.id
                    result.applied_conditions.append(rule.conditions)
                    return result
        
        return result
    
    def _evaluate_rule_conditions(self, rule: PermissionRule, check: PermissionCheck) -> bool:
        """Evaluate if rule conditions are met"""
        # This is a simplified implementation
        # In a real system, this would evaluate complex conditions
        
        # Check scope
        if rule.scope_type and rule.scope_id:
            context_scope = check.context.get("scope_type")
            context_scope_id = check.context.get("scope_id")
            
            if context_scope != rule.scope_type or context_scope_id != rule.scope_id:
                return False
        
        # Check other conditions (simplified)
        for key, value in rule.conditions.items():
            if key == "owner_id" and value == "$user_id":
                # Check if user owns the resource
                resource_owner = check.context.get("owner_id")
                if resource_owner != check.user_id:
                    return False
            elif key == "team_id" and isinstance(value, dict) and value.get("$in") == "$user_teams":
                # Check if resource belongs to user's team
                resource_team = check.context.get("team_id")
                user_teams = check.context.get("user_teams", [])
                if resource_team not in user_teams:
                    return False
        
        return True
    
    def _apply_permission_policies(self, check: PermissionCheck, result: PermissionCheckResult) -> PermissionCheckResult:
        """Apply permission policies to modify permission check results"""
        policies = self.permission_repo.get_active_permission_policies()
        
        for policy in policies:
            for rule in policy.rules:
                # Check if rule applies
                if "resource_type" in rule and rule["resource_type"] != check.resource_type:
                    continue
                if "action" in rule and rule["action"] != check.action:
                    continue
                
                # Apply rule effects
                if "require_confirmation" in rule and rule["require_confirmation"]:
                    # In a real system, this would trigger a confirmation flow
                    pass
                
                if "require_reason" in rule and rule["require_reason"]:
                    if not check.context.get("reason"):
                        result.allowed = False
                        result.denial_reason = "This action requires a reason"
                        return result
                
                if "enforcement_level" in policy.__dict__ and policy.enforcement_level == "audit_only":
                    # Log but don't block
                    logger.warning(f"Policy {policy.id} would block action but is in audit_only mode")
        
        return result
    
    def _clear_user_cache(self, user_id: str):
        """Clear permission cache for a user"""
        keys_to_remove = []
        for key in self._permission_cache:
            if key.startswith(f"{user_id}:"):
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self._permission_cache[key]
    
    # Permission templates
    
    def create_permission_template(self, template: PermissionTemplate) -> PermissionTemplate:
        """Create a permission template"""
        return self.permission_repo.create_permission_template(template)
    
    def get_permission_template(self, template_id: str) -> Optional[PermissionTemplate]:
        """Get a permission template"""
        return self.permission_repo.get_permission_template(template_id)
    
    def get_permission_templates(self, category: Optional[str] = None) -> List[PermissionTemplate]:
        """Get permission templates"""
        if category:
            return self.permission_repo.get_permission_templates_by_category(category)
        return list(self.permission_repo.permission_templates.values())
    
    def apply_permission_template(self, template_id: str, scope_type: str, scope_id: str, applied_by: str) -> Dict[str, Any]:
        """Apply a permission template"""
        return self.permission_repo.apply_permission_template(template_id, scope_type, scope_id, applied_by)
    
    # Permission policies
    
    def create_permission_policy(self, policy: PermissionPolicy) -> PermissionPolicy:
        """Create a permission policy"""
        return self.permission_repo.create_permission_policy(policy)
    
    def update_permission_policy(self, policy_id: str, updates: Dict[str, Any]) -> Optional[PermissionPolicy]:
        """Update a permission policy"""
        return self.permission_repo.update_permission_policy(policy_id, updates)
    
    def get_permission_policy(self, policy_id: str) -> Optional[PermissionPolicy]:
        """Get a permission policy"""
        return self.permission_repo.get_permission_policy(policy_id)
    
    def get_active_permission_policies(self) -> List[PermissionPolicy]:
        """Get all active permission policies"""
        return self.permission_repo.get_active_permission_policies()
    
    # Permission auditing
    
    def audit_permissions(self, request: PermissionAuditRequest) -> PermissionAuditResult:
        """Audit permissions based on criteria"""
        audit_id = str(uuid.uuid4())
        findings = []
        summary = {
            "total_users": 0,
            "total_roles": 0,
            "total_permissions": 0,
            "total_grants": 0,
            "issues_found": 0
        }
        
        # Determine users to audit
        user_ids = request.user_ids
        if not user_ids:
            # Audit all users with any permissions
            user_ids = set()
            for assignment in self.permission_repo.role_assignments.values():
                if assignment.is_active:
                    user_ids.add(assignment.user_id)
            for grant in self.permission_repo.permission_grants.values():
                if grant.is_active:
                    user_ids.add(grant.user_id)
        
        summary["total_users"] = len(user_ids)
        summary["total_roles"] = len(self.permission_repo.roles)
        summary["total_permissions"] = len(self.permission_repo.permissions)
        
        # Audit each user
        for user_id in user_ids:
            user_findings = self._audit_user_permissions(user_id, request)
            findings.extend(user_findings)
            summary["issues_found"] += len(user_findings)
        
        # Generate recommendations
        recommendations = []
        
        # Check for users with too many direct grants
        direct_grant_counts = {}
        for grant in self.permission_repo.permission_grants.values():
            if grant.is_active:
                direct_grant_counts[grant.user_id] = direct_grant_counts.get(grant.user_id, 0) + 1
        
        for user_id, count in direct_grant_counts.items():
            if count > 5:
                recommendations.append(
                    f"User {user_id} has {count} direct permission grants. Consider using roles instead."
                )
        
        # Check for unused roles
        for role in self.permission_repo.roles.values():
            assignments = self.permission_repo.get_role_assignments(role.id, active_only=True)
            if not assignments:
                recommendations.append(f"Role '{role.name}' has no active assignments.")
        
        # Check for excessive permissions
        admin_permission_count = 0
        for role in self.permission_repo.roles.values():
            if len(role.permission_ids) > 20:
                recommendations.append(
                    f"Role '{role.name}' has {len(role.permission_ids)} permissions. Consider splitting into multiple roles."
                )
            
            # Count admin-level permissions
            for perm_id in role.permission_ids:
                perm = self.permission_repo.get_permission(perm_id)
                if perm and perm.action in [PermissionAction.DELETE, PermissionAction.MANAGE_PERMISSIONS]:
                    admin_permission_count += 1
        
        if admin_permission_count > 10:
            recommendations.append(
                "High number of admin-level permissions granted. Review and restrict access."
            )
        
        return PermissionAuditResult(
            audit_id=audit_id,
            summary=summary,
            findings=findings,
            recommendations=recommendations,
            generated_at=datetime.now(),
            generated_by="system"
        )
    
    def _audit_user_permissions(self, user_id: str, request: PermissionAuditRequest) -> List[Dict[str, Any]]:
        """Audit permissions for a specific user"""
        findings = []
        
        # Get user's permissions
        permissions = self.permission_repo.get_user_permissions(user_id)
        assignments = self.permission_repo.get_user_role_assignments(user_id, active_only=True)
        grants = self.permission_repo.get_user_permission_grants(user_id, active_only=True)
        
        # Check for conflicting roles
        role_scopes = {}
        for assignment in assignments:
            key = f"{assignment.role_id}:{assignment.scope_type}:{assignment.scope_id}"
            if key in role_scopes:
                findings.append({
                    "type": "duplicate_role_assignment",
                    "severity": "medium",
                    "user_id": user_id,
                    "description": f"User has duplicate assignment of role {assignment.role_id}",
                    "details": {"assignment_ids": [role_scopes[key], assignment.id]}
                })
            role_scopes[key] = assignment.id
        
        # Check for expired assignments
        current_time = datetime.now()
        for assignment in assignments:
            if assignment.expires_at and assignment.expires_at < current_time:
                findings.append({
                    "type": "expired_assignment",
                    "severity": "high",
                    "user_id": user_id,
                    "description": f"User has expired role assignment",
                    "details": {
                        "assignment_id": assignment.id,
                        "role_id": assignment.role_id,
                        "expired_at": assignment.expires_at.isoformat()
                    }
                })
        
        # Check for excessive permissions
        sensitive_permissions = [
            PermissionAction.DELETE,
            PermissionAction.MANAGE_PERMISSIONS,
            PermissionAction.EXPORT_AUDIT_LOGS
        ]
        
        sensitive_count = sum(1 for p in permissions if p.action in sensitive_permissions)
        if sensitive_count > 3:
            findings.append({
                "type": "excessive_permissions",
                "severity": "high",
                "user_id": user_id,
                "description": f"User has {sensitive_count} sensitive permissions",
                "details": {
                    "permissions": [p.id for p in permissions if p.action in sensitive_permissions]
                }
            })
        
        # Check for direct grants that should be roles
        if len(grants) > 3:
            findings.append({
                "type": "excessive_direct_grants",
                "severity": "medium",
                "user_id": user_id,
                "description": f"User has {len(grants)} direct permission grants",
                "details": {
                    "grant_ids": [g.id for g in grants]
                }
            })
        
        return findings
    
    # Utility methods
    
    def get_resource_permissions(self, resource_type: ResourceType, resource_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Get all permissions for a resource"""
        result = {
            "resource_type": resource_type,
            "resource_id": resource_id,
            "permissions": {}
        }
        
        if user_id:
            # Get specific user's permissions for resource
            for action in PermissionAction:
                check = PermissionCheck(
                    user_id=user_id,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    action=action,
                    context={}
                )
                check_result = self.check_permission(check)
                result["permissions"][action] = check_result.allowed
        else:
            # Get all users with any permission on resource
            users_with_access = set()
            
            # Check role assignments
            for assignment in self.permission_repo.role_assignments.values():
                if assignment.is_active and assignment.scope_id == resource_id:
                    users_with_access.add(assignment.user_id)
            
            # Check direct grants
            for grant in self.permission_repo.permission_grants.values():
                if grant.is_active and grant.resource_id == resource_id:
                    users_with_access.add(grant.user_id)
            
            result["users_with_access"] = list(users_with_access)
            result["total_users"] = len(users_with_access)
        
        return result
    
    def duplicate_permissions(self, from_resource_type: ResourceType, from_resource_id: str,
                            to_resource_type: ResourceType, to_resource_id: str,
                            duplicated_by: str) -> Dict[str, int]:
        """Duplicate permissions from one resource to another"""
        duplicated_grants = 0
        
        # Find all grants for the source resource
        for grant in self.permission_repo.permission_grants.values():
            if (grant.resource_type == from_resource_type and 
                grant.resource_id == from_resource_id and
                grant.is_active):
                
                # Create new grant for target resource
                new_grant = PermissionGrant(
                    id="",
                    user_id=grant.user_id,
                    permission_id=grant.permission_id,
                    resource_type=to_resource_type,
                    resource_id=to_resource_id,
                    granted_by=duplicated_by,
                    granted_at=datetime.now(),
                    expires_at=grant.expires_at,
                    reason=f"Duplicated from {from_resource_type}:{from_resource_id}"
                )
                
                try:
                    self.permission_repo.grant_permission(new_grant)
                    duplicated_grants += 1
                except Exception as e:
                    logger.warning(f"Failed to duplicate grant: {e}")
        
        return {"duplicated_grants": duplicated_grants}