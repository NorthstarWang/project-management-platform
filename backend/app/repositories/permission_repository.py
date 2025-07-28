"""
Permission Repository

This module provides data access layer for enterprise permissions management.
"""

from typing import List, Optional, Dict, Any, Set
from datetime import datetime
from ..models.permission_models import (
    Permission, PermissionRule, Role, RoleAssignment,
    PermissionGrant, PermissionCheck, PermissionCheckResult,
    PermissionTemplate, PermissionPolicy,
    ResourceType, PermissionAction
)
# from ..logger import logger  # Removed as it doesn't have standard logging methods
import uuid


class PermissionRepository:
    """Repository for managing permissions, roles, and access control"""
    
    def __init__(self):
        self.permissions: Dict[str, Permission] = {}
        self.permission_rules: Dict[str, PermissionRule] = {}
        self.roles: Dict[str, Role] = {}
        self.role_assignments: Dict[str, RoleAssignment] = {}
        self.permission_grants: Dict[str, PermissionGrant] = {}
        self.permission_templates: Dict[str, PermissionTemplate] = {}
        self.permission_policies: Dict[str, PermissionPolicy] = {}
        self.permission_check_cache: Dict[str, PermissionCheckResult] = {}
        
        # Initialize default system permissions
        self._initialize_system_permissions()
        
        # Initialize default system roles
        self._initialize_system_roles()
    
    def _initialize_system_permissions(self):
        """Initialize default system permissions"""
        system_permissions = [
            # Project permissions
            ("project_create", "Create Project", "Create new projects", ResourceType.PROJECT, PermissionAction.CREATE),
            ("project_read", "View Project", "View project details", ResourceType.PROJECT, PermissionAction.READ),
            ("project_update", "Update Project", "Update project information", ResourceType.PROJECT, PermissionAction.UPDATE),
            ("project_delete", "Delete Project", "Delete projects", ResourceType.PROJECT, PermissionAction.DELETE),
            ("project_manage_members", "Manage Project Members", "Add/remove project members", ResourceType.PROJECT, PermissionAction.MANAGE_MEMBERS),
            
            # Board permissions
            ("board_create", "Create Board", "Create new boards", ResourceType.BOARD, PermissionAction.CREATE),
            ("board_read", "View Board", "View board details", ResourceType.BOARD, PermissionAction.READ),
            ("board_update", "Update Board", "Update board information", ResourceType.BOARD, PermissionAction.UPDATE),
            ("board_delete", "Delete Board", "Delete boards", ResourceType.BOARD, PermissionAction.DELETE),
            ("board_manage_workflows", "Manage Workflows", "Create/edit board workflows", ResourceType.BOARD, PermissionAction.MANAGE_WORKFLOWS),
            
            # Task permissions
            ("task_create", "Create Task", "Create new tasks", ResourceType.TASK, PermissionAction.CREATE),
            ("task_read", "View Task", "View task details", ResourceType.TASK, PermissionAction.READ),
            ("task_update", "Update Task", "Update task information", ResourceType.TASK, PermissionAction.UPDATE),
            ("task_delete", "Delete Task", "Delete tasks", ResourceType.TASK, PermissionAction.DELETE),
            ("task_assign", "Assign Task", "Assign tasks to users", ResourceType.TASK, PermissionAction.ASSIGN),
            
            # Time tracking permissions
            ("time_track", "Track Time", "Log time entries", ResourceType.TIME_ENTRY, PermissionAction.CREATE),
            ("time_approve", "Approve Time", "Approve time entries", ResourceType.TIME_ENTRY, PermissionAction.APPROVE_TIME),
            ("time_reports", "View Time Reports", "View time tracking reports", ResourceType.REPORT, PermissionAction.VIEW_REPORTS),
            
            # System permissions
            ("system_admin", "System Administration", "Full system administration", ResourceType.SYSTEM, PermissionAction.MANAGE_SETTINGS),
            ("audit_view", "View Audit Logs", "View audit logs", ResourceType.AUDIT, PermissionAction.VIEW_AUDIT_LOGS),
            ("audit_export", "Export Audit Logs", "Export audit logs", ResourceType.AUDIT, PermissionAction.EXPORT_AUDIT_LOGS),
        ]
        
        for perm_id, name, desc, res_type, action in system_permissions:
            permission = Permission(
                id=perm_id,
                name=name,
                description=desc,
                resource_type=res_type,
                action=action,
                is_system=True,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            self.permissions[perm_id] = permission
    
    def _initialize_system_roles(self):
        """Initialize default system roles"""
        # Admin role - full access
        admin_role = Role(
            id="system_admin",
            name="System Administrator",
            description="Full system access",
            permission_ids=list(self.permissions.keys()),
            permission_rule_ids=[],
            parent_role_id=None,
            is_system=True,
            is_default=False,
            scope_type="global",
            created_at=datetime.now(),
            created_by="system",
            updated_at=datetime.now(),
            updated_by="system"
        )
        self.roles["system_admin"] = admin_role
        
        # Manager role - project/team management
        manager_perms = [
            "project_create", "project_read", "project_update", "project_manage_members",
            "board_create", "board_read", "board_update", "board_manage_workflows",
            "task_create", "task_read", "task_update", "task_assign",
            "time_track", "time_approve", "time_reports"
        ]
        manager_role = Role(
            id="manager",
            name="Manager",
            description="Project and team management permissions",
            permission_ids=manager_perms,
            permission_rule_ids=[],
            parent_role_id=None,
            is_system=True,
            is_default=False,
            scope_type="global",
            created_at=datetime.now(),
            created_by="system",
            updated_at=datetime.now(),
            updated_by="system"
        )
        self.roles["manager"] = manager_role
        
        # Member role - basic access
        member_perms = [
            "project_read", "board_read", "task_create", "task_read", 
            "task_update", "time_track"
        ]
        member_role = Role(
            id="member",
            name="Member",
            description="Basic member permissions",
            permission_ids=member_perms,
            permission_rule_ids=[],
            parent_role_id=None,
            is_system=True,
            is_default=True,
            scope_type="global",
            created_at=datetime.now(),
            created_by="system",
            updated_at=datetime.now(),
            updated_by="system"
        )
        self.roles["member"] = member_role
    
    # Permission CRUD operations
    
    def create_permission(self, permission: Permission) -> Permission:
        """Create a new permission"""
        if permission.id in self.permissions:
            raise ValueError(f"Permission with ID {permission.id} already exists")
        
        self.permissions[permission.id] = permission
        # logger.info(f"Created permission: {permission.id}")
        return permission
    
    def get_permission(self, permission_id: str) -> Optional[Permission]:
        """Get a permission by ID"""
        return self.permissions.get(permission_id)
    
    def get_all_permissions(self) -> List[Permission]:
        """Get all permissions"""
        return list(self.permissions.values())
    
    def get_permissions_by_resource_type(self, resource_type: ResourceType) -> List[Permission]:
        """Get permissions for a specific resource type"""
        return [p for p in self.permissions.values() if p.resource_type == resource_type]
    
    def update_permission(self, permission_id: str, updates: Dict[str, Any]) -> Optional[Permission]:
        """Update a permission"""
        permission = self.permissions.get(permission_id)
        if not permission:
            return None
        
        if permission.is_system:
            raise ValueError("Cannot modify system permissions")
        
        for key, value in updates.items():
            if hasattr(permission, key):
                setattr(permission, key, value)
        
        permission.updated_at = datetime.now()
        # logger.info(f"Updated permission: {permission_id}")
        return permission
    
    def delete_permission(self, permission_id: str) -> bool:
        """Delete a permission"""
        permission = self.permissions.get(permission_id)
        if not permission:
            return False
        
        if permission.is_system:
            raise ValueError("Cannot delete system permissions")
        
        del self.permissions[permission_id]
        
        # Remove from roles
        for role in self.roles.values():
            if permission_id in role.permission_ids:
                role.permission_ids.remove(permission_id)
        
        # logger.info(f"Deleted permission: {permission_id}")
        return True
    
    # Role CRUD operations
    
    def create_role(self, role: Role) -> Role:
        """Create a new role"""
        if role.id in self.roles:
            raise ValueError(f"Role with ID {role.id} already exists")
        
        # Validate permissions exist
        for perm_id in role.permission_ids:
            if perm_id not in self.permissions:
                raise ValueError(f"Permission {perm_id} does not exist")
        
        self.roles[role.id] = role
        # logger.info(f"Created role: {role.id}")
        return role
    
    def get_role(self, role_id: str) -> Optional[Role]:
        """Get a role by ID"""
        return self.roles.get(role_id)
    
    def get_all_roles(self) -> List[Role]:
        """Get all roles"""
        return list(self.roles.values())
    
    def get_roles_by_scope(self, scope_type: str, scope_id: Optional[str] = None) -> List[Role]:
        """Get roles by scope"""
        roles = []
        for role in self.roles.values():
            if role.scope_type == scope_type:
                if scope_id is None or role.scope_id == scope_id:
                    roles.append(role)
        return roles
    
    def update_role(self, role_id: str, updates: Dict[str, Any]) -> Optional[Role]:
        """Update a role"""
        role = self.roles.get(role_id)
        if not role:
            return None
        
        if role.is_system:
            # Only allow updating permissions for system roles
            if "permission_ids" in updates:
                role.permission_ids = updates["permission_ids"]
                role.updated_at = datetime.now()
        else:
            for key, value in updates.items():
                if hasattr(role, key):
                    setattr(role, key, value)
            role.updated_at = datetime.now()
        
        # logger.info(f"Updated role: {role_id}")
        return role
    
    def delete_role(self, role_id: str) -> bool:
        """Delete a role"""
        role = self.roles.get(role_id)
        if not role:
            return False
        
        if role.is_system:
            raise ValueError("Cannot delete system roles")
        
        # Remove role assignments
        assignments_to_remove = []
        for assignment_id, assignment in self.role_assignments.items():
            if assignment.role_id == role_id:
                assignments_to_remove.append(assignment_id)
        
        for assignment_id in assignments_to_remove:
            del self.role_assignments[assignment_id]
        
        del self.roles[role_id]
        # logger.info(f"Deleted role: {role_id}")
        return True
    
    # Role assignment operations
    
    def assign_role(self, assignment: RoleAssignment) -> RoleAssignment:
        """Assign a role to a user"""
        # Validate role exists
        if assignment.role_id not in self.roles:
            raise ValueError(f"Role {assignment.role_id} does not exist")
        
        # Check for existing assignment
        for existing in self.role_assignments.values():
            if (existing.user_id == assignment.user_id and 
                existing.role_id == assignment.role_id and
                existing.scope_type == assignment.scope_type and
                existing.scope_id == assignment.scope_id and
                existing.is_active):
                raise ValueError("User already has this role assignment")
        
        assignment.id = str(uuid.uuid4())
        self.role_assignments[assignment.id] = assignment
        
        # Clear permission cache for user
        self._clear_user_permission_cache(assignment.user_id)
        
        # logger.info(f"Assigned role {assignment.role_id} to user {assignment.user_id}")
        return assignment
    
    def revoke_role(self, assignment_id: str) -> bool:
        """Revoke a role assignment"""
        assignment = self.role_assignments.get(assignment_id)
        if not assignment:
            return False
        
        assignment.is_active = False
        
        # Clear permission cache for user
        self._clear_user_permission_cache(assignment.user_id)
        
        # logger.info(f"Revoked role assignment: {assignment_id}")
        return True
    
    def get_user_role_assignments(self, user_id: str, active_only: bool = True) -> List[RoleAssignment]:
        """Get all role assignments for a user"""
        assignments = []
        for assignment in self.role_assignments.values():
            if assignment.user_id == user_id:
                if not active_only or assignment.is_active:
                    assignments.append(assignment)
        return assignments
    
    def get_role_assignments(self, role_id: str, active_only: bool = True) -> List[RoleAssignment]:
        """Get all assignments of a specific role"""
        assignments = []
        for assignment in self.role_assignments.values():
            if assignment.role_id == role_id:
                if not active_only or assignment.is_active:
                    assignments.append(assignment)
        return assignments
    
    # Permission grant operations
    
    def grant_permission(self, grant: PermissionGrant) -> PermissionGrant:
        """Grant a permission directly to a user"""
        # Validate permission exists
        if grant.permission_id not in self.permissions:
            raise ValueError(f"Permission {grant.permission_id} does not exist")
        
        grant.id = str(uuid.uuid4())
        self.permission_grants[grant.id] = grant
        
        # Clear permission cache for user
        self._clear_user_permission_cache(grant.user_id)
        
        # logger.info(f"Granted permission {grant.permission_id} to user {grant.user_id}")
        return grant
    
    def revoke_permission_grant(self, grant_id: str) -> bool:
        """Revoke a permission grant"""
        grant = self.permission_grants.get(grant_id)
        if not grant:
            return False
        
        grant.is_active = False
        
        # Clear permission cache for user
        self._clear_user_permission_cache(grant.user_id)
        
        # logger.info(f"Revoked permission grant: {grant_id}")
        return True
    
    def get_user_permission_grants(self, user_id: str, active_only: bool = True) -> List[PermissionGrant]:
        """Get all permission grants for a user"""
        grants = []
        for grant in self.permission_grants.values():
            if grant.user_id == user_id:
                if not active_only or grant.is_active:
                    grants.append(grant)
        return grants
    
    # Permission checking
    
    def check_permission(self, check: PermissionCheck) -> PermissionCheckResult:
        """Check if a user has a specific permission"""
        # Check cache first
        cache_key = f"{check.user_id}:{check.resource_type}:{check.resource_id}:{check.action}"
        cached_result = self.permission_check_cache.get(cache_key)
        if cached_result and (datetime.now() - cached_result.checked_at).seconds < 300:  # 5 min cache
            return cached_result
        
        result = PermissionCheckResult(
            allowed=False,
            user_id=check.user_id,
            resource_type=check.resource_type,
            resource_id=check.resource_id,
            action=check.action,
            checked_at=datetime.now()
        )
        
        # Get all user's permissions
        user_permissions = self.get_user_permissions(check.user_id)
        
        # Check for matching permission
        for permission in user_permissions:
            if (permission.resource_type == check.resource_type and 
                permission.action == check.action):
                result.allowed = True
                result.grant_type = "role"  # Simplified for now
                break
        
        # Cache result
        self.permission_check_cache[cache_key] = result
        
        return result
    
    def get_user_permissions(self, user_id: str) -> Set[Permission]:
        """Get all permissions for a user (from roles and direct grants)"""
        permissions = set()
        
        # Get permissions from role assignments
        assignments = self.get_user_role_assignments(user_id, active_only=True)
        for assignment in assignments:
            role = self.roles.get(assignment.role_id)
            if role:
                # Add direct permissions
                for perm_id in role.permission_ids:
                    perm = self.permissions.get(perm_id)
                    if perm:
                        permissions.add(perm)
                
                # Add inherited permissions from parent role
                if role.parent_role_id:
                    parent_role = self.roles.get(role.parent_role_id)
                    if parent_role:
                        for perm_id in parent_role.permission_ids:
                            perm = self.permissions.get(perm_id)
                            if perm:
                                permissions.add(perm)
        
        # Get permissions from direct grants
        grants = self.get_user_permission_grants(user_id, active_only=True)
        for grant in grants:
            perm = self.permissions.get(grant.permission_id)
            if perm:
                permissions.add(perm)
        
        return permissions
    
    def _clear_user_permission_cache(self, user_id: str):
        """Clear permission cache for a specific user"""
        keys_to_remove = []
        for key in self.permission_check_cache:
            if key.startswith(f"{user_id}:"):
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self.permission_check_cache[key]
    
    # Permission rules
    
    def create_permission_rule(self, rule: PermissionRule) -> PermissionRule:
        """Create a permission rule"""
        if rule.id in self.permission_rules:
            raise ValueError(f"Permission rule with ID {rule.id} already exists")
        
        self.permission_rules[rule.id] = rule
        # logger.info(f"Created permission rule: {rule.id}")
        return rule
    
    def get_permission_rule(self, rule_id: str) -> Optional[PermissionRule]:
        """Get a permission rule by ID"""
        return self.permission_rules.get(rule_id)
    
    def get_permission_rules_for_resource(self, resource_type: ResourceType) -> List[PermissionRule]:
        """Get all permission rules for a resource type"""
        return [r for r in self.permission_rules.values() if r.resource_type == resource_type]
    
    def update_permission_rule(self, rule_id: str, updates: Dict[str, Any]) -> Optional[PermissionRule]:
        """Update a permission rule"""
        rule = self.permission_rules.get(rule_id)
        if not rule:
            return None
        
        for key, value in updates.items():
            if hasattr(rule, key):
                setattr(rule, key, value)
        
        rule.updated_at = datetime.now()
        # logger.info(f"Updated permission rule: {rule_id}")
        return rule
    
    def delete_permission_rule(self, rule_id: str) -> bool:
        """Delete a permission rule"""
        if rule_id not in self.permission_rules:
            return False
        
        del self.permission_rules[rule_id]
        
        # Remove from roles
        for role in self.roles.values():
            if rule_id in role.permission_rule_ids:
                role.permission_rule_ids.remove(rule_id)
        
        # logger.info(f"Deleted permission rule: {rule_id}")
        return True
    
    # Permission templates
    
    def create_permission_template(self, template: PermissionTemplate) -> PermissionTemplate:
        """Create a permission template"""
        if template.id in self.permission_templates:
            raise ValueError(f"Permission template with ID {template.id} already exists")
        
        self.permission_templates[template.id] = template
        # logger.info(f"Created permission template: {template.id}")
        return template
    
    def get_permission_template(self, template_id: str) -> Optional[PermissionTemplate]:
        """Get a permission template by ID"""
        return self.permission_templates.get(template_id)
    
    def get_permission_templates_by_category(self, category: str) -> List[PermissionTemplate]:
        """Get permission templates by category"""
        return [t for t in self.permission_templates.values() if t.category == category]
    
    def apply_permission_template(self, template_id: str, scope_type: str, scope_id: str, applied_by: str) -> Dict[str, Any]:
        """Apply a permission template"""
        template = self.permission_templates.get(template_id)
        if not template:
            raise ValueError(f"Template {template_id} not found")
        
        created_roles = []
        created_rules = []
        
        # Create roles from template
        for role_config in template.roles:
            role = Role(
                id=f"{template_id}_{role_config['name']}_{scope_id}",
                name=role_config['name'],
                description=role_config.get('description', ''),
                permission_ids=role_config.get('permission_ids', []),
                permission_rule_ids=role_config.get('rule_ids', []),
                scope_type=scope_type,
                scope_id=scope_id,
                created_at=datetime.now(),
                created_by=applied_by,
                updated_at=datetime.now(),
                updated_by=applied_by
            )
            self.create_role(role)
            created_roles.append(role)
        
        # Create rules from template
        for rule_config in template.rules:
            rule = PermissionRule(
                id=f"{template_id}_{rule_config['name']}_{scope_id}",
                name=rule_config['name'],
                description=rule_config.get('description'),
                permission_id=rule_config['permission_id'],
                resource_type=ResourceType(rule_config['resource_type']),
                conditions=rule_config.get('conditions', {}),
                scope_type=scope_type,
                scope_id=scope_id,
                created_at=datetime.now(),
                created_by=applied_by,
                updated_at=datetime.now(),
                updated_by=applied_by
            )
            self.create_permission_rule(rule)
            created_rules.append(rule)
        
        return {
            "template_id": template_id,
            "created_roles": len(created_roles),
            "created_rules": len(created_rules),
            "role_ids": [r.id for r in created_roles],
            "rule_ids": [r.id for r in created_rules]
        }
    
    # Permission policies
    
    def create_permission_policy(self, policy: PermissionPolicy) -> PermissionPolicy:
        """Create a permission policy"""
        if policy.id in self.permission_policies:
            raise ValueError(f"Permission policy with ID {policy.id} already exists")
        
        self.permission_policies[policy.id] = policy
        # logger.info(f"Created permission policy: {policy.id}")
        return policy
    
    def get_permission_policy(self, policy_id: str) -> Optional[PermissionPolicy]:
        """Get a permission policy by ID"""
        return self.permission_policies.get(policy_id)
    
    def get_active_permission_policies(self) -> List[PermissionPolicy]:
        """Get all active permission policies"""
        return [p for p in self.permission_policies.values() if p.is_active]
    
    def update_permission_policy(self, policy_id: str, updates: Dict[str, Any]) -> Optional[PermissionPolicy]:
        """Update a permission policy"""
        policy = self.permission_policies.get(policy_id)
        if not policy:
            return None
        
        for key, value in updates.items():
            if hasattr(policy, key):
                setattr(policy, key, value)
        
        policy.updated_at = datetime.now()
        # logger.info(f"Updated permission policy: {policy_id}")
        return policy
    
    def delete_permission_policy(self, policy_id: str) -> bool:
        """Delete a permission policy"""
        if policy_id not in self.permission_policies:
            return False
        
        del self.permission_policies[policy_id]
        # logger.info(f"Deleted permission policy: {policy_id}")
        return True