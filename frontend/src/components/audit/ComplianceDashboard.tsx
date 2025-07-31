"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  TrendingUp,
  Clock,
  BarChart,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import auditService from "@/services/auditService";
import { ComplianceRequirement } from "@/types/audit";
import { toast } from "sonner";
import { format } from "date-fns";

export function ComplianceDashboard() {
  const [loading, setLoading] = useState(true);
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [selectedStandard, setSelectedStandard] = useState<string>("all");
  const [assessingRequirement, setAssessingRequirement] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [requirementsData, dashboardData] = await Promise.all([
        auditService.getComplianceRequirements(),
        auditService.getComplianceDashboard()
      ]);
      setRequirements(requirementsData);
      setDashboard(dashboardData);
    } catch (error) {
      console.error("Failed to load compliance data:", error);
      toast.error("Failed to load compliance data");
    } finally {
      setLoading(false);
    }
  };

  const handleAssessCompliance = async (requirementId: string) => {
    try {
      setAssessingRequirement(requirementId);
      const result = await auditService.assessCompliance(requirementId);
      
      // Update the requirement in state
      setRequirements(prev => 
        prev.map(req => 
          req.id === requirementId 
            ? { 
                ...req, 
                compliance_status: result.status,
                compliance_score: result.score,
                last_assessment: new Date().toISOString()
              }
            : req
        )
      );
      
      // Reload dashboard to reflect changes
      const dashboardData = await auditService.getComplianceDashboard();
      setDashboard(dashboardData);
      
      toast.success("Compliance assessment completed");
    } catch (error) {
      console.error("Failed to assess compliance:", error);
      toast.error("Failed to assess compliance");
    } finally {
      setAssessingRequirement(null);
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "non_compliant":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "partial":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "compliant":
        return <Badge className="bg-green-500">Compliant</Badge>;
      case "non_compliant":
        return <Badge variant="destructive">Non-Compliant</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500">Partial</Badge>;
      default:
        return <Badge variant="secondary">Not Assessed</Badge>;
    }
  };

  const getComplianceColor = (score?: number) => {
    if (!score) return "bg-gray-500";
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const filteredRequirements = selectedStandard === "all" 
    ? requirements 
    : requirements.filter(req => req.standard === selectedStandard);

  const standards = [...new Set(requirements.map(req => req.standard))];

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading compliance data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <Shield className="h-6 w-6" />
            <span>Compliance Dashboard</span>
          </h2>
          <p className="text-muted-foreground">
            Monitor and manage compliance requirements
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {dashboard && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Requirements
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.total_requirements}</div>
              <p className="text-xs text-muted-foreground">
                Across {standards.length} standards
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Compliant
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.by_status.compliant}</div>
              <Progress 
                value={(dashboard.by_status.compliant / dashboard.total_requirements) * 100} 
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Non-Compliant
              </CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.by_status.non_compliant}</div>
              <Progress 
                value={(dashboard.by_status.non_compliant / dashboard.total_requirements) * 100} 
                className="mt-2 [&>div]:bg-red-500"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Not Assessed
              </CardTitle>
              <Clock className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.by_status.not_assessed}</div>
              <Progress 
                value={(dashboard.by_status.not_assessed / dashboard.total_requirements) * 100} 
                className="mt-2 [&>div]:bg-gray-500"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Compliance by Standard */}
      {dashboard && (
        <Card>
          <CardHeader>
            <CardTitle>Compliance by Standard</CardTitle>
            <CardDescription>
              Overview of compliance status for each standard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(dashboard.by_standard).map(([standard, data]: [string, any]) => (
                <div key={standard} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">{standard}</h4>
                    <span className="text-sm text-muted-foreground">
                      {data.compliant} / {data.total} compliant
                    </span>
                  </div>
                  <Progress 
                    value={(data.compliant / data.total) * 100} 
                    className={`h-2 ${
                      data.compliant === data.total ? "[&>div]:bg-green-500" :
                      data.compliant > 0 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"
                    }`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requirements List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Compliance Requirements</CardTitle>
              <CardDescription>
                Manage and assess individual requirements
              </CardDescription>
            </div>
            <Select value={selectedStandard} onValueChange={setSelectedStandard}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Standards</SelectItem>
                {standards.map(standard => (
                  <SelectItem key={standard} value={standard}>
                    {standard}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRequirements.map(requirement => (
              <div
                key={requirement.id}
                className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(requirement.compliance_status)}
                      <h3 className="font-medium">{requirement.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {requirement.description}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(requirement.compliance_status)}
                    <Button
                      size="sm"
                      onClick={() => handleAssessCompliance(requirement.id)}
                      disabled={assessingRequirement === requirement.id}
                    >
                      {assessingRequirement === requirement.id ? "Assessing..." : "Assess"}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium mb-1">Category</p>
                    <Badge variant="outline">{requirement.category}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Frequency</p>
                    <p className="text-sm text-muted-foreground">{requirement.frequency}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Last Assessment</p>
                    <p className="text-sm text-muted-foreground">
                      {requirement.last_assessment 
                        ? format(new Date(requirement.last_assessment), "PP")
                        : "Never"
                      }
                    </p>
                  </div>
                </div>

                {requirement.compliance_score !== undefined && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Compliance Score</span>
                      <span className="font-medium">{requirement.compliance_score}%</span>
                    </div>
                    <Progress 
                      value={requirement.compliance_score} 
                      className={`h-2 [&>div]:${getComplianceColor(requirement.compliance_score)}`}
                    />
                  </div>
                )}

                <Tabs defaultValue="controls" className="mt-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="controls">Controls</TabsTrigger>
                    <TabsTrigger value="evidence">Evidence Required</TabsTrigger>
                  </TabsList>
                  <TabsContent value="controls" className="mt-3">
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {requirement.controls && requirement.controls.length > 0 ? (
                        requirement.controls.map((control, index) => (
                          <li key={index}>{control}</li>
                        ))
                      ) : (
                        <li className="text-muted-foreground">No controls defined</li>
                      )}
                    </ul>
                  </TabsContent>
                  <TabsContent value="evidence" className="mt-3">
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {requirement.evidence_required && requirement.evidence_required.length > 0 ? (
                        requirement.evidence_required.map((evidence, index) => (
                          <li key={index}>{evidence}</li>
                        ))
                      ) : (
                        <li className="text-muted-foreground">No evidence required</li>
                      )}
                    </ul>
                  </TabsContent>
                </Tabs>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Assessments */}
      {dashboard?.recent_assessments?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Assessments</CardTitle>
            <CardDescription>
              Latest compliance assessment activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.recent_assessments.map((assessment: any) => (
                <div
                  key={assessment.requirement_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(assessment.status)}
                    <div>
                      <p className="font-medium">{assessment.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {assessment.standard} • {format(new Date(assessment.assessed_at), "PPp")}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(assessment.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}