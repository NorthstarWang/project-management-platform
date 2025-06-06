'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CustomDropdownMenu } from '@/components/ui/CustomDropdownMenu';
import { IconSelector, getIconComponent } from '@/components/ui/IconSelector';
import { 
  CustomDialog as Dialog,
  CustomDialogContent as DialogContent,
  CustomDialogHeader as DialogHeader,
  CustomDialogTitle as DialogTitle,
} from '@/components/ui/CustomDialog';
import { FolderOpen, Users } from 'lucide-react';
import apiClient from '@/services/apiClient';
import { toast } from '@/components/ui/CustomToast';
import { motion } from 'framer-motion';

interface Team {
  id: string;
  name: string;
  description: string;
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: () => void;
}

// Helper function for analytics tracking with synthetic API
const trackEvent = async (actionType: string, payload: any) => {
  if (typeof window !== 'undefined') {
    try {
      const { track } = await import('@/services/analyticsLogger');
      track(actionType, {
        text: payload.text || `User performed ${actionType} action`,
        ...payload
      });
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }
};

// Helper function for synthetic API logging
const logSyntheticEvent = async (actionType: string, payload: any) => {
  if (typeof window !== 'undefined') {
    try {
      // Get session ID from localStorage or URL
      const sessionId = localStorage.getItem('session_id') || new URLSearchParams(window.location.search).get('session_id');
      
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      if (sessionId) {
        await fetch(`${baseURL}/_synthetic/log_event?session_id=${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actionType,
            payload: {
              text: payload.text || `User performed ${actionType} action`,
              ...payload,
              page_url: window.location.href,
              timestamp: Date.now(),
              target_element_identifier: payload.target_element_identifier || 'create-project-modal'
            }
          }),
        });
      }
    } catch (error) {
      console.warn('Synthetic API logging failed:', error);
    }
  }
};

export default function CreateProjectModal({ isOpen, onClose, onProjectCreated }: CreateProjectModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    team_id: '',
    icon: 'folder'
  });
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      // Log modal open event
      trackEvent('MODAL_OPEN', {
        modal_name: 'create_project',
        timestamp: new Date().toISOString()
      });
      
      logSyntheticEvent('MODAL_OPEN', {
        modal_name: 'create_project',
        target_element_identifier: '[data-testid="create-project-modal"]'
      });

      loadTeams();
      // Reset form when modal opens
      setFormData({ name: '', description: '', team_id: '', icon: 'folder' });
      setErrors({});
    }
  }, [isOpen]);

  const loadTeams = async () => {
    try {
      setLoadingTeams(true);
      
      // Log team loading start
      logSyntheticEvent('TEAMS_LOAD_START', {
        target_element_identifier: '[data-testid="project-team-select"]'
      });

      const response = await apiClient.get('/api/teams');
      setTeams(response.data);
      
      // Log team loading success
      logSyntheticEvent('TEAMS_LOAD_SUCCESS', {
        text: `User's team data loaded successfully: ${response.data.length} teams found`,
        teams_count: response.data.length,
        target_element_identifier: '[data-testid="project-team-select"]'
      });
    } catch (error) {
      console.error('Failed to load teams:', error);
      toast.error('Failed to load teams');
      
      // Log team loading error
      logSyntheticEvent('TEAMS_LOAD_ERROR', {
        text: `User's team data failed to load: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
        target_element_identifier: '[data-testid="project-team-select"]'
      });
    } finally {
      setLoadingTeams(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Project name must be at least 3 characters';
    }

    if (!formData.team_id) {
      newErrors.team_id = 'Please select a team';
    }

    setErrors(newErrors);
    
    // Log validation results
    logSyntheticEvent('FORM_VALIDATION', {
      is_valid: Object.keys(newErrors).length === 0,
      errors: Object.keys(newErrors),
      target_element_identifier: '[data-testid="create-project-form"]'
    });
    
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Log input changes for AI training
    logSyntheticEvent('INPUT_CHANGE', {
      field,
      value_length: value.length,
      has_content: value.trim().length > 0,
      target_element_identifier: `[data-testid="project-${field}-input"]`
    });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleDropdownChange = (value: string) => {
    handleInputChange('team_id', value);
    
    // Additional logging for dropdown selection
    const selectedTeam = teams.find(team => team.id === value);
    logSyntheticEvent('DROPDOWN_SELECT', {
      selected_value: value,
      selected_label: selectedTeam?.name || '',
      options_count: teams.length,
      target_element_identifier: '[data-testid="project-team-select"]'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Debug: Check authentication state
      console.log('API Client Debug Info:', apiClient.getDebugInfo());
      console.log('LocalStorage user:', localStorage.getItem('user'));
      console.log('LocalStorage session_id:', localStorage.getItem('session_id'));
      
      // Ensure user is authenticated
      const userData = localStorage.getItem('user');
      if (!userData) {
        toast.error('You must be logged in to create a project');
        return;
      }
      
      const user = JSON.parse(userData);
      if (!apiClient.getDebugInfo().hasUserIdHeader) {
        console.log('Setting user ID header:', user.id);
        apiClient.setUserIdHeader(user.id);
      }

      // Track project creation attempt
      trackEvent('PROJECT_CREATE_ATTEMPT', {
        text: `User attempted to create project "${formData.name}"${formData.team_id ? ' with a team' : ''}`,
        project_name: formData.name,
        team_id: formData.team_id,
        has_description: !!formData.description,
        icon: formData.icon,
        timestamp: new Date().toISOString()
      });
      
      // Log to synthetic API
      logSyntheticEvent('PROJECT_CREATE_ATTEMPT', {
        text: `User clicked create button to create project "${formData.name}"`,
        project_name: formData.name,
        team_id: formData.team_id,
        has_description: !!formData.description,
        target_element_identifier: '[data-testid="create-project-button"]'
      });

      const response = await apiClient.post('/api/projects', {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        team_id: formData.team_id,
        icon: formData.icon
      });

      // Track successful creation
      trackEvent('PROJECT_CREATE_SUCCESS', {
        text: `User successfully created project "${response.data.name}"`,
        project_id: response.data.id,
        project_name: response.data.name,
        team_id: response.data.team_id,
        timestamp: new Date().toISOString()
      });
      
      // Log successful creation to synthetic API
      logSyntheticEvent('PROJECT_CREATE_SUCCESS', {
        text: `User successfully created project "${response.data.name}"`,
        project_id: response.data.id,
        project_name: response.data.name,
        team_id: response.data.team_id,
        target_element_identifier: '[data-testid="create-project-button"]'
      });

      toast.success(`Project "${formData.name}" created successfully!`);
      
      // Delay closing to allow success animation to show
      setTimeout(() => {
        onProjectCreated();
        onClose();
      }, 1000); // 1 second delay to show success state
    } catch (error: any) {
      console.error('Failed to create project:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to create project';
      toast.error(errorMessage);

      // Track creation error
      trackEvent('PROJECT_CREATE_ERROR', {
        text: `User's attempt to create project "${formData.name}" failed: ${errorMessage}`,
        project_name: formData.name,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
      
      // Log creation error to synthetic API
      logSyntheticEvent('PROJECT_CREATE_ERROR', {
        text: `User's project creation failed: ${errorMessage}`,
        project_name: formData.name,
        error: errorMessage,
        target_element_identifier: '[data-testid="create-project-button"]'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      trackEvent('PROJECT_CREATE_CANCEL', {
        text: `User cancelled creating project${formData.name ? ` "${formData.name}"` : ''} and closed the modal`,
        project_name: formData.name,
        form_filled: !!(formData.name || formData.description || formData.team_id),
        timestamp: new Date().toISOString()
      });
      
      logSyntheticEvent('MODAL_CLOSE', {
        text: 'User closed the create project modal',
        modal_name: 'create_project',
        form_filled: !!(formData.name || formData.description || formData.team_id),
        target_element_identifier: '[data-testid="cancel-project-button"]'
      });
      
      onClose();
    }
  };

  // Prepare dropdown options for CustomDropdownMenu
  const teamOptions = teams.map(team => ({
    value: team.id,
    label: team.name,
    icon: <Users className="h-4 w-4 text-muted" />
  }));

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" data-testid="create-project-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FolderOpen className="h-5 w-5 text-accent" />
            <span>Create New Project</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 relative" data-testid="create-project-form">
          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
              <div className="flex flex-col items-center space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent"></div>
                <p className="text-sm text-primary font-medium">Creating project...</p>
              </div>
            </div>
          )}

          {/* Project Name */}
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium text-primary mb-2">
              Project Name *
            </label>
            <Input
              id="project-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              onFocus={() => logSyntheticEvent('INPUT_FOCUS', {
                field: 'name',
                target_element_identifier: '[data-testid="project-name-input"]'
              })}
              onBlur={() => logSyntheticEvent('INPUT_BLUR', {
                field: 'name',
                value_length: formData.name.length,
                target_element_identifier: '[data-testid="project-name-input"]'
              })}
              placeholder="Enter project name"
              className={errors.name ? 'border-error' : ''}
              disabled={loading}
              data-testid="project-name-input"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-error">{errors.name}</p>
            )}
          </div>

          {/* Project Description */}
          <div>
            <label htmlFor="project-description" className="block text-sm font-medium text-primary mb-2">
              Description (Optional)
            </label>
            <textarea
              id="project-description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              onFocus={() => logSyntheticEvent('INPUT_FOCUS', {
                field: 'description',
                target_element_identifier: '[data-testid="project-description-input"]'
              })}
              onBlur={() => logSyntheticEvent('INPUT_BLUR', {
                field: 'description',
                value_length: formData.description.length,
                target_element_identifier: '[data-testid="project-description-input"]'
              })}
              placeholder="Describe what this project is about..."
              rows={3}
              className={`w-full px-3 py-2 border rounded-md text-sm text-primary bg-input
                         border-secondary focus:outline-none focus:ring-2 focus:ring-accent 
                         focus:border-accent resize-none disabled:opacity-50 disabled:cursor-not-allowed
                         ${errors.description ? 'border-error' : ''}`}
              disabled={loading}
              data-testid="project-description-input"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-error">{errors.description}</p>
            )}
          </div>

          {/* Project Icon */}
          <div>
            <label htmlFor="project-icon" className="block text-sm font-medium text-primary mb-2">
              Project Icon
            </label>
            <div className="flex items-center space-x-3">
              <IconSelector
                selectedIcon={formData.icon}
                onIconSelect={(icon) => {
                  handleInputChange('icon', icon);
                  logSyntheticEvent('ICON_SELECT', {
                    selected_icon: icon,
                    target_element_identifier: '[data-testid="project-icon-selector"]'
                  });
                }}
                data-testid="project-icon-selector"
              />
              <span className="text-sm text-muted">Choose an icon to represent your project</span>
            </div>
          </div>

          {/* Team Selection */}
          <div>
            <label htmlFor="project-team" className="block text-sm font-medium text-primary mb-2">
              Team *
            </label>
            <CustomDropdownMenu
              options={teamOptions}
              value={formData.team_id}
              onChange={handleDropdownChange}
              placeholder={loadingTeams ? 'Loading teams...' : 'Select a team'}
              className={`w-full ${errors.team_id ? 'border-error' : ''}`}
              disabled={loading || loadingTeams}
              data-testid="project-team-select"
            />
            {errors.team_id && (
              <p className="mt-1 text-sm text-error">{errors.team_id}</p>
            )}
            {teams.length === 0 && !loadingTeams && (
              <p className="mt-1 text-sm text-warning">
                No teams available. You need to create a team first.
              </p>
            )}
          </div>

          {/* Project Preview */}
          {formData.name && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-muted/30 rounded-lg border border-secondary"
            >
              <h4 className="text-sm font-medium text-primary mb-2">Project Preview</h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center space-x-2">
                  {(() => {
                    const IconComponent = getIconComponent(formData.icon);
                    return <IconComponent className="h-4 w-4 text-accent" />;
                  })()}
                  <p className="text-primary font-medium">{formData.name}</p>
                </div>
                {formData.description && (
                  <p className="text-secondary text-xs">{formData.description}</p>
                )}
                {formData.team_id && teams.find(t => t.id === formData.team_id) && (
                  <p className="text-xs text-muted">
                    Team: {teams.find(t => t.id === formData.team_id)?.name}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              onFocus={() => logSyntheticEvent('BUTTON_FOCUS', {
                button_type: 'cancel',
                target_element_identifier: '[data-testid="cancel-project-button"]'
              })}
              disabled={loading}
              data-testid="cancel-project-button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={teams.length === 0}
              onFocus={() => logSyntheticEvent('BUTTON_FOCUS', {
                button_type: 'submit',
                target_element_identifier: '[data-testid="create-project-button"]'
              })}
              data-testid="create-project-button"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 