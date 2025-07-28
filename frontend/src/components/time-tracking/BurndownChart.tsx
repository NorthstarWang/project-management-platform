'use client';

import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { SprintBurndown } from '@/types/time-tracking';

interface BurndownChartProps {
  burndown: SprintBurndown;
  height?: number;
  showIdealLine?: boolean;
}

export const BurndownChart: React.FC<BurndownChartProps> = ({
  burndown,
  height = 300,
  showIdealLine = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Handle missing or invalid burndown data inside useEffect
    if (!burndown || !burndown.data_points || !burndown.ideal_line) {
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

    // Calculate dimensions
    const padding = 40;
    const chartWidth = canvas.width - (padding * 2);
    const chartHeight = canvas.height - (padding * 2);

    // Draw axes
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    // Calculate data points
    const maxPoints = burndown.total_points || 0;
    if (!burndown.data_points || burndown.data_points.length === 0) return;
    const dataPoints = burndown.data_points;
    const idealLine = burndown.ideal_line;

    if (dataPoints.length === 0) {
      // Draw "No data" message
      ctx.fillStyle = '#6B7280';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
      return;
    }

    // Calculate scale
    const xScale = chartWidth / (idealLine.length - 1);
    const yScale = chartHeight / maxPoints;

    // Draw ideal line
    if (showIdealLine && idealLine.length > 0) {
      ctx.strokeStyle = '#9CA3AF';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      
      idealLine.forEach((point, index) => {
        const x = padding + (index * xScale);
        const y = canvas.height - padding - (point.remaining * yScale);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw actual line
    if (dataPoints.length > 0) {
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      // Start from the beginning with total points
      ctx.moveTo(padding, canvas.height - padding - (maxPoints * yScale));
      
      dataPoints.forEach((point, index) => {
        const dayIndex = idealLine.findIndex(ideal => ideal.date === point.date);
        if (dayIndex >= 0) {
          const x = padding + (dayIndex * xScale);
          const y = canvas.height - padding - (point.remaining * yScale);
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();

      // Draw data points
      ctx.fillStyle = '#3B82F6';
      dataPoints.forEach((point) => {
        const dayIndex = idealLine.findIndex(ideal => ideal.date === point.date);
        if (dayIndex >= 0) {
          const x = padding + (dayIndex * xScale);
          const y = canvas.height - padding - (point.remaining * yScale);
          
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Draw labels
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';

    // X-axis labels (dates)
    const labelInterval = Math.ceil(idealLine.length / 7); // Show max 7 labels
    idealLine.forEach((point, index) => {
      if (index % labelInterval === 0 || index === idealLine.length - 1) {
        const x = padding + (index * xScale);
        const date = new Date(point.date);
        const label = `${date.getMonth() + 1}/${date.getDate()}`;
        ctx.fillText(label, x, canvas.height - padding + 20);
      }
    });

    // Y-axis labels (points)
    ctx.textAlign = 'right';
    const yLabelCount = 5;
    for (let i = 0; i <= yLabelCount; i++) {
      const value = (maxPoints / yLabelCount) * i;
      const y = canvas.height - padding - (value * yScale);
      ctx.fillText(value.toFixed(0), padding - 10, y + 4);
    }

    // Draw legend
    const legendY = 20;
    ctx.textAlign = 'left';
    
    // Actual line legend
    ctx.fillStyle = '#3B82F6';
    ctx.fillRect(canvas.width - 150, legendY, 20, 3);
    ctx.fillStyle = '#374151';
    ctx.font = '12px sans-serif';
    ctx.fillText('Actual', canvas.width - 120, legendY + 4);
    
    // Ideal line legend
    if (showIdealLine) {
      ctx.strokeStyle = '#9CA3AF';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(canvas.width - 150, legendY + 20);
      ctx.lineTo(canvas.width - 130, legendY + 20);
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = '#374151';
      ctx.fillText('Ideal', canvas.width - 120, legendY + 24);
    }

  }, [burndown, height, showIdealLine]);

  const getProgress = () => {
    if (!burndown?.data_points || burndown.data_points.length === 0) return 0;
    const lastPoint = burndown.data_points[burndown.data_points.length - 1];
    return ((burndown.total_points - lastPoint.remaining) / burndown.total_points) * 100;
  };

  const isOnTrack = () => {
    if (!burndown?.data_points || burndown.data_points.length === 0 || 
        !burndown?.ideal_line || burndown.ideal_line.length === 0) return true;
    
    const lastDataPoint = burndown.data_points[burndown.data_points.length - 1];
    const idealPoint = burndown.ideal_line.find(p => p.date === lastDataPoint.date);
    
    if (!idealPoint) return true;
    
    return lastDataPoint.remaining <= idealPoint.remaining * 1.1; // 10% tolerance
  };

  // Handle missing or invalid burndown data
  if (!burndown || !burndown.data_points || !burndown.ideal_line) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          No burndown data available
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-primary">Sprint Burndown</h3>
        <div className="flex items-center justify-between mt-2">
          <div className="text-sm text-secondary">
            {burndown.start_date} to {burndown.end_date}
          </div>
          <div className={`text-sm font-medium ${isOnTrack() ? 'text-success' : 'text-warning'}`}>
            {getProgress().toFixed(0)}% Complete
          </div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: `${height}px` }}
      />

      {burndown.data_points.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted">Total Points</p>
            <p className="text-lg font-semibold text-primary">{burndown.total_points}</p>
          </div>
          <div>
            <p className="text-muted">Remaining</p>
            <p className="text-lg font-semibold text-primary">
              {burndown.data_points[burndown.data_points.length - 1].remaining}
            </p>
          </div>
          <div>
            <p className="text-muted">Completed</p>
            <p className="text-lg font-semibold text-success">
              {burndown.total_points - burndown.data_points[burndown.data_points.length - 1].remaining}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};