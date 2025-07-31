import apiClient from "./apiClient";
import {
  AuditEntry,
  AuditSession,
  AuditReport,
  AuditReportResult,
  ComplianceRequirement,
  AuditPolicy,
  AuditAlert,
  AuditSearchRequest,
  AuditSearchResult,
  AuditStatistics,
  AuditExportRequest,
  AlertStatus
} from "@/types/audit";

class AuditService {
  // Audit log endpoints
  async searchAuditLogs(request: AuditSearchRequest): Promise<AuditSearchResult> {
    const response = await apiClient.post("/api/audit/logs/search", request);
    return response.data;
  }

  async getAuditEntry(entryId: string): Promise<AuditEntry> {
    const response = await apiClient.get(`/api/audit/logs/${entryId}`);
    return response.data;
  }

  async exportAuditLogs(request: AuditExportRequest): Promise<Blob> {
    const response = await apiClient.post("/api/audit/logs/export", request);
    return response.data;
  }

  async getAuditStatistics(startDate: string, endDate: string): Promise<AuditStatistics> {
    const response = await apiClient.get("/api/audit/statistics", { 
      start_date: startDate, 
      end_date: endDate 
    });
    return response.data;
  }

  // Session endpoints
  async getUserSessions(userId?: string, activeOnly: boolean = true): Promise<AuditSession[]> {
    const params: Record<string, string> = { active_only: activeOnly.toString() };
    if (userId) params.user_id = userId;
    
    const response = await apiClient.get("/api/audit/sessions", params);
    return response.data;
  }

  async endSession(sessionId: string): Promise<void> {
    await apiClient.post(`/api/audit/sessions/${sessionId}/end`);
  }

  // Alert endpoints
  async getAlerts(status?: AlertStatus, assignedTo?: string): Promise<AuditAlert[]> {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (assignedTo) params.assigned_to = assignedTo;
    
    const response = await apiClient.get("/api/audit/alerts", params);
    return response.data;
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    await apiClient.post(`/api/audit/alerts/${alertId}/acknowledge`);
  }

  async resolveAlert(alertId: string, resolutionNotes: string): Promise<void> {
    await apiClient.post(`/api/audit/alerts/${alertId}/resolve`, {
      resolution_notes: resolutionNotes
    });
  }

  // Report endpoints
  async createAuditReport(report: Omit<AuditReport, "id" | "created_at">): Promise<AuditReport> {
    const response = await apiClient.post("/api/audit/reports", report);
    return response.data;
  }

  async getAuditReports(): Promise<AuditReport[]> {
    const response = await apiClient.get("/api/audit/reports");
    return response.data;
  }

  async runAuditReport(reportId: string): Promise<AuditReportResult> {
    const response = await apiClient.post(`/api/audit/reports/${reportId}/run`);
    return response.data;
  }

  // Compliance endpoints
  async getComplianceRequirements(standard?: string): Promise<ComplianceRequirement[]> {
    const params: Record<string, string> = standard ? { standard } : {};
    const response = await apiClient.get("/api/audit/compliance/requirements", params);
    return response.data;
  }

  async assessCompliance(requirementId: string): Promise<any> {
    const response = await apiClient.post(`/api/audit/compliance/requirements/${requirementId}/assess`);
    return response.data;
  }

  async getComplianceDashboard(): Promise<any> {
    const response = await apiClient.get("/api/audit/compliance/dashboard");
    return response.data;
  }

  // Policy endpoints
  async getAuditPolicies(activeOnly: boolean = true): Promise<AuditPolicy[]> {
    const response = await apiClient.get("/api/audit/policies", { 
      active_only: activeOnly.toString() 
    });
    return response.data;
  }

  async createAuditPolicy(policy: Omit<AuditPolicy, "id" | "created_at">): Promise<AuditPolicy> {
    const response = await apiClient.post("/api/audit/policies", policy);
    return response.data;
  }

  // Retention endpoints
  async getRetentionStatistics(): Promise<any> {
    const response = await apiClient.get("/api/audit/retention/statistics");
    return response.data;
  }

  async applyRetentionPolicies(): Promise<any> {
    const response = await apiClient.post("/api/audit/retention/apply");
    return response.data;
  }

  // Helper functions
  formatAuditEntry(entry: AuditEntry): string {
    const actor = entry.actor_id || "System";
    const resource = entry.resource_name || entry.resource_id || "resource";
    const action = entry.action.replace(/_/g, " ");
    
    return `${actor} ${action} ${resource}`;
  }

  getSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
      low: "text-gray-500",
      medium: "text-yellow-500",
      high: "text-orange-500",
      critical: "text-red-500",
      info: "text-blue-500",
      warning: "text-yellow-500",
      error: "text-red-500"
    };
    return colors[severity.toLowerCase()] || "text-gray-500";
  }

  getEventTypeLabel(eventType: string): string {
    return eventType
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
}

const auditService = new AuditService();
export default auditService;