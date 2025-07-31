"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Activity,
  AlertCircle,
  Shield,
  FileText,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { DatePicker } from "@/components/ui/DatePicker";
import auditService from "@/services/auditService";
import {
  AuditEntry,
  AuditSearchRequest,
  AuditSearchResult,
  AuditEventType,
  AuditSeverity,
  AuditExportRequest
} from "@/types/audit";
import { toast } from "sonner";
import { format } from "date-fns";

interface AuditLogProps {
  resourceType?: string;
  resourceId?: string;
  userId?: string;
}

export function AuditLog({ resourceType, resourceId, userId }: AuditLogProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0
  });

  // Search filters
  const [searchFilters, setSearchFilters] = useState<AuditSearchRequest>({
    query: "",
    event_types: [],
    severity_levels: [],
    start_date: undefined,
    end_date: undefined,
    resource_types: resourceType ? [resourceType] : [],
    resource_ids: resourceId ? [resourceId] : [],
    actor_ids: userId ? [userId] : [],
    page: 1,
    per_page: 20,
    sort_by: "timestamp",
    sort_order: "desc"
  });

  // Export options
  const [exportFormat, setExportFormat] = useState<"json" | "csv" | "pdf">("csv");

  useEffect(() => {
    searchAuditLogs();
  }, [searchFilters.page]);

  const searchAuditLogs = async () => {
    try {
      setLoading(true);
      const result = await auditService.searchAuditLogs(searchFilters);
      setEntries(result.entries);
      setPagination({
        page: result.page,
        per_page: result.per_page,
        total: result.total,
        pages: result.pages
      });
    } catch (error) {
      console.error("Failed to search audit logs:", error);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setSearchFilters({ ...searchFilters, page: 1 });
    searchAuditLogs();
  };

  const handleExport = async () => {
    try {
      const exportRequest: AuditExportRequest = {
        filters: searchFilters,
        format: exportFormat,
        include_metadata: true
      };
      
      const blob = await auditService.exportAuditLogs(exportRequest);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${format(new Date(), "yyyy-MM-dd")}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setShowExportDialog(false);
      toast.success("Audit log exported successfully");
    } catch (error) {
      console.error("Failed to export audit logs:", error);
      toast.error("Failed to export audit logs");
    }
  };

  const viewEntryDetails = async (entry: AuditEntry) => {
    try {
      const fullEntry = await auditService.getAuditEntry(entry.id);
      setSelectedEntry(fullEntry);
      setShowDetailsDialog(true);
    } catch (error) {
      console.error("Failed to load entry details:", error);
      toast.error("Failed to load entry details");
    }
  };

  const getEventIcon = (eventType: AuditEventType) => {
    switch (eventType) {
      case AuditEventType.LOGIN_SUCCESS:
      case AuditEventType.LOGIN_FAILURE:
        return <User className="h-4 w-4" />;
      case AuditEventType.PERMISSION_GRANTED:
      case AuditEventType.PERMISSION_REVOKED:
        return <Shield className="h-4 w-4" />;
      case AuditEventType.DATA_EXPORTED:
        return <Download className="h-4 w-4" />;
      case AuditEventType.SECURITY_ALERT:
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getSeverityBadge = (severity: AuditSeverity) => {
    const variants: Record<AuditSeverity, "default" | "secondary" | "destructive" | "outline"> = {
      [AuditSeverity.LOW]: "outline",
      [AuditSeverity.MEDIUM]: "secondary",
      [AuditSeverity.HIGH]: "destructive",
      [AuditSeverity.CRITICAL]: "destructive",
      [AuditSeverity.INFO]: "default",
      [AuditSeverity.WARNING]: "secondary",
      [AuditSeverity.ERROR]: "destructive"
    };
    
    return (
      <Badge variant={variants[severity]}>
        {severity}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Audit Log</h2>
          <p className="text-muted-foreground">
            View and search system audit trail
          </p>
        </div>
        <Button onClick={() => setShowExportDialog(true)}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Search Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search logs..."
                value={searchFilters.query}
                onChange={(e) => setSearchFilters({ ...searchFilters, query: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-type">Event Type</Label>
              <Select
                value={searchFilters.event_types?.[0] || "all"}
                onValueChange={(value) => 
                  setSearchFilters({ 
                    ...searchFilters, 
                    event_types: value === "all" ? [] : [value as AuditEventType]
                  })
                }
              >
                <SelectTrigger id="event-type">
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  {Object.values(AuditEventType).map(type => (
                    <SelectItem key={type} value={type}>
                      {auditService.getEventTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select
                value={searchFilters.severity_levels?.[0] || "all"}
                onValueChange={(value) => 
                  setSearchFilters({ 
                    ...searchFilters, 
                    severity_levels: value === "all" ? [] : [value as AuditSeverity]
                  })
                }
              >
                <SelectTrigger id="severity">
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities</SelectItem>
                  {Object.values(AuditSeverity).map(severity => (
                    <SelectItem key={severity} value={severity}>
                      {severity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="flex space-x-2">
                <DatePicker
                  value={searchFilters.start_date ? new Date(searchFilters.start_date) : null}
                  onChange={(date) => 
                    setSearchFilters({ 
                      ...searchFilters, 
                      start_date: date?.toISOString() 
                    })
                  }
                />
                <DatePicker
                  value={searchFilters.end_date ? new Date(searchFilters.end_date) : null}
                  onChange={(date) => 
                    setSearchFilters({ 
                      ...searchFilters, 
                      end_date: date?.toISOString() 
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No audit entries found
                  </TableCell>
                </TableRow>
              ) : (
                entries.map(entry => (
                  <TableRow key={entry.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      {format(new Date(entry.timestamp), "PPp")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getEventIcon(entry.event_type)}
                        <span>{auditService.getEventTypeLabel(entry.event_type)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{entry.actor_id || "System"}</TableCell>
                    <TableCell>
                      {entry.resource_name || entry.resource_id || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.result === "success" ? "default" : "destructive"}>
                        {entry.result}
                      </Badge>
                    </TableCell>
                    <TableCell>{getSeverityBadge(entry.severity)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewEntryDetails(entry)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.per_page + 1} to{" "}
            {Math.min(pagination.page * pagination.per_page, pagination.total)} of{" "}
            {pagination.total} entries
          </p>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchFilters({ ...searchFilters, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchFilters({ ...searchFilters, page: pagination.page + 1 })}
              disabled={pagination.page === pagination.pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Entry Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Entry Details</DialogTitle>
            <DialogDescription>
              Complete information about this audit event
            </DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="changes">Changes</TabsTrigger>
                <TabsTrigger value="context">Context</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label className="text-muted-foreground">Event ID</Label>
                    <p className="font-mono text-sm">{selectedEntry.id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Timestamp</Label>
                    <p>{format(new Date(selectedEntry.timestamp), "PPPpp")}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Event Type</Label>
                    <div className="flex items-center space-x-2">
                      {getEventIcon(selectedEntry.event_type)}
                      <span>{auditService.getEventTypeLabel(selectedEntry.event_type)}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Actor</Label>
                    <p>{selectedEntry.actor_id || "System"} ({selectedEntry.actor_type})</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Action</Label>
                    <p>{selectedEntry.action}</p>
                  </div>
                  {selectedEntry.error_message && (
                    <div>
                      <Label className="text-muted-foreground">Error Message</Label>
                      <p className="text-red-600">{selectedEntry.error_message}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="changes" className="space-y-4">
                {selectedEntry.changes ? (
                  <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
                    {JSON.stringify(selectedEntry.changes, null, 2)}
                  </pre>
                ) : (
                  <p className="text-muted-foreground">No changes recorded</p>
                )}
              </TabsContent>

              <TabsContent value="context" className="space-y-4">
                {selectedEntry.context ? (
                  <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
                    {JSON.stringify(selectedEntry.context, null, 2)}
                  </pre>
                ) : (
                  <p className="text-muted-foreground">No context data</p>
                )}
                {selectedEntry.compliance_tags.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground mb-2">Compliance Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedEntry.compliance_tags.map(tag => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Audit Logs</DialogTitle>
            <DialogDescription>
              Export the filtered audit logs
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="export-format">Export Format</Label>
              <Select
                value={exportFormat}
                onValueChange={(value) => setExportFormat(value as "json" | "csv" | "pdf")}
              >
                <SelectTrigger id="export-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>Current filters will be applied to the export:</p>
              <ul className="list-disc list-inside mt-2">
                {searchFilters.query && <li>Search: {searchFilters.query}</li>}
                {searchFilters.event_types && searchFilters.event_types.length > 0 && (
                  <li>Event types: {searchFilters.event_types.join(", ")}</li>
                )}
                {searchFilters.severity_levels && searchFilters.severity_levels.length > 0 && (
                  <li>Severities: {searchFilters.severity_levels.join(", ")}</li>
                )}
                {searchFilters.start_date && (
                  <li>From: {format(new Date(searchFilters.start_date), "PP")}</li>
                )}
                {searchFilters.end_date && (
                  <li>To: {format(new Date(searchFilters.end_date), "PP")}</li>
                )}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}