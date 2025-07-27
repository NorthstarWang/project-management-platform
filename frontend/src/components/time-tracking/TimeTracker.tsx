'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/CustomToast';
import {
  Play,
  Pause,
  Square,
  Clock,
  DollarSign,
  Tag,
  FileText,
  AlertCircle
} from 'lucide-react';
import timeTrackingService from '@/services/timeTrackingService';
import { Timer, TimerState, StartTimerRequest } from '@/types/time-tracking';

interface TimeTrackerProps {
  taskId?: string;
  projectId?: string;
  onTimeEntryCreated?: () => void;
  compact?: boolean;
}

export const TimeTracker: React.FC<TimeTrackerProps> = ({
  taskId,
  projectId,
  onTimeEntryCreated,
  compact = false
}) => {
  const [timer, setTimer] = useState<Timer | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load active timer on mount
  useEffect(() => {
    loadActiveTimer();
  }, []);

  // Update elapsed time
  useEffect(() => {
    if (timer && timer.state === TimerState.RUNNING) {
      intervalRef.current = setInterval(() => {
        const elapsed = timeTrackingService.calculateDuration(timer.start_time);
        setElapsedTime(elapsed - timer.total_pause_duration);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timer]);

  const loadActiveTimer = async () => {
    try {
      const activeTimer = await timeTrackingService.getActiveTimer();
      if (activeTimer) {
        setTimer(activeTimer);
        setDescription(activeTimer.description);
        setTags(activeTimer.tags);
        
        // Calculate elapsed time
        const elapsed = timeTrackingService.calculateDuration(activeTimer.start_time);
        setElapsedTime(elapsed - activeTimer.total_pause_duration);
      }
    } catch (error) {
      console.error('Failed to load active timer:', error);
    }
  };

  const handleStart = async () => {
    try {
      setLoading(true);
      
      const request: StartTimerRequest = {
        task_id: taskId,
        project_id: projectId,
        description,
        tags
      };
      
      const newTimer = await timeTrackingService.startTimer(request);
      setTimer(newTimer);
      setElapsedTime(0);
      
      toast.success('Timer started');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to start timer');
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    if (!timer) return;
    
    try {
      setLoading(true);
      const updatedTimer = await timeTrackingService.pauseTimer(timer.id);
      setTimer(updatedTimer);
      toast.success('Timer paused');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to pause timer');
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    if (!timer) return;
    
    try {
      setLoading(true);
      const updatedTimer = await timeTrackingService.resumeTimer(timer.id);
      setTimer(updatedTimer);
      toast.success('Timer resumed');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to resume timer');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!timer) return;
    
    try {
      setLoading(true);
      const timeEntry = await timeTrackingService.stopTimer(timer.id, description);
      
      setTimer(null);
      setElapsedTime(0);
      setDescription('');
      setTags([]);
      
      toast.success(`Time entry created: ${timeTrackingService.formatDuration(timeEntry.duration_minutes || 0)}`);
      
      if (onTimeEntryCreated) {
        onTimeEntryCreated();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to stop timer');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const formatElapsedTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const secs = Math.floor((minutes % 1) * 60);
    
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <div className="text-lg font-mono">
          {formatElapsedTime(elapsedTime)}
        </div>
        
        {!timer ? (
          <Button
            size="sm"
            onClick={handleStart}
            disabled={loading}
            leftIcon={<Play className="h-4 w-4" />}
          >
            Start
          </Button>
        ) : timer.state === TimerState.RUNNING ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={handlePause}
              disabled={loading}
              leftIcon={<Pause className="h-4 w-4" />}
            >
              Pause
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleStop}
              disabled={loading}
              leftIcon={<Square className="h-4 w-4" />}
            >
              Stop
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              onClick={handleResume}
              disabled={loading}
              leftIcon={<Play className="h-4 w-4" />}
            >
              Resume
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleStop}
              disabled={loading}
              leftIcon={<Square className="h-4 w-4" />}
            >
              Stop
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Time Tracker
          </h3>
          
          <div className="text-3xl font-mono text-primary">
            {formatElapsedTime(elapsedTime)}
          </div>
        </div>

        {timer && timer.state === TimerState.PAUSED && (
          <div className="flex items-center p-3 bg-warning/10 border border-warning/20 rounded-md">
            <AlertCircle className="h-4 w-4 text-warning mr-2" />
            <span className="text-sm text-warning">Timer is paused</span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <Label htmlFor="description">Description</Label>
            <div className="flex space-x-2">
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What are you working on?"
                disabled={timer !== null}
                leftIcon={<FileText className="h-4 w-4" />}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="tags">Tags</Label>
            <div className="flex space-x-2 mb-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Add tag"
                disabled={timer !== null}
                leftIcon={<Tag className="h-4 w-4" />}
              />
              <Button
                variant="outline"
                onClick={handleAddTag}
                disabled={!tagInput.trim() || timer !== null}
              >
                Add
              </Button>
            </div>
            
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent"
                  >
                    {tag}
                    {!timer && (
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-accent-hover"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-secondary">
          <div className="flex items-center space-x-2 text-sm text-muted">
            {timer && (
              <>
                <span>Started at {timeTrackingService.formatTime(timer.start_time)}</span>
                {timer.total_pause_duration > 0 && (
                  <span>• Paused for {timeTrackingService.formatDuration(timer.total_pause_duration)}</span>
                )}
              </>
            )}
          </div>

          <div className="flex space-x-2">
            {!timer ? (
              <Button
                onClick={handleStart}
                disabled={loading || !description.trim()}
                leftIcon={<Play className="h-4 w-4" />}
              >
                Start Timer
              </Button>
            ) : timer.state === TimerState.RUNNING ? (
              <>
                <Button
                  variant="outline"
                  onClick={handlePause}
                  disabled={loading}
                  leftIcon={<Pause className="h-4 w-4" />}
                >
                  Pause
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleStop}
                  disabled={loading}
                  leftIcon={<Square className="h-4 w-4" />}
                >
                  Stop & Save
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleResume}
                  disabled={loading}
                  leftIcon={<Play className="h-4 w-4" />}
                >
                  Resume
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleStop}
                  disabled={loading}
                  leftIcon={<Square className="h-4 w-4" />}
                >
                  Stop & Save
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};