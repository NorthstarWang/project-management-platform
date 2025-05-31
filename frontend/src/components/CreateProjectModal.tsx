'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { CustomDropdownMenu as DropdownMenu } from '@/components/ui/CustomDropdownMenu';
import { 
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/CustomDialog';
import { 
  FolderPlus,
  Users,
  FileText
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import { toast } from '@/components/ui/CustomToast';
import { motion } from 'framer-motion';

interface Team {
  id: string;
  name: string;
  description: string;
}

interface CreateProjectModalProps {
  onClose: () => void;
  onProjectCreated: () => void;
}

interface ProjectFormData {
  name: string;
  description: string;
  team_id: string;
}

// Helper function for analytics tracking
const trackEvent = async (actionType: string, payload: any) => {
  if (typeof window !== 'undefined') {
    try {
      const { track } = await import('@/services/analyticsLogger');
      track(actionType, payload);
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }
};

export default function CreateProjectModal({
  onClose,
  onProjectCreated
}: CreateProjectModalProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    team_id: ''
  });

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoadingTeams(true);
      const response = await apiClient.get('/api/teams');
      setTeams(response.data);
      
      // Auto-select first team if available
      if (response.data.length > 0 && !formData.team_id) {
        setFormData(prev => ({ ...prev, team_id: response.data[0].id }));
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
      toast.error('Failed to load teams');
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleInputChange = (field: keyof ProjectFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('Project name is required');
      return false;
    }

    if (formData.name.trim().length < 3) {
      toast.error('Project name must be at least 3 characters');
      return false;
    }

    if (!formData.team_id) {
      toast.error('Please select a team');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      // Track project creation attempt
      trackEvent('PROJECT_CREATE_ATTEMPT', {
        project_name: formData.name,
        team_id: formData.team_id,
        has_description: !!formData.description.trim()
      });

      const projectData = {
        name: formData.name.trim(),
        description: formData.description.trim() || `A new project managed by ${teams.find(t => t.id === formData.team_id)?.name}`,
        team_id: formData.team_id
      };

      const response = await apiClient.post('/api/projects', projectData);
      
      if (response.status === 200 || response.status === 201) {
        // Track successful creation
        trackEvent('PROJECT_CREATED', {
          project_id: response.data.id,
          project_name: response.data.name,
          team_id: response.data.team_id,
          timestamp: new Date().toISOString()
        });

        toast.success('Project created successfully!');
        onProjectCreated();
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to create project:', error);
      
      // Track creation failure
      trackEvent('PROJECT_CREATE_FAILED', {
        error: error.response?.data?.detail || error.message,
        project_name: formData.name
      });

      toast.error(error.response?.data?.detail || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const createTeamOptions = () => {
    return teams.map(team => ({
      value: team.id,
      label: team.name,
      icon: <div className="flex items-center gap-2 text-xs text-muted">
        <Users className="h-3 w-3" />
        <span className="text-xs">{team.description}</span>
      </div>
    }));
  };

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3">
          <motion.div
            className="flex items-center justify-center w-12 h-12 bg-accent/10 rounded-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <FolderPlus className="h-6 w-6 text-accent" />
          </motion.div>
          <div>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Set up a new project for your team to collaborate on
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Project Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted" />
            Project Name *
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter a descriptive project name..."
            className="w-full"
            disabled={loading}
            data-testid="project-name-input"
          />
          <p className="text-xs text-muted">
            Choose a clear name that describes the project&apos;s purpose
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted" />
            Description
          </Label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Add a detailed description of the project goals and scope..."
            className="w-full min-h-[100px] px-3 py-2 bg-input border border-input rounded-md text-input placeholder:text-input-placeholder focus:border-input-focus focus:outline-none focus:ring-2 focus:ring-interactive-primary focus:ring-offset-2 resize-none transition-all duration-200"
            rows={4}
            disabled={loading}
            data-testid="project-description-input"
          />
          <p className="text-xs text-muted">
            Optional: Provide context about the project&apos;s objectives
          </p>
        </div>

        {/* Team Selection */}
        <div className="space-y-2">
          <Label htmlFor="team" className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted" />
            Team *
          </Label>
          <DropdownMenu
            value={formData.team_id}
            onChange={(value) => handleInputChange('team_id', value)}
            placeholder={loadingTeams ? "Loading teams..." : "Select a team..."}
            className="w-full"
            disabled={loading || loadingTeams}
            options={loadingTeams ? [] : createTeamOptions()}
          />
          <p className="text-xs text-muted">
            Select which team will work on this project
          </p>
        </div>

        {/* Summary Card */}
        {formData.name && formData.team_id && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-muted/30 rounded-lg border border-secondary"
          >
            <h4 className="text-sm font-medium text-primary mb-2">Project Preview</h4>
            <div className="space-y-1 text-sm">
              <p className="text-primary font-medium">{formData.name}</p>
              {formData.description && (
                <p className="text-secondary text-xs">{formData.description}</p>
              )}
              <p className="text-xs text-muted">
                Team: {teams.find(t => t.id === formData.team_id)?.name}
              </p>
            </div>
          </motion.div>
        )}
      </div>

      <DialogFooter>
        <Button 
          variant="outline" 
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={loading || !formData.name.trim() || !formData.team_id}
          data-testid="create-project-submit"
        >
          {loading ? 'Creating...' : 'Create Project'}
        </Button>
      </DialogFooter>
    </>
  );
} 