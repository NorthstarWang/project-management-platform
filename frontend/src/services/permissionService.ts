import apiClient from "./apiClient";
import {
  Permission,
  Role,
  RoleAssignment,
  PermissionGrant,
  PermissionCheck,
  PermissionCheckResult,
  PermissionTemplate,
  PermissionPolicy,
  PermissionMatrix,
  RoleCreateRequest,
  RoleUpdateRequest,
  RoleAssignRequest,
  PermissionGrantRequest,
  BulkPermissionCheck,
  BulkPermissionCheckResult,
  PermissionAuditRequest,
  PermissionAuditResult,
  ResourceType
} from "@/types/permissions";

class PermissionService {
  // Permission endpoints
  async getAllPermissions(resourceType?: ResourceType): Promise<Permission[]> {
    const params: Record<string, string> = resourceType ? { resource_type: resourceType } : {};
    const response = await apiClient.get("/api/permissions/permissions", params);
    return response.data;
  }

  async getPermission(permissionId: string): Promise<Permission> {
    const response = await apiClient.get(`/api/permissions/permissions/${permissionId}`);
    return response.data;
  }

  // Role endpoints
  async createRole(data: RoleCreateRequest): Promise<Role> {
    const response = await apiClient.post("/api/permissions/roles", data);
    return response.data;
  }

  async getRoles(scopeType?: string, scopeId?: string): Promise<Role[]> {
    const params: Record<string, string> = {};
    if (scopeType) params.scope_type = scopeType;
    if (scopeId) params.scope_id = scopeId;
    
    const response = await apiClient.get("/api/permissions/roles", params);
    return response.data;
  }

  async getRole(roleId: string): Promise<Role> {
    const response = await apiClient.get(`/api/permissions/roles/${roleId}`);
    return response.data;
  }

  async updateRole(roleId: string, data: RoleUpdateRequest): Promise<Role> {
    const response = await apiClient.put(`/api/permissions/roles/${roleId}`, data);
    return response.data;
  }

  async deleteRole(roleId: string): Promise<void> {
    await apiClient.delete(`/api/permissions/roles/${roleId}`);
  }

  // Role assignment endpoints
  async assignRoles(data: RoleAssignRequest): Promise<RoleAssignment[]> {
    const response = await apiClient.post("/api/permissions/roles/assign", data);
    return response.data;
  }

  async revokeRoleAssignment(assignmentId: string): Promise<void> {
    await apiClient.delete(`/api/permissions/roles/assignments/${assignmentId}`);
  }

  async getUserRoles(userId: string, scopeType?: string, scopeId?: string): Promise<any[]> {
    const params: Record<string, string> = {};
    if (scopeType) params.scope_type = scopeType;
    if (scopeId) params.scope_id = scopeId;
    
    const response = await apiClient.get(`/api/permissions/users/${userId}/roles`, params);
    return response.data;
  }

  // Permission grant endpoints
  async grantPermission(data: PermissionGrantRequest): Promise<PermissionGrant> {
    const response = await apiClient.post("/api/permissions/permissions/grant", data);
    return response.data;
  }

  async revokePermissionGrant(grantId: string): Promise<void> {
    await apiClient.delete(`/api/permissions/permissions/grants/${grantId}`);
  }

  // Permission checking endpoints
  async checkPermission(check: PermissionCheck): Promise<PermissionCheckResult> {
    const response = await apiClient.post("/api/permissions/check", check);
    return response.data;
  }

  async checkPermissionsBulk(bulk: BulkPermissionCheck): Promise<BulkPermissionCheckResult> {
    const response = await apiClient.post("/api/permissions/check-bulk", bulk);
    return response.data;
  }

  async getPermissionMatrix(userId: string): Promise<PermissionMatrix> {
    const response = await apiClient.get(`/api/permissions/users/${userId}/matrix`);
    return response.data;
  }

  // Permission template endpoints
  async getPermissionTemplates(category?: string): Promise<PermissionTemplate[]> {
    const params: Record<string, string> = category ? { category } : {};
    const response = await apiClient.get("/api/permissions/templates", params);
    return response.data;
  }

  async applyPermissionTemplate(
    templateId: string,
    scopeType: string,
    scopeId: string
  ): Promise<any> {
    const response = await apiClient.post(`/api/permissions/templates/${templateId}/apply`, {
      scope_type: scopeType,
      scope_id: scopeId
    });
    return response.data;
  }

  // Permission audit endpoints
  async auditPermissions(request: PermissionAuditRequest): Promise<PermissionAuditResult> {
    const response = await apiClient.post("/api/permissions/audit", request);
    return response.data;
  }

  // Local permission checking (for UI)
  canUserPerform(
    userPermissions: Permission[],
    resourceType: ResourceType,
    action: string
  ): boolean {
    return userPermissions.some(
      perm => perm.resource_type === resourceType && perm.action === action
    );
  }

  // Helper to check multiple permissions at once
  getUserPermissionMap(
    userPermissions: Permission[]
  ): Record<string, boolean> {
    const map: Record<string, boolean> = {};
    userPermissions.forEach(perm => {
      const key = `${perm.resource_type}.${perm.action}`;
      map[key] = true;
    });
    return map;
  }
}

const permissionService = new PermissionService();
export default permissionService;