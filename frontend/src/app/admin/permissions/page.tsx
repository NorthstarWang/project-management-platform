"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { RoleManagement } from "@/components/permissions/RoleManagement";
import { UserPermissions } from "@/components/permissions/UserPermissions";
import { Shield, Users, Key } from "lucide-react";
import analyticsLogger from "@/services/analyticsLogger";

export default function AdminPermissionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("roles");

  React.useEffect(() => {
    // Check if user is admin
    if (user && user.role !== "admin") {
      router.push("/dashboard");
    }
    
    // Log page view
    analyticsLogger.track("PAGE_VIEW", {
      text: "User viewed Admin Permissions Management page",
      page: "admin_permissions",
      page_title: "Admin Permissions Management"
    });
  }, [user, router]);

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-primary">Permissions Management</h1>
          <p className="text-muted-foreground mb-4">
            Manage roles, permissions, and user access controls
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="roles" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Roles</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>User Permissions</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center space-x-2">
              <Key className="h-4 w-4" />
              <span>Permission Templates</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roles">
            <RoleManagement />
          </TabsContent>

          <TabsContent value="users">
            <UserPermissions />
          </TabsContent>

          <TabsContent value="templates">
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Permission templates feature coming soon...
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}