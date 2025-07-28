'use client';

import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { TeamVelocity } from '@/types/time-tracking';

interface VelocityChartProps {
  velocities: TeamVelocity[];
  height?: number;
  showTrend?: boolean;
}

export const VelocityChart: React.FC<VelocityChartProps> = ({
  velocities,
  height = 300,
  showTrend = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Handle missing or invalid velocities data inside useEffect
    if (!velocities || !Array.isArray(velocities)) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (velocities.length === 0) {
      // Draw "No data" message
      ctx.fillStyle = '#6B7280';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No velocity data available', canvas.width / 2, canvas.height / 2);
      return;
    }

    // Calculate dimensions
    const padding = 40;
    const chartWidth = canvas.width - (padding * 2);
    const chartHeight = canvas.height - (padding * 2);

    // Find max values
    const maxValue = Math.max(
      ...velocities.map(v => Math.max(v.completed_points, v.planned_points))
    );
    const yScale = chartHeight / (maxValue * 1.2); // 20% padding at top

    // Bar dimensions
    const barGroupWidth = chartWidth / velocities.length;
    const barWidth = barGroupWidth * 0.35;
    const barSpacing = barGroupWidth * 0.1;

    // Draw axes
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    // Draw horizontal grid lines
    ctx.strokeStyle = '#1F2937';
    ctx.lineWidth = 0.5;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();

      // Y-axis labels
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      const value = maxValue * 1.2 * (1 - i / gridLines);
      ctx.fillText(value.toFixed(0), padding - 10, y + 4);
    }

    // Draw bars and values
    velocities.forEach((velocity, index) => {
      const x = padding + (index * barGroupWidth) + (barGroupWidth / 2);

      // Planned points bar
      const plannedHeight = velocity.planned_points * yScale;
      const plannedY = canvas.height - padding - plannedHeight;
      
      ctx.fillStyle = '#6B7280';
      ctx.fillRect(
        x - barWidth - barSpacing / 2,
        plannedY,
        barWidth,
        plannedHeight
      );

      // Completed points bar
      const completedHeight = velocity.completed_points * yScale;
      const completedY = canvas.height - padding - completedHeight;
      
      ctx.fillStyle = '#3B82F6';
      ctx.fillRect(
        x + barSpacing / 2,
        completedY,
        barWidth,
        completedHeight
      );

      // Value labels on bars
      ctx.fillStyle = '#E5E7EB';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      
      if (plannedHeight > 20) {
        ctx.fillText(
          velocity.planned_points.toString(),
          x - barWidth / 2 - barSpacing / 2,
          plannedY + 15
        );
      }
      
      if (completedHeight > 20) {
        ctx.fillText(
          velocity.completed_points.toString(),
          x + barWidth / 2 + barSpacing / 2,
          completedY + 15
        );
      }

      // X-axis labels (period)
      ctx.fillStyle = '#9CA3AF';
      ctx.textAlign = 'center';
      const periodLabel = velocity.period || `Sprint ${index + 1}`;
      ctx.fillText(
        periodLabel,
        x,
        canvas.height - padding + 20
      );
    });

    // Draw average line
    const avgVelocity = velocities.reduce((sum, v) => sum + (v.velocity || 0), 0) / velocities.length;
    if (avgVelocity > 0) {
      const avgY = canvas.height - padding - (avgVelocity * yScale);
      
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding, avgY);
      ctx.lineTo(canvas.width - padding, avgY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Average label
      ctx.fillStyle = '#10B981';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        `Avg: ${avgVelocity.toFixed(1)}`,
        canvas.width - padding + 10,
        avgY + 4
      );
    }

    // Draw trend line if enabled
    if (showTrend && velocities.length > 1) {
      // Calculate trend line using least squares
      const xValues = velocities.map((_, i) => i);
      const yValues = velocities.map(v => v.completed_points);
      
      const n = velocities.length;
      const sumX = xValues.reduce((a, b) => a + b, 0);
      const sumY = yValues.reduce((a, b) => a + b, 0);
      const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
      const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Draw trend line
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();

      const startX = padding + barGroupWidth / 2;
      const endX = padding + (velocities.length - 1) * barGroupWidth + barGroupWidth / 2;
      const startY = canvas.height - padding - (intercept * yScale);
      const endY = canvas.height - padding - ((intercept + slope * (velocities.length - 1)) * yScale);

      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw legend
    const legendY = 20;
    const legendItems = [
      { color: '#6B7280', label: 'Committed' },
      { color: '#3B82F6', label: 'Completed' },
      { color: '#10B981', label: 'Average', dash: true }
    ];

    if (showTrend) {
      legendItems.push({ color: '#F59E0B', label: 'Trend', dash: true });
    }

    const legendX = canvas.width - padding - 200;
    
    legendItems.forEach((item, index) => {
      const itemX = legendX + (index % 2) * 100;
      const itemY = legendY + Math.floor(index / 2) * 20;

      if (item.dash) {
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(itemX, itemY);
        ctx.lineTo(itemX + 20, itemY);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = item.color;
        ctx.fillRect(itemX, itemY - 6, 20, 12);
      }

      ctx.fillStyle = '#374151';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, itemX + 25, itemY + 4);
    });

  }, [velocities, height, showTrend]);

  const getVelocityTrend = () => {
    if (velocities.length < 2) return 'stable';
    
    const recent = velocities.slice(-3);
    const older = velocities.slice(-6, -3);
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, v) => sum + v.completed_points, 0) / recent.length;
    const olderAvg = older.reduce((sum, v) => sum + v.completed_points, 0) / older.length;
    
    const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (percentChange > 10) return 'improving';
    if (percentChange < -10) return 'declining';
    return 'stable';
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-success';
      case 'declining': return 'text-error';
      default: return 'text-warning';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '↑';
      case 'declining': return '↓';
      default: return '→';
    }
  };

  const trend = getVelocityTrend();
  const avgVelocity = velocities.length > 0 
    ? velocities.reduce((sum, v) => sum + (v.velocity || 0), 0) / velocities.length 
    : 0;
  const totalCompleted = velocities.reduce((sum, v) => sum + (v.completed_points || 0), 0);
  const totalPlanned = velocities.reduce((sum, v) => sum + (v.planned_points || 0), 0);
  const completionRatio = totalPlanned > 0 ? (totalCompleted / totalPlanned * 100) : 0;

  // Handle missing or invalid velocities data
  if (!velocities || !Array.isArray(velocities)) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          No velocity data available
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-primary">Team Velocity</h3>
        <div className="flex items-center justify-between mt-2">
          <div className="text-sm text-secondary">
            {velocities.length > 0 ? `${velocities[0].team_id} • Last ${velocities.length} periods` : 'No data'}
          </div>
          <div className={`text-sm font-medium ${getTrendColor(trend)}`}>
            {getTrendIcon(trend)} {trend.charAt(0).toUpperCase() + trend.slice(1)}
          </div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: `${height}px` }}
      />

      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-muted">Average Velocity</p>
          <p className="text-lg font-semibold text-primary">
            {avgVelocity.toFixed(1)} points
          </p>
        </div>
        <div>
          <p className="text-muted">Latest Period</p>
          <p className="text-lg font-semibold text-primary">
            {velocities.length > 0 && velocities[velocities.length - 1].velocity != null 
              ? velocities[velocities.length - 1].velocity.toFixed(1) 
              : '0'} points
          </p>
        </div>
        <div>
          <p className="text-muted">Completion Ratio</p>
          <p className="text-lg font-semibold text-primary">
            {completionRatio.toFixed(0)}%
          </p>
        </div>
      </div>

      {velocities.length > 3 && (
        <div className="mt-4 p-4 bg-secondary rounded-lg">
          <p className="text-sm text-muted mb-1">Trend Analysis</p>
          <p className="text-sm text-primary">
            {trend === 'improving' 
              ? 'Team velocity is improving over recent periods.'
              : trend === 'declining'
              ? 'Team velocity has been declining. Consider reviewing capacity or scope.'
              : 'Team velocity is stable across recent periods.'}
          </p>
        </div>
      )}
    </Card>
  );
};