'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/CustomToast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  Clock,
  Calendar,
  DollarSign,
  Tag,
  Edit,
  Trash2,
  Check,
  X,
  Filter,
  Download,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import timeTrackingService from '@/services/timeTrackingService';
import {
  TimeEntry,
  TimeEntryStatus,
  TimeEntryFilter,
  TimeEntrySummary
} from '@/types/time-tracking';

interface TimeEntryListProps {
  userId?: string;
  taskId?: string;
  projectId?: string;
  showFilters?: boolean;
  showSummary?: boolean;
  onEntryUpdated?: () => void;
}

export const TimeEntryList: React.FC<TimeEntryListProps> = ({
  userId,
  taskId,
  projectId,
  showFilters = true,
  showSummary = true,
  onEntryUpdated
}) => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TimeEntryFilter>({
    user_ids: userId ? [userId] : undefined,
    task_ids: taskId ? [taskId] : undefined,
    project_ids: projectId ? [projectId] : undefined
  });
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [deleteConfirmEntry, setDeleteConfirmEntry] = useState<TimeEntry | null>(null);
  const [summary, setSummary] = useState<TimeEntrySummary | null>(null);

  useEffect(() => {
    loadEntries();
  }, [filter]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const data = await timeTrackingService.getTimeEntries(filter);
      setEntries(data);
      
      if (showSummary && data.length > 0) {
        calculateSummary(data);
      }
    } catch (error) {
      console.error('Failed to load time entries:', error);
      toast.error('Failed to load time entries');
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (entries: TimeEntry[]) => {
    const totalMinutes = entries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
    const billableMinutes = entries
      .filter(e => e.billable)
      .reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
    const totalCost = entries.reduce((sum, e) => sum + (e.total_cost || 0), 0);

    setSummary({
      total_entries: entries.length,
      total_hours: totalMinutes / 60,
      billable_hours: billableMinutes / 60,
      non_billable_hours: (totalMinutes - billableMinutes) / 60,
      total_cost: totalCost,
      average_entry_duration: totalMinutes / entries.length / 60
    });
  };

  const handleDelete = async (entry: TimeEntry) => {
    try {
      await timeTrackingService.deleteTimeEntry(entry.id);
      toast.success('Time entry deleted');
      loadEntries();
      if (onEntryUpdated) onEntryUpdated();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete time entry');
    } finally {
      setDeleteConfirmEntry(null);
    }
  };

  const handleApprove = async (entryId: string) => {
    try {
      await timeTrackingService.approveTimeEntry(entryId);
      toast.success('Time entry approved');
      loadEntries();
      if (onEntryUpdated) onEntryUpdated();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to approve time entry');
    }
  };

  const toggleExpanded = (entryId: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  const getStatusBadge = (status: TimeEntryStatus) => {
    const variants: Record<TimeEntryStatus, 'secondary' | 'warning' | 'success' | 'error' | 'info'> = {
      [TimeEntryStatus.DRAFT]: 'secondary',
      [TimeEntryStatus.SUBMITTED]: 'warning',
      [TimeEntryStatus.APPROVED]: 'success',
      [TimeEntryStatus.REJECTED]: 'error',
      [TimeEntryStatus.BILLED]: 'info'
    };

    return (
      <Badge variant={variants[status]}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-primary flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilter({
                user_ids: userId ? [userId] : undefined,
                task_ids: taskId ? [taskId] : undefined,
                project_ids: projectId ? [projectId] : undefined
              });
            }}
          >
            Clear
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <DatePicker
              value={filter.start_date ? new Date(filter.start_date) : null}
              onChange={(date) => setFilter({ ...filter, start_date: date?.toISOString().split('T')[0] })}
              placeholder="Start date"
            />
          </div>
          <div>
            <DatePicker
              value={filter.end_date ? new Date(filter.end_date) : null}
              onChange={(date) => setFilter({ ...filter, end_date: date?.toISOString().split('T')[0] })}
              placeholder="End date"
            />
          </div>
          <div>
            <Select
              value={filter.status?.[0] || undefined}
              onValueChange={(value) => setFilter({ 
                ...filter, 
                status: value ? [value as TimeEntryStatus] : undefined 
              })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(TimeEntryStatus).map(status => (
                  <SelectItem key={status} value={status}>
                    {status.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>
    );
  };

  const renderSummary = () => {
    if (!showSummary || !summary) return null;

    return (
      <Card className="p-4 mb-4 bg-accent/5 border-accent/20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted uppercase tracking-wider">Total Time</p>
            <p className="text-lg font-semibold text-primary">
              {timeTrackingService.formatDuration(summary.total_hours * 60)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted uppercase tracking-wider">Billable</p>
            <p className="text-lg font-semibold text-success">
              {timeTrackingService.formatDuration(summary.billable_hours * 60)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted uppercase tracking-wider">Total Cost</p>
            <p className="text-lg font-semibold text-primary">
              ${summary.total_cost.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted uppercase tracking-wider">Avg Duration</p>
            <p className="text-lg font-semibold text-primary">
              {timeTrackingService.formatDuration(summary.average_entry_duration * 60)}
            </p>
          </div>
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {showFilters && <Skeleton height="120px" />}
        {showSummary && <Skeleton height="80px" />}
        <Skeleton height="200px" />
        <Skeleton height="200px" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {renderFilters()}
      {renderSummary()}

      {entries.length === 0 ? (
        <Card className="p-12 text-center">
          <Clock className="h-12 w-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-primary mb-2">No time entries found</h3>
          <p className="text-secondary">
            {filter.start_date || filter.end_date 
              ? 'Try adjusting your filters'
              : 'Start tracking time to see entries here'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Card 
              key={entry.id} 
              className="p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-primary">
                        {entry.description}
                      </h4>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-secondary">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {timeTrackingService.formatDate(entry.start_time)}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {timeTrackingService.formatTime(entry.start_time)} - {entry.end_time ? timeTrackingService.formatTime(entry.end_time) : 'In progress'}
                        </span>
                        <span className="font-medium text-primary">
                          {timeTrackingService.formatDuration(entry.duration_minutes || 0)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(entry.status)}
                      {entry.billable && (
                        <Badge variant="success" size="sm">
                          <DollarSign className="h-3 w-3 mr-1" />
                          Billable
                        </Badge>
                      )}
                    </div>
                  </div>

                  {entry.tags.length > 0 && (
                    <div className="flex items-center space-x-2 mb-2">
                      <Tag className="h-3 w-3 text-muted" />
                      {entry.tags.map(tag => (
                        <span 
                          key={tag}
                          className="text-xs px-2 py-1 bg-secondary rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {expandedEntries.has(entry.id) && (
                    <div className="mt-3 pt-3 border-t border-secondary space-y-2 text-sm">
                      {entry.notes && (
                        <div>
                          <span className="text-muted">Notes:</span> {entry.notes}
                        </div>
                      )}
                      {entry.total_cost && (
                        <div>
                          <span className="text-muted">Cost:</span> ${entry.total_cost.toFixed(2)}
                          {entry.rate_per_hour && (
                            <span className="text-muted"> (${entry.rate_per_hour}/hr)</span>
                          )}
                        </div>
                      )}
                      {entry.approved_by && (
                        <div>
                          <span className="text-muted">Approved by:</span> {entry.approved_by}
                          {entry.approved_at && (
                            <span className="text-muted"> on {timeTrackingService.formatDate(entry.approved_at)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(entry.id)}
                  >
                    {expandedEntries.has(entry.id) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                  
                  {entry.status === TimeEntryStatus.SUBMITTED && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleApprove(entry.id)}
                      title="Approve"
                    >
                      <Check className="h-4 w-4 text-success" />
                    </Button>
                  )}
                  
                  {entry.status === TimeEntryStatus.DRAFT && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingEntry(entry.id)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmEntry(entry)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-error" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteConfirmEntry}
        onClose={() => setDeleteConfirmEntry(null)}
        onConfirm={() => deleteConfirmEntry && handleDelete(deleteConfirmEntry)}
        title="Delete Time Entry"
        description={`Are you sure you want to delete this ${deleteConfirmEntry?.duration_minutes ? timeTrackingService.formatDuration(deleteConfirmEntry.duration_minutes) : ''} time entry?`}
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};