"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { AuditLog } from "@/components/audit/AuditLog";
import { ComplianceDashboard } from "@/components/audit/ComplianceDashboard";
import { Activity, Shield, AlertCircle } from "lucide-react";
import analyticsLogger from "@/services/analyticsLogger";

export default function AdminAuditPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("logs");

  React.useEffect(() => {
    // Check if user is admin
    if (user && user.role !== "admin") {
      router.push("/dashboard");
    }
    
    // Log page view
    analyticsLogger.track("PAGE_VIEW", {
      text: "User viewed Admin Audit & Compliance page",
      page: "admin_audit",
      page_title: "Admin Audit & Compliance"
    });
  }, [user, router]);

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-primary">Audit & Compliance</h1>
          <p className="text-muted-foreground mb-4">
            Monitor system activity and manage compliance requirements
          </p>
        </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="logs" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Audit Logs</span>
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Compliance</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4" />
            <span>Security Alerts</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs">
          <AuditLog />
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceDashboard />
        </TabsContent>

        <TabsContent value="alerts">
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Security alerts feature coming soon...
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
    </DashboardLayout>
  );
}