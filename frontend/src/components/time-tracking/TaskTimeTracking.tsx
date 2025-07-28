'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/CustomToast';
import {
  Clock,
  Target,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  History,
  BarChart
} from 'lucide-react';
import timeTrackingService from '@/services/timeTrackingService';
import {
  TaskTimeSummary,
  TaskEstimate,
  TaskProgress,
  EstimateUnit,
  ProgressMetricType
} from '@/types/time-tracking';
import { TimeTracker } from './TimeTracker';
import { TimeEntryList } from './TimeEntryList';

interface TaskTimeTrackingProps {
  taskId: string;
  taskTitle?: string;
  projectId?: string;
  canEdit?: boolean;
}

export const TaskTimeTracking: React.FC<TaskTimeTrackingProps> = ({
  taskId,
  taskTitle,
  projectId,
  canEdit = true
}) => {
  const [activeTab, setActiveTab] = useState<'timer' | 'entries' | 'progress'>('timer');
  const [summary, setSummary] = useState<TaskTimeSummary | null>(null);
  const [estimates, setEstimates] = useState<TaskEstimate[]>([]);
  const [progress, setProgress] = useState<TaskProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEstimateForm, setShowEstimateForm] = useState(false);
  const [showProgressForm, setShowProgressForm] = useState(false);
  
  // Estimate form state
  const [estimateValue, setEstimateValue] = useState('');
  const [estimateUnit, setEstimateUnit] = useState<EstimateUnit>(EstimateUnit.HOURS);
  const [estimateConfidence, setEstimateConfidence] = useState(80);
  const [estimateNotes, setEstimateNotes] = useState('');
  
  // Progress form state
  const [progressValue, setProgressValue] = useState('');
  const [progressNotes, setProgressNotes] = useState('');

  useEffect(() => {
    loadTaskData();
  }, [taskId]);

  const loadTaskData = async () => {
    try {
      setLoading(true);
      
      const [summaryData, estimatesData, progressData] = await Promise.all([
        timeTrackingService.getTaskTimeSummary(taskId),
        timeTrackingService.getTaskEstimates(taskId),
        timeTrackingService.getTaskProgress(taskId)
      ]);
      
      setSummary(summaryData);
      setEstimates(estimatesData);
      setProgress(progressData);
    } catch (error) {
      console.error('Failed to load task data:', error);
      toast.error('Failed to load task time data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEstimate = async () => {
    try {
      await timeTrackingService.createTaskEstimate(
        taskId,
        parseFloat(estimateValue),
        estimateUnit,
        estimateConfidence,
        estimateNotes
      );
      
      toast.success('Estimate created');
      setShowEstimateForm(false);
      setEstimateValue('');
      setEstimateNotes('');
      loadTaskData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create estimate');
    }
  };

  const handleUpdateProgress = async () => {
    try {
      await timeTrackingService.updateTaskProgress(taskId, {
        metric_type: ProgressMetricType.PERCENTAGE,
        current_value: parseFloat(progressValue),
        notes: progressNotes
      });
      
      toast.success('Progress updated');
      setShowProgressForm(false);
      setProgressValue('');
      setProgressNotes('');
      loadTaskData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update progress');
    }
  };

  const getVarianceColor = (percentage: number): string => {
    if (percentage <= 10) return 'text-success';
    if (percentage <= 25) return 'text-warning';
    return 'text-error';
  };

  const renderSummaryCard = () => {
    if (!summary) return null;

    const actualHours = summary.actual_minutes / 60;
    const estimatedHours = summary.estimated_minutes / 60;
    const latestProgress = progress.find(p => p.metric_type === ProgressMetricType.PERCENTAGE);

    return (
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold text-primary mb-4">Time Summary</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted mb-1">Actual Time</p>
            <p className="text-2xl font-semibold text-primary">
              {timeTrackingService.formatDuration(summary.actual_minutes)}
            </p>
            <p className="text-xs text-secondary mt-1">
              {summary.total_entries} entries by {summary.total_contributors} people
            </p>
          </div>
          
          <div>
            <p className="text-sm text-muted mb-1">Estimated Time</p>
            <p className="text-2xl font-semibold text-primary">
              {estimatedHours > 0 
                ? timeTrackingService.formatDuration(summary.estimated_minutes)
                : 'Not estimated'
              }
            </p>
            {summary.variance_percentage !== 0 && (
              <p className={`text-xs mt-1 ${getVarianceColor(Math.abs(summary.variance_percentage))}`}>
                {summary.variance_percentage > 0 ? '+' : ''}{summary.variance_percentage.toFixed(0)}% variance
              </p>
            )}
          </div>
          
          <div>
            <p className="text-sm text-muted mb-1">Progress</p>
            <div className="flex items-center space-x-3">
              <Progress 
                value={latestProgress?.percentage_complete || summary.progress} 
                className="flex-1"
              />
              <span className="text-lg font-semibold text-primary">
                {(latestProgress?.percentage_complete || summary.progress).toFixed(0)}%
              </span>
            </div>
            {latestProgress && (
              <p className="text-xs text-secondary mt-1">
                Updated {timeTrackingService.formatDate(latestProgress.updated_at)}
              </p>
            )}
          </div>
        </div>

        {summary.variance_percentage > 25 && (
          <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-md flex items-start">
            <AlertTriangle className="h-4 w-4 text-warning mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning">Time Overrun Alert</p>
              <p className="text-xs text-warning/80 mt-1">
                This task has exceeded its estimate by {summary.variance_percentage.toFixed(0)}%
              </p>
            </div>
          </div>
        )}
      </Card>
    );
  };

  const renderEstimatesSection = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-md font-medium text-primary">Estimates</h4>
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowEstimateForm(!showEstimateForm)}
          >
            Add Estimate
          </Button>
        )}
      </div>

      {showEstimateForm && (
        <Card className="p-4 mb-4 border-accent">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="estimate-value">Estimate</Label>
                <Input
                  id="estimate-value"
                  type="number"
                  value={estimateValue}
                  onChange={(e) => setEstimateValue(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="estimate-unit">Unit</Label>
                <select
                  id="estimate-unit"
                  value={estimateUnit}
                  onChange={(e) => setEstimateUnit(e.target.value as EstimateUnit)}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-input text-input cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2"
                >
                  {Object.values(EstimateUnit).map(unit => (
                    <option key={unit} value={unit}>
                      {unit.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="confidence">Confidence Level: {estimateConfidence}%</Label>
              <input
                id="confidence"
                type="range"
                min="0"
                max="100"
                step="5"
                value={estimateConfidence}
                onChange={(e) => setEstimateConfidence(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div>
              <Label htmlFor="estimate-notes">Notes</Label>
              <Input
                id="estimate-notes"
                value={estimateNotes}
                onChange={(e) => setEstimateNotes(e.target.value)}
                placeholder="Optional notes about this estimate"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEstimateForm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateEstimate}
                disabled={!estimateValue}
              >
                Save Estimate
              </Button>
            </div>
          </div>
        </Card>
      )}

      {estimates.length === 0 ? (
        <p className="text-sm text-secondary">No estimates yet</p>
      ) : (
        <div className="space-y-2">
          {estimates.map((estimate, index) => (
            <div
              key={estimate.id}
              className={`p-3 rounded-md border ${
                index === 0 ? 'border-accent bg-accent/5' : 'border-secondary'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-primary">
                    {estimate.estimated_value} {estimate.estimate_unit.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-secondary">
                    {timeTrackingService.formatDate(estimate.created_at)}
                    {estimate.confidence_level && (
                      <span className="ml-2">• {estimate.confidence_level}% confidence</span>
                    )}
                  </p>
                </div>
                {index === 0 && (
                  <Badge variant="info" size="sm">Latest</Badge>
                )}
              </div>
              {estimate.notes && (
                <p className="text-sm text-secondary mt-2">{estimate.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderProgressSection = () => {
    const latestProgress = progress.find(p => p.metric_type === ProgressMetricType.PERCENTAGE);
    
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium text-primary">Progress Updates</h4>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowProgressForm(!showProgressForm)}
            >
              Update Progress
            </Button>
          )}
        </div>

        {showProgressForm && (
          <Card className="p-4 mb-4 border-accent">
            <div className="space-y-3">
              <div>
                <Label htmlFor="progress-value">Progress Percentage</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="progress-value"
                    type="number"
                    min="0"
                    max="100"
                    value={progressValue}
                    onChange={(e) => setProgressValue(e.target.value)}
                    placeholder={latestProgress?.percentage_complete.toString() || '0'}
                  />
                  <span className="text-primary">%</span>
                </div>
              </div>
              
              <div>
                <Label htmlFor="progress-notes">Notes</Label>
                <Input
                  id="progress-notes"
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                  placeholder="What was accomplished?"
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProgressForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleUpdateProgress}
                  disabled={!progressValue}
                >
                  Update Progress
                </Button>
              </div>
            </div>
          </Card>
        )}

        {progress.length === 0 ? (
          <p className="text-sm text-secondary">No progress updates yet</p>
        ) : (
          <div className="space-y-2">
            {progress
              .filter(p => p.metric_type === ProgressMetricType.PERCENTAGE)
              .map((update, index) => (
                <div
                  key={update.id}
                  className={`p-3 rounded-md border ${
                    index === 0 ? 'border-accent bg-accent/5' : 'border-secondary'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <Progress value={update.percentage_complete} className="w-24" />
                      <span className="font-medium text-primary">
                        {update.percentage_complete.toFixed(0)}%
                      </span>
                    </div>
                    <span className="text-xs text-secondary">
                      {timeTrackingService.formatDate(update.updated_at)}
                    </span>
                  </div>
                  {update.notes && (
                    <p className="text-sm text-secondary">{update.notes}</p>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton height="200px" />
        <Skeleton height="400px" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {taskTitle && (
        <div className="flex items-center space-x-2 text-sm text-secondary">
          <span>Time tracking for:</span>
          <span className="font-medium text-primary">{taskTitle}</span>
        </div>
      )}

      {renderSummaryCard()}

      <div className="border-b border-secondary">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('timer')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'timer'
                ? 'border-accent text-accent font-medium'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            <Clock className="h-4 w-4 inline mr-2" />
            Timer
          </button>
          <button
            onClick={() => setActiveTab('entries')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'entries'
                ? 'border-accent text-accent font-medium'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            <History className="h-4 w-4 inline mr-2" />
            Time Entries
          </button>
          <button
            onClick={() => setActiveTab('progress')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'progress'
                ? 'border-accent text-accent font-medium'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            <BarChart className="h-4 w-4 inline mr-2" />
            Estimates & Progress
          </button>
        </div>
      </div>

      <div className="mt-6">
        {activeTab === 'timer' && (
          <TimeTracker
            taskId={taskId}
            projectId={projectId}
            onTimeEntryCreated={loadTaskData}
          />
        )}
        
        {activeTab === 'entries' && (
          <TimeEntryList
            taskId={taskId}
            showFilters={false}
            showSummary={false}
            onEntryUpdated={loadTaskData}
          />
        )}
        
        {activeTab === 'progress' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              {renderEstimatesSection()}
            </Card>
            <Card className="p-6">
              {renderProgressSection()}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};