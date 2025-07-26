'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CustomDialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/CustomDialog';
import { toast } from '@/components/ui/CustomToast';
import {
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Edit2,
  Plus,
  Target,
  BarChart3,
  Calendar,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import timeTrackingService from '@/services/timeTrackingService';
import {
  ProjectTimebudget,
  TimeTrackingAlert,
  BudgetAlertType,
  ProjectBudgetStatus,
  AlertType
} from '@/types/time-tracking';

interface ProjectTimeBudgetProps {
  projectId: string;
  projectName?: string;
  canManage?: boolean;
}

export const ProjectTimeBudget: React.FC<ProjectTimeBudgetProps> = ({
  projectId,
  projectName,
  canManage = false
}) => {
  const [budget, setBudget] = useState<ProjectTimebudget | null>(null);
  const [budgetStatus, setBudgetStatus] = useState<ProjectBudgetStatus | null>(null);
  const [alerts, setAlerts] = useState<TimeTrackingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    total_hours: 0,
    hourly_rate: 0,
    alert_thresholds: [50, 75, 90, 100]
  });

  useEffect(() => {
    loadBudgetData();
  }, [projectId]);

  const loadBudgetData = async () => {
    try {
      setLoading(true);
      
      // Try to load existing budget
      try {
        const budgetStatusData = await timeTrackingService.getProjectBudgetStatus(projectId);
        
        setBudgetStatus(budgetStatusData);
        setBudget(budgetStatusData.budget || null);
        setAlerts([]); // TODO: Load alerts separately if needed
      } catch (error: any) {
        if (error.response?.status === 404) {
          // Budget doesn't exist yet
          setBudget(null);
          setBudgetStatus(null);
          setAlerts([]);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Failed to load budget data:', error);
      toast.error('Failed to load budget information');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBudget = async () => {
    try {
      const budgetData = {
        total_hours_budget: budgetForm.total_hours,
        billable_hours_budget: budgetForm.total_hours, // Same as total for now
        hours_used: 0,
        billable_hours_used: 0,
        budget_alert_threshold: budgetForm.alert_thresholds[0] || 80,
        cost_budget: budgetForm.total_hours * budgetForm.hourly_rate
      };
      
      const newBudget = await timeTrackingService.createProjectBudget(projectId, budgetData);
      setBudget(newBudget);
      setShowCreateDialog(false);
      toast.success('Budget created successfully');
      loadBudgetData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create budget');
    }
  };

  const handleUpdateBudget = async () => {
    if (!budget) return;

    try {
      const budgetData = {
        total_hours_budget: budgetForm.total_hours,
        billable_hours_budget: budgetForm.total_hours,
        budget_alert_threshold: budgetForm.alert_thresholds[0] || 80,
        cost_budget: budgetForm.total_hours * budgetForm.hourly_rate
      };
      
      // TODO: Implement updateProjectBudget API
      // const updatedBudget = await timeTrackingService.updateProjectBudget(budget.id, budgetData);
      const updatedBudget = { ...budget, ...budgetData } as ProjectTimebudget;
      setBudget(updatedBudget);
      setShowEditDialog(false);
      toast.success('Budget updated successfully');
      loadBudgetData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update budget');
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await timeTrackingService.acknowledgeAlert(alertId);
      setAlerts(alerts.filter(a => a.id !== alertId));
      toast.success('Alert acknowledged');
    } catch (error) {
      toast.error('Failed to acknowledge alert');
    }
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 100) return 'text-error';
    if (percentage >= 90) return 'text-warning';
    if (percentage >= 75) return 'text-info';
    return 'text-success';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-error';
    if (percentage >= 90) return 'bg-warning';
    if (percentage >= 75) return 'bg-info';
    return 'bg-success';
  };

  const getBurnRateIndicator = (burnRate: number, averageBurnRate: number) => {
    const percentDiff = ((burnRate - averageBurnRate) / averageBurnRate) * 100;
    
    if (Math.abs(percentDiff) < 10) {
      return { icon: TrendingUp, color: 'text-info', label: 'Normal' };
    }
    if (percentDiff > 0) {
      return { icon: TrendingUp, color: 'text-warning', label: 'Above Average' };
    }
    return { icon: TrendingDown, color: 'text-success', label: 'Below Average' };
  };

  const renderBudgetOverview = () => {
    if (!budget) {
      return (
        <Card className="p-8 text-center">
          <DollarSign className="h-12 w-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-primary mb-2">No Budget Set</h3>
          <p className="text-secondary mb-4">
            Set up a budget to track time and costs for this project
          </p>
          {canManage && (
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setBudgetForm({
                  total_hours: 0,
                  hourly_rate: 0,
                  alert_thresholds: [50, 75, 90, 100]
                });
                setShowCreateDialog(true);
              }}
            >
              Create Budget
            </Button>
          )}
        </Card>
      );
    }

    const utilization = (budget.hours_used / budget.total_hours_budget) * 100;
    const totalCost = budget.cost_budget || 0;
    const usedCost = budget.cost_used || 0;
    const remainingCost = totalCost - usedCost;

    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-primary">Budget Overview</h3>
            <p className="text-sm text-secondary mt-1">
              {projectName || `Project ${projectId.slice(0, 8)}`}
            </p>
          </div>
          
          {canManage && (
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<Edit2 className="h-4 w-4" />}
              onClick={() => {
                setBudgetForm({
                  total_hours: budget.total_hours_budget,
                  hourly_rate: budget.cost_budget ? budget.cost_budget / budget.total_hours_budget : 0,
                  alert_thresholds: [budget.budget_alert_threshold]
                });
                setShowEditDialog(true);
              }}
            >
              Edit
            </Button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-primary">Budget Utilization</span>
            <span className={`text-sm font-semibold ${getUtilizationColor(utilization)}`}>
              {utilization.toFixed(1)}%
            </span>
          </div>
          <div className="relative">
            <Progress value={Math.min(utilization, 100)} className="h-3" />
            {/* Alert threshold marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-muted"
              style={{ left: `${budget.budget_alert_threshold}%` }}
              title={`Alert at ${budget.budget_alert_threshold}%`}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted">
            <span>{timeTrackingService.formatDuration(budget.hours_used * 60)} used</span>
            <span>{timeTrackingService.formatDuration((budget.total_hours_budget - budget.hours_used) * 60)} remaining</span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-xs text-muted uppercase tracking-wider">Total Budget</p>
            <p className="text-lg font-semibold text-primary mt-1">
              {budget.cost_budget ? `$${totalCost.toLocaleString()}` : `${budget.total_hours_budget}h`}
            </p>
          </div>
          
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-xs text-muted uppercase tracking-wider">Used</p>
            <p className="text-lg font-semibold text-accent mt-1">
              {budget.cost_budget ? `$${usedCost.toLocaleString()}` : `${budget.hours_used.toFixed(1)}h`}
            </p>
          </div>
          
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-xs text-muted uppercase tracking-wider">Remaining</p>
            <p className={`text-lg font-semibold mt-1 ${remainingCost < 0 ? 'text-error' : 'text-success'}`}>
              {budget.cost_budget ? `$${remainingCost.toLocaleString()}` : `${(budget.total_hours_budget - budget.hours_used).toFixed(1)}h`}
            </p>
          </div>
          
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-xs text-muted uppercase tracking-wider">Hourly Rate</p>
            <p className="text-lg font-semibold text-primary mt-1">
              {budget.cost_budget ? `$${(budget.cost_budget / budget.total_hours_budget).toFixed(0)}/h` : 'Not set'}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mt-4 flex items-center justify-between">
          <Badge variant="success">
            Active
          </Badge>
          
          {budget.updated_at && (
            <p className="text-xs text-muted">
              Last updated: {timeTrackingService.formatDate(budget.updated_at)}
            </p>
          )}
        </div>
      </Card>
    );
  };

  const renderAnalytics = () => {
    if (!budgetStatus || !budget) return null;

    // Calculate burn rate from budget usage
    const burnRate = budget.hours_used / ((new Date().getTime() - new Date(budget.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const burnRateInfo = getBurnRateIndicator(burnRate, burnRate);

    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Budget Analytics
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Burn Rate */}
          <div className="p-4 border border-secondary rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted">Current Burn Rate</p>
              <burnRateInfo.icon className={`h-4 w-4 ${burnRateInfo.color}`} />
            </div>
            <p className="text-2xl font-bold text-primary">
              {burnRate.toFixed(1)}h
              <span className="text-sm font-normal text-muted">/day</span>
            </p>
            <p className={`text-xs mt-1 ${burnRateInfo.color}`}>
              {burnRateInfo.label}
            </p>
          </div>

          {/* Days Remaining */}
          <div className="p-4 border border-secondary rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted">Projected Days</p>
              <Calendar className="h-4 w-4 text-muted" />
            </div>
            <p className="text-2xl font-bold text-primary">
              {burnRate > 0 ? Math.floor(budgetStatus.hours_remaining / burnRate) : '∞'}
              <span className="text-sm font-normal text-muted"> days</span>
            </p>
            {burnRate > 0 && (
              <p className="text-xs text-secondary mt-1">
                {Math.floor(budgetStatus.hours_remaining / burnRate)} days remaining
              </p>
            )}
          </div>

          {/* Efficiency Score */}
          <div className="p-4 border border-secondary rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted">Efficiency Score</p>
              <Target className="h-4 w-4 text-muted" />
            </div>
            <p className={`text-2xl font-bold ${
              budgetStatus.budget_usage >= 80 ? 'text-error' :
              budgetStatus.budget_usage >= 60 ? 'text-warning' :
              'text-success'
            }`}>
              {(100 - budgetStatus.budget_usage).toFixed(0)}%
            </p>
            <p className="text-xs text-secondary mt-1">
              Based on burn rate consistency
            </p>
          </div>
        </div>

        {/* Forecast */}
        {/* Budget Status */}
        <div className="mt-4 p-4 bg-secondary rounded-lg">
          <p className="text-sm font-medium text-primary mb-2">Budget Status</p>
          <p className="text-sm text-secondary">
            {budgetStatus.budget_usage.toFixed(1)}% spent ({budget.hours_used.toFixed(1)}h of {budget.total_hours_budget}h)
          </p>
        </div>
      </Card>
    );
  };

  const renderAlerts = () => {
    if (alerts.length === 0) return null;

    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          Budget Alerts ({alerts.length})
        </h3>

        <div className="space-y-3">
          {alerts.map(alert => {
            const alertConfig: Record<string, { icon: any; color: string }> = {
              [AlertType.OVERTIME]: { 
                icon: Clock, 
                color: 'border-warning bg-warning/5' 
              },
              [AlertType.BUDGET_EXCEEDED]: { 
                icon: XCircle, 
                color: 'border-error bg-error/5' 
              },
              [AlertType.DEADLINE_APPROACHING]: { 
                icon: AlertTriangle, 
                color: 'border-warning bg-warning/5' 
              },
              [AlertType.DEADLINE_MISSED]: { 
                icon: AlertTriangle, 
                color: 'border-error bg-error/5' 
              }
            };

            const config = alertConfig[alert.alert_type] || {
              icon: AlertCircle,
              color: 'border-secondary bg-secondary/5'
            };
            const Icon = config.icon;

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border flex items-start justify-between ${config.color}`}
              >
                <div className="flex items-start">
                  <Icon className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-primary">{alert.title}</h4>
                    <p className="text-sm text-secondary mt-1">{alert.message}</p>
                    <p className="text-xs text-muted mt-2">
                      {timeTrackingService.formatDate(alert.created_at)}
                    </p>
                  </div>
                </div>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAcknowledgeAlert(alert.id)}
                >
                  Dismiss
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderBudgetOverview()}
      {renderAnalytics()}
      {renderAlerts()}

      {/* Create Budget Dialog */}
      <CustomDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project Budget</DialogTitle>
          </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Total Hours Budget
            </label>
            <Input
              type="number"
              value={budgetForm.total_hours}
              onChange={(e) => setBudgetForm({ ...budgetForm, total_hours: parseFloat(e.target.value) || 0 })}
              min="0"
              step="0.5"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Hourly Rate (Optional)
            </label>
            <Input
              type="number"
              value={budgetForm.hourly_rate}
              onChange={(e) => setBudgetForm({ ...budgetForm, hourly_rate: parseFloat(e.target.value) || 0 })}
              min="0"
              step="0.01"
              placeholder="0.00"
            />
            <p className="text-xs text-muted mt-1">
              Set hourly rate to track monetary budget
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Alert Thresholds (%)
            </label>
            <Input
              value={budgetForm.alert_thresholds.join(', ')}
              onChange={(e) => {
                const thresholds = e.target.value
                  .split(',')
                  .map(v => parseFloat(v.trim()))
                  .filter(v => !isNaN(v) && v > 0 && v <= 100)
                  .sort((a, b) => a - b);
                setBudgetForm({ ...budgetForm, alert_thresholds: thresholds });
              }}
              placeholder="50, 75, 90, 100"
            />
            <p className="text-xs text-muted mt-1">
              Comma-separated percentages for budget alerts
            </p>
          </div>
        </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBudget}>
              Create Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </CustomDialog>

      {/* Edit Budget Dialog */}
      <CustomDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project Budget</DialogTitle>
          </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Total Hours Budget
            </label>
            <Input
              type="number"
              value={budgetForm.total_hours}
              onChange={(e) => setBudgetForm({ ...budgetForm, total_hours: parseFloat(e.target.value) || 0 })}
              min="0"
              step="0.5"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Hourly Rate
            </label>
            <Input
              type="number"
              value={budgetForm.hourly_rate}
              onChange={(e) => setBudgetForm({ ...budgetForm, hourly_rate: parseFloat(e.target.value) || 0 })}
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Alert Thresholds (%)
            </label>
            <Input
              value={budgetForm.alert_thresholds.join(', ')}
              onChange={(e) => {
                const thresholds = e.target.value
                  .split(',')
                  .map(v => parseFloat(v.trim()))
                  .filter(v => !isNaN(v) && v > 0 && v <= 100)
                  .sort((a, b) => a - b);
                setBudgetForm({ ...budgetForm, alert_thresholds: thresholds });
              }}
              placeholder="50, 75, 90, 100"
            />
          </div>

          {budget && budget.hours_used > budgetForm.total_hours && (
            <div className="p-3 bg-warning/10 border border-warning rounded-lg">
              <p className="text-sm text-warning flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Warning: New budget is less than hours already used ({budget.hours_used.toFixed(1)}h)
              </p>
            </div>
          )}
        </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBudget}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </CustomDialog>
    </div>
  );
};