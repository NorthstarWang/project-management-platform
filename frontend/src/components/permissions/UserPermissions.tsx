"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  User,
  Users,
  Clock,
  Check,
  X,
  AlertCircle,
  Key,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/Collapsible";
import permissionService from "@/services/permissionService";
import userService from "@/services/userService";
import {
  Role,
  RoleAssignment,
  PermissionGrant,
  PermissionMatrix,
  RoleAssignRequest,
  PermissionGrantRequest,
  ResourceType,
  PermissionAction
} from "@/types/permissions";
import { User as UserType } from "@/types/user";
import { toast } from "sonner";
import { format } from "date-fns";

interface UserPermissionsProps {
  userId?: string;
  scopeType?: string;
  scopeId?: string;
}

export function UserPermissions({ userId, scopeType, scopeId }: UserPermissionsProps) {
  const [users, setUsers] = useState<UserType[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix | null>(null);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  // Form state
  const [assignFormData, setAssignFormData] = useState<RoleAssignRequest>({
    role_id: "",
    user_ids: [],
    scope_type: scopeType || "global",
    scope_id: scopeId
  });

  const [grantFormData, setGrantFormData] = useState<PermissionGrantRequest>({
    user_id: "",
    permission_id: "",
    reason: ""
  });

  useEffect(() => {
    if (userId) {
      loadUserData(userId);
    } else {
      loadUsers();
    }
  }, [userId]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await userService.getUsers();
      setUsers(usersData);
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      setLoading(true);
      const [user, roles, matrix, availableRoles] = await Promise.all([
        userService.getUser(userId),
        permissionService.getUserRoles(userId, scopeType, scopeId),
        permissionService.getPermissionMatrix(userId),
        permissionService.getRoles(scopeType, scopeId)
      ]);
      
      setSelectedUser(user);
      setUserRoles(roles);
      setPermissionMatrix(matrix);
      setAvailableRoles(availableRoles);
    } catch (error) {
      console.error("Failed to load user permissions:", error);
      toast.error("Failed to load user permissions");
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setSelectedUser(user);
      loadUserData(userId);
    }
  };

  const handleAssignRole = async () => {
    try {
      await permissionService.assignRoles({
        ...assignFormData,
        user_ids: [selectedUser!.id]
      });
      await loadUserData(selectedUser!.id);
      setShowAssignDialog(false);
      resetAssignForm();
      toast.success("Role assigned successfully");
    } catch (error) {
      console.error("Failed to assign role:", error);
      toast.error("Failed to assign role");
    }
  };

  const handleRevokeRole = async (assignmentId: string) => {
    try {
      await permissionService.revokeRoleAssignment(assignmentId);
      await loadUserData(selectedUser!.id);
      toast.success("Role revoked successfully");
    } catch (error) {
      console.error("Failed to revoke role:", error);
      toast.error("Failed to revoke role");
    }
  };

  const handleGrantPermission = async () => {
    try {
      await permissionService.grantPermission({
        ...grantFormData,
        user_id: selectedUser!.id
      });
      await loadUserData(selectedUser!.id);
      setShowGrantDialog(false);
      resetGrantForm();
      toast.success("Permission granted successfully");
    } catch (error) {
      console.error("Failed to grant permission:", error);
      toast.error("Failed to grant permission");
    }
  };

  const handleRevokeGrant = async (grantId: string) => {
    try {
      await permissionService.revokePermissionGrant(grantId);
      await loadUserData(selectedUser!.id);
      toast.success("Permission grant revoked successfully");
    } catch (error) {
      console.error("Failed to revoke permission grant:", error);
      toast.error("Failed to revoke permission grant");
    }
  };

  const resetAssignForm = () => {
    setAssignFormData({
      role_id: "",
      user_ids: [],
      scope_type: scopeType || "global",
      scope_id: scopeId
    });
  };

  const resetGrantForm = () => {
    setGrantFormData({
      user_id: "",
      permission_id: "",
      reason: ""
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading permissions...</div>;
  }

  return (
    <div className="space-y-6">
      {/* User Selection */}
      {!userId && (
        <Card>
          <CardHeader>
            <CardTitle>Select User</CardTitle>
            <CardDescription>
              Choose a user to manage their permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select onValueChange={handleUserSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span className="text-primary">{user.full_name}</span>
                      <Badge variant="outline" className="ml-2">
                        {user.role}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* User Permission Details */}
      {selectedUser && (
        <>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold flex items-center space-x-2 text-primary">
                <Shield className="h-6 w-6" />
                <span>{selectedUser.full_name}&apos;s Permissions</span>
              </h2>
              <p className="text-muted-foreground">
                Manage roles and direct permissions
              </p>
            </div>
            <div className="space-x-2">
              <Button onClick={() => setShowAssignDialog(true)}>
                <Users className="h-4 w-4 mr-2" />
                Assign Role
              </Button>
              <Button variant="outline" onClick={() => setShowGrantDialog(true)}>
                <Key className="h-4 w-4 mr-2" />
                Grant Permission
              </Button>
            </div>
          </div>

          <Tabs defaultValue="roles" className="space-y-4">
            <TabsList>
              <TabsTrigger value="roles">Roles</TabsTrigger>
              <TabsTrigger value="direct">Direct Permissions</TabsTrigger>
              <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
            </TabsList>

            {/* Roles Tab */}
            <TabsContent value="roles" className="space-y-4">
              {userRoles.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No roles assigned to this user.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {userRoles.map(({ assignment_id, role, scope_type, scope_id, assigned_at, expires_at }) => (
                    <Card key={assignment_id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg text-primary">{role.name}</CardTitle>
                            <CardDescription>{role.description}</CardDescription>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeRole(assignment_id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">
                              {scope_type}
                              {scope_id && `: ${scope_id}`}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground">
                            Assigned: {format(new Date(assigned_at), "PPP")}
                          </div>
                          {expires_at && (
                            <div className="flex items-center space-x-1 text-yellow-600">
                              <Clock className="h-3 w-3" />
                              <span>Expires: {format(new Date(expires_at), "PPP")}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Direct Permissions Tab */}
            <TabsContent value="direct" className="space-y-4">
              {permissionMatrix?.direct_grants.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No direct permissions granted to this user.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {permissionMatrix?.direct_grants.map(grant => (
                    <Card key={grant.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg text-primary">{grant.permission_id}</CardTitle>
                            {grant.resource_type && (
                              <CardDescription>
                                Resource: {grant.resource_type}
                                {grant.resource_id && ` (${grant.resource_id})`}
                              </CardDescription>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeGrant(grant.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="text-secondary">Reason: {grant.reason}</div>
                          <div className="text-muted-foreground">
                            Granted: {format(new Date(grant.granted_at), "PPP")}
                          </div>
                          {grant.expires_at && (
                            <div className="flex items-center space-x-1 text-yellow-600">
                              <Clock className="h-3 w-3" />
                              <span>Expires: {format(new Date(grant.expires_at), "PPP")}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Permission Matrix Tab */}
            <TabsContent value="matrix" className="space-y-4">
              {permissionMatrix && (
                <div className="space-y-4">
                  {Object.entries(permissionMatrix.permissions).map(([resourceType, actions]) => (
                    <Collapsible
                      key={resourceType}
                      open={expandedSections.includes(resourceType)}
                      onOpenChange={() => toggleSection(resourceType)}
                    >
                      <Card>
                        <CollapsibleTrigger className="w-full">
                          <CardHeader className="cursor-pointer">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-lg capitalize text-primary">
                                {resourceType} Permissions
                              </CardTitle>
                              <ChevronDown
                                className={`h-5 w-5 transition-transform ${
                                  expandedSections.includes(resourceType) ? "rotate-180" : ""
                                }`}
                              />
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {Object.entries(actions).map(([action, allowed]) => (
                                <div
                                  key={action}
                                  className="flex items-center space-x-2 p-2 rounded-md bg-muted"
                                >
                                  {allowed ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <X className="h-4 w-4 text-red-500" />
                                  )}
                                  <span className="text-sm capitalize">
                                    {action.replace(/_/g, " ")}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Assign Role Dialog */}
          <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Role</DialogTitle>
                <DialogDescription>
                  Assign a role to {selectedUser.full_name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={assignFormData.role_id}
                    onValueChange={(value) => setAssignFormData({ ...assignFormData, role_id: value })}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          <div>
                            <p className="font-medium text-primary">{role.name}</p>
                            <p className="text-sm text-muted-foreground">{role.description}</p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={assignFormData.notes || ""}
                    onChange={(e) => setAssignFormData({ ...assignFormData, notes: e.target.value })}
                    placeholder="Add any notes about this assignment"
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAssignRole} disabled={!assignFormData.role_id}>
                  Assign Role
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Grant Permission Dialog */}
          <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Grant Direct Permission</DialogTitle>
                <DialogDescription>
                  Grant a specific permission to {selectedUser.full_name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="permission">Permission</Label>
                  <Input
                    id="permission"
                    value={grantFormData.permission_id}
                    onChange={(e) => setGrantFormData({ ...grantFormData, permission_id: e.target.value })}
                    placeholder="e.g., report.create"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    value={grantFormData.reason}
                    onChange={(e) => setGrantFormData({ ...grantFormData, reason: e.target.value })}
                    placeholder="Explain why this permission is needed"
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowGrantDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleGrantPermission}
                  disabled={!grantFormData.permission_id || !grantFormData.reason}
                >
                  Grant Permission
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}