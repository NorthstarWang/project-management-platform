'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CustomDialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/CustomDialog';
import { toast } from '@/components/ui/CustomToast';
import {
  Calendar,
  Check,
  X,
  Clock,
  AlertCircle,
  FileText,
  Send,
  Eye,
  Download,
  Filter,
  Search,
  ChevronRight,
  MessageCircle,
  CheckCircle,
  XCircle,
  Loader2,
  DollarSign
} from 'lucide-react';
import timeTrackingService from '@/services/timeTrackingService';
import { TimeEntryList } from './TimeEntryList';
import {
  TimeSheet,
  TimeEntryStatus,
  TimeEntry,
  ReportType
} from '@/types/time-tracking';

interface TimeSheetManagerProps {
  userId?: string;
  isManager?: boolean;
  teamId?: string;
}

export const TimeSheetManager: React.FC<TimeSheetManagerProps> = ({
  userId,
  isManager = false,
  teamId
}) => {
  const [timesheets, setTimesheets] = useState<TimeSheet[]>([]);
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimeSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<TimeEntryStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [createTimesheetForm, setCreateTimesheetForm] = useState({
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    loadTimesheets();
  }, [userId, isManager, teamId, filter]);

  const loadTimesheets = async () => {
    try {
      setLoading(true);
      
      let data: TimeSheet[];
      if (isManager && teamId) {
        // Load team timesheets for approval
        data = await timeTrackingService.getTeamTimesheets(teamId);
      } else if (userId) {
        // Load user's own timesheets
        data = await timeTrackingService.getMyTimesheets();
      } else {
        data = [];
      }

      // Apply filter
      if (filter !== 'all') {
        data = data.filter(ts => ts.status === filter);
      }

      // Apply search
      if (searchQuery) {
        data = data.filter(ts => 
          ts.comments?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setTimesheets(data);
    } catch (error) {
      console.error('Failed to load timesheets:', error);
      toast.error('Failed to load timesheets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTimesheet = async () => {
    try {
      await timeTrackingService.createTimesheet(
        createTimesheetForm.start_date,
        createTimesheetForm.end_date
      );
      toast.success('Timesheet created successfully');
      setShowCreateDialog(false);
      setCreateTimesheetForm({ start_date: '', end_date: '' });
      loadTimesheets();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create timesheet');
    }
  };

  const handleSubmitTimesheet = async (timesheetId: string) => {
    try {
      setSubmitting(true);
      await timeTrackingService.submitTimesheet(timesheetId);
      toast.success('Timesheet submitted for approval');
      loadTimesheets();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to submit timesheet');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveTimesheet = async (timesheetId: string) => {
    try {
      setSubmitting(true);
      await timeTrackingService.approveTimesheet(timesheetId, approvalComment || undefined);
      toast.success('Timesheet approved');
      setApprovalComment('');
      setShowDetailsModal(false);
      loadTimesheets();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to approve timesheet');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectTimesheet = async (timesheetId: string) => {
    if (!approvalComment.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setSubmitting(true);
      await timeTrackingService.rejectTimesheet(timesheetId, approvalComment);
      toast.success('Timesheet rejected');
      setApprovalComment('');
      setShowDetailsModal(false);
      loadTimesheets();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to reject timesheet');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportTimesheet = async (timesheetId: string) => {
    try {
      const report = await timeTrackingService.generateReport({
        report_type: ReportType.TIMESHEET,
        name: `Timesheet Export - ${new Date().toLocaleDateString()}`,
        parameters: {
          timesheet_id: timesheetId
        },
        format: 'csv'
      });
      
      // In a real app, this would trigger a download
      toast.success('Timesheet exported successfully');
      console.log('Exported timesheet:', report);
    } catch (error) {
      toast.error('Failed to export timesheet');
    }
  };

  const getStatusBadge = (status: TimeEntryStatus) => {
    const config = {
      [TimeEntryStatus.DRAFT]: { variant: 'default' as const, icon: FileText },
      [TimeEntryStatus.SUBMITTED]: { variant: 'warning' as const, icon: Send },
      [TimeEntryStatus.APPROVED]: { variant: 'success' as const, icon: CheckCircle },
      [TimeEntryStatus.REJECTED]: { variant: 'error' as const, icon: XCircle },
      [TimeEntryStatus.BILLED]: { variant: 'info' as const, icon: DollarSign }
    };

    const { variant, icon: Icon } = config[status];

    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const renderTimesheetCard = (timesheet: TimeSheet) => {
    const isEditable = timesheet.status === TimeEntryStatus.DRAFT;
    const canApprove = isManager && timesheet.status === TimeEntryStatus.SUBMITTED;

    return (
      <Card key={timesheet.id} className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-primary">
                {timeTrackingService.formatDate(timesheet.period_start)} - {timeTrackingService.formatDate(timesheet.period_end)}
              </h3>
              {getStatusBadge(timesheet.status)}
            </div>

            {isManager && (
              <p className="text-sm text-secondary mb-2">
                User ID: <span className="font-medium text-primary">{timesheet.user_id}</span>
              </p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <p className="text-xs text-muted uppercase tracking-wider">Total Hours</p>
                <p className="text-lg font-semibold text-primary">
                  {timeTrackingService.formatDuration(timesheet.total_hours * 60)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wider">Billable</p>
                <p className="text-lg font-semibold text-success">
                  {timeTrackingService.formatDuration(timesheet.billable_hours * 60)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wider">Entries</p>
                <p className="text-lg font-semibold text-primary">{timesheet.entries.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wider">Projects</p>
                <p className="text-lg font-semibold text-primary">-</p>
              </div>
            </div>

            {timesheet.comments && (
              <p className="text-sm text-secondary mt-3 italic">&quot;{timesheet.comments}&quot;</p>
            )}

          </div>

          <div className="flex flex-col gap-2 ml-4">
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<Eye className="h-4 w-4" />}
              onClick={() => {
                setSelectedTimesheet(timesheet);
                setShowDetailsModal(true);
              }}
            >
              View Details
            </Button>

            {isEditable && !isManager && (
              <Button
                size="sm"
                variant="primary"
                leftIcon={<Send className="h-4 w-4" />}
                onClick={() => handleSubmitTimesheet(timesheet.id)}
                loading={submitting}
              >
                Submit
              </Button>
            )}

            {canApprove && (
              <>
                <Button
                  size="sm"
                  variant="primary"
                  leftIcon={<Check className="h-4 w-4" />}
                  onClick={() => {
                    setSelectedTimesheet(timesheet);
                    setShowDetailsModal(true);
                  }}
                >
                  Review
                </Button>
              </>
            )}

            <Button
              size="sm"
              variant="ghost"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={() => handleExportTimesheet(timesheet.id)}
            >
              Export
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  const renderDetailsModal = () => {
    if (!selectedTimesheet || !showDetailsModal) return null;

    const canApprove = isManager && selectedTimesheet.status === TimeEntryStatus.SUBMITTED;

    return (
      <div className="fixed inset-0 bg-background-overlay z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-secondary">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-primary">Timesheet Details</h2>
                <p className="text-sm text-secondary mt-1">
                  {timeTrackingService.formatDate(selectedTimesheet.period_start)} - {timeTrackingService.formatDate(selectedTimesheet.period_end)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowDetailsModal(false);
                  setApprovalComment('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-primary">Summary</h3>
                {getStatusBadge(selectedTimesheet.status)}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-xs text-muted uppercase tracking-wider">Total Hours</p>
                  <p className="text-xl font-semibold text-primary mt-1">
                    {timeTrackingService.formatDuration(selectedTimesheet.total_hours * 60)}
                  </p>
                </div>
                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-xs text-muted uppercase tracking-wider">Billable Hours</p>
                  <p className="text-xl font-semibold text-success mt-1">
                    {timeTrackingService.formatDuration(selectedTimesheet.billable_hours * 60)}
                  </p>
                </div>
                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-xs text-muted uppercase tracking-wider">Billable %</p>
                  <p className="text-xl font-semibold text-primary mt-1">
                    {selectedTimesheet.total_hours > 0 
                      ? ((selectedTimesheet.billable_hours / selectedTimesheet.total_hours) * 100).toFixed(0)
                      : 0}%
                  </p>
                </div>
                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-xs text-muted uppercase tracking-wider">Entries</p>
                  <p className="text-xl font-semibold text-primary mt-1">
                    {selectedTimesheet.entries.length}
                  </p>
                </div>
              </div>
            </div>

            {selectedTimesheet.comments && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-primary mb-2">Comments</h3>
                <p className="text-secondary">{selectedTimesheet.comments}</p>
              </div>
            )}

            <div>
              <h3 className="text-lg font-medium text-primary mb-4">Time Entries</h3>
              <TimeEntryList
                userId={selectedTimesheet.user_id}
                showFilters={false}
                showSummary={false}
              />
            </div>
          </div>

          {canApprove && (
            <div className="p-6 border-t border-secondary">
              <div className="mb-4">
                <label className="block text-sm font-medium text-primary mb-2">
                  <MessageCircle className="h-4 w-4 inline mr-1" />
                  Approval Comment (Optional for approval, required for rejection)
                </label>
                <Input
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full"
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setApprovalComment('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  leftIcon={<X className="h-4 w-4" />}
                  onClick={() => handleRejectTimesheet(selectedTimesheet.id)}
                  loading={submitting}
                >
                  Reject
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<Check className="h-4 w-4" />}
                  onClick={() => handleApproveTimesheet(selectedTimesheet.id)}
                  loading={submitting}
                >
                  Approve
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary">
            {isManager ? 'Team Timesheets' : 'My Timesheets'}
          </h2>
          <p className="text-sm text-secondary mt-1">
            {isManager ? 'Review and approve team timesheets' : 'Manage your timesheet submissions'}
          </p>
        </div>

        {!isManager && (
          <Button
            leftIcon={<Calendar className="h-4 w-4" />}
            onClick={() => setShowCreateDialog(true)}
          >
            Create Timesheet
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search timesheets..."
                className="pl-10"
              />
            </div>
          </div>
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as TimeEntryStatus | 'all')}
            className="w-full md:w-48 h-10 px-3 py-2 text-sm rounded-md border border-input bg-input text-input cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2"
          >
            <option value="all">All Status</option>
            <option value={TimeEntryStatus.DRAFT}>Draft</option>
            <option value={TimeEntryStatus.SUBMITTED}>Submitted</option>
            <option value={TimeEntryStatus.APPROVED}>Approved</option>
            <option value={TimeEntryStatus.REJECTED}>Rejected</option>
            <option value={TimeEntryStatus.BILLED}>Billed</option>
          </select>
        </div>
      </Card>

      {/* Timesheets List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : timesheets.length === 0 ? (
        <Card className="p-12 text-center">
          <Clock className="h-12 w-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-primary mb-2">No Timesheets Found</h3>
          <p className="text-secondary">
            {filter !== 'all' 
              ? 'No timesheets match your current filter.'
              : isManager 
                ? 'No timesheets require your review.'
                : 'Create your first timesheet to get started.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {timesheets.map(renderTimesheetCard)}
        </div>
      )}

      {/* Create Timesheet Dialog */}
      <CustomDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Timesheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-secondary">Select the period for your timesheet</p>
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Period Start Date
              </label>
              <Input
                type="date"
                value={createTimesheetForm.start_date}
                onChange={(e) => setCreateTimesheetForm({ ...createTimesheetForm, start_date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Period End Date
              </label>
              <Input
                type="date"
                value={createTimesheetForm.end_date}
                onChange={(e) => setCreateTimesheetForm({ ...createTimesheetForm, end_date: e.target.value })}
                min={createTimesheetForm.start_date}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTimesheet}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </CustomDialog>

      {/* Details Modal */}
      {renderDetailsModal()}
    </div>
  );
};