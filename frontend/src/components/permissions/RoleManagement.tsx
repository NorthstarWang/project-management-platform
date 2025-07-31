"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Shield, 
  Users, 
  Edit2, 
  Trash2, 
  ChevronRight,
  Lock,
  AlertCircle 
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { Textarea } from "@/components/ui/Textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import permissionService from "@/services/permissionService";
import {
  Role,
  Permission,
  RoleAssignment,
  RoleCreateRequest,
  RoleUpdateRequest,
  ResourceType,
  PermissionAction
} from "@/types/permissions";
import { toast } from "sonner";

interface RoleManagementProps {
  scopeType?: string;
  scopeId?: string;
}

export function RoleManagement({ scopeType, scopeId }: RoleManagementProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<RoleCreateRequest>({
    name: "",
    description: "",
    permission_ids: [],
    scope_type: scopeType || "global",
    scope_id: scopeId
  });

  useEffect(() => {
    loadData();
  }, [scopeType, scopeId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, permissionsData] = await Promise.all([
        permissionService.getRoles(scopeType, scopeId),
        permissionService.getAllPermissions()
      ]);
      setRoles(rolesData);
      setPermissions(permissionsData);
    } catch (error) {
      console.error("Failed to load roles:", error);
      toast.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    try {
      const newRole = await permissionService.createRole(formData);
      setRoles([...roles, newRole]);
      setShowCreateDialog(false);
      resetForm();
      toast.success("Role created successfully");
    } catch (error) {
      console.error("Failed to create role:", error);
      toast.error("Failed to create role");
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole) return;
    
    try {
      const updateData: RoleUpdateRequest = {
        name: formData.name,
        description: formData.description,
        permission_ids: formData.permission_ids
      };
      
      const updatedRole = await permissionService.updateRole(selectedRole.id, updateData);
      setRoles(roles.map(r => r.id === updatedRole.id ? updatedRole : r));
      setShowEditDialog(false);
      resetForm();
      toast.success("Role updated successfully");
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error("Failed to update role");
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;
    
    try {
      await permissionService.deleteRole(selectedRole.id);
      setRoles(roles.filter(r => r.id !== selectedRole.id));
      setShowDeleteDialog(false);
      setSelectedRole(null);
      toast.success("Role deleted successfully");
    } catch (error) {
      console.error("Failed to delete role:", error);
      toast.error("Failed to delete role");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      permission_ids: [],
      scope_type: scopeType || "global",
      scope_id: scopeId
    });
    setSelectedRole(null);
  };

  const openEditDialog = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      description: role.description,
      permission_ids: role.permission_ids,
      scope_type: role.scope_type || "global",
      scope_id: role.scope_id
    });
    setShowEditDialog(true);
  };

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(permissionId)
        ? prev.permission_ids.filter(id => id !== permissionId)
        : [...prev.permission_ids, permissionId]
    }));
  };

  const groupPermissionsByResource = () => {
    const grouped: Record<string, Permission[]> = {};
    permissions.forEach(perm => {
      if (!grouped[perm.resource_type]) {
        grouped[perm.resource_type] = [];
      }
      grouped[perm.resource_type].push(perm);
    });
    return grouped;
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading roles...</div>;
  }

  const groupedPermissions = groupPermissionsByResource();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-primary">Role Management</h2>
          <p className="text-muted-foreground">
            Manage roles and permissions for {scopeType || "the system"}
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>

      {/* Roles Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map(role => (
          <Card key={role.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                    <CardDescription>{role.description}</CardDescription>
                  </div>
                </div>
                {role.is_system && (
                  <Badge variant="secondary">System</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Permissions</p>
                  <div className="flex flex-wrap gap-1">
                    {role.permission_ids.slice(0, 3).map(permId => {
                      const perm = permissions.find(p => p.id === permId);
                      return perm ? (
                        <Badge key={permId} variant="outline" className="text-xs">
                          {perm.name}
                        </Badge>
                      ) : null;
                    })}
                    {role.permission_ids.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{role.permission_ids.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                {role.scope_type && role.scope_type !== "global" && (
                  <div>
                    <p className="text-sm text-muted-foreground">Scope</p>
                    <Badge variant="secondary">
                      {role.scope_type}
                      {role.scope_id && `: ${role.scope_id}`}
                    </Badge>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(role)}
                    disabled={role.is_system}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedRole(role);
                      setShowDeleteDialog(true);
                    }}
                    disabled={role.is_system}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Role Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Define a new role with specific permissions
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Project Manager"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the purpose of this role"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              <Tabs defaultValue={Object.keys(groupedPermissions)[0]}>
                <TabsList className="grid grid-cols-3 w-full">
                  {Object.keys(groupedPermissions).slice(0, 3).map(resourceType => (
                    <TabsTrigger key={resourceType} value={resourceType}>
                      {resourceType}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {Object.entries(groupedPermissions).map(([resourceType, perms]) => (
                  <TabsContent key={resourceType} value={resourceType} className="space-y-2">
                    {perms.map(permission => (
                      <div key={permission.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={permission.id}
                          checked={formData.permission_ids.includes(permission.id)}
                          onCheckedChange={() => togglePermission(permission.id)}
                        />
                        <Label
                          htmlFor={permission.id}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          <span className="font-medium text-primary">{permission.name}</span>
                          <span className="text-muted-foreground ml-2">
                            {permission.description}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRole} disabled={!formData.name}>
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Modify role permissions and settings
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Role Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              <Tabs defaultValue={Object.keys(groupedPermissions)[0]}>
                <TabsList className="grid grid-cols-3 w-full">
                  {Object.keys(groupedPermissions).slice(0, 3).map(resourceType => (
                    <TabsTrigger key={resourceType} value={resourceType}>
                      {resourceType}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {Object.entries(groupedPermissions).map(([resourceType, perms]) => (
                  <TabsContent key={resourceType} value={resourceType} className="space-y-2">
                    {perms.map(permission => (
                      <div key={permission.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-${permission.id}`}
                          checked={formData.permission_ids.includes(permission.id)}
                          onCheckedChange={() => togglePermission(permission.id)}
                        />
                        <Label
                          htmlFor={`edit-${permission.id}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          <span className="font-medium text-primary">{permission.name}</span>
                          <span className="text-muted-foreground ml-2">
                            {permission.description}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the role &ldquo;{selectedRole?.name}&rdquo;?
            </DialogDescription>
          </DialogHeader>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This action cannot be undone. All users assigned to this role will lose their permissions.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRole}>
              Delete Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}