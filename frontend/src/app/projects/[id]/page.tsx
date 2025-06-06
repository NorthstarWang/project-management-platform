'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { getIconComponent } from '@/components/ui/IconSelector';
import { 
  CustomDialog as Dialog,
  CustomDialogContent as DialogContent,
} from '@/components/ui/CustomDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { 
  Plus, 
  MoreHorizontal, 
  Calendar,
  Users,
  FolderOpen,
  ArrowRight,
  Settings,
  Eye,
  Trash2
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import { toast } from '@/components/ui/CustomToast';
import { Skeleton, SkeletonAvatar } from '@/components/ui/Skeleton';
import CreateBoardModal from '@/components/CreateBoardModal';

interface User {
  id: string;
  username: string;
  full_name: string;
  role: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  team_id: string;
  created_at: string;
  created_by?: string;
  icon?: string;
}

interface Board {
  id: string;
  name: string;
  description: string;
  project_id: string;
  created_at: string;
  tasks_count?: number;
  lists_count?: number;
  icon?: string;
}

interface Team {
  id: string;
  name: string;
  description: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: string;
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

export default function ProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [projectManagers, setProjectManagers] = useState<string[]>([]);

  const loadProjectData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Log data loading start
      trackEvent('DATA_LOAD_START', {
        text: `Started loading data for project ${projectId}`,
        page: 'project',
        project_id: projectId,
        data_types: ['project', 'boards', 'team', 'team_members']
      });
      
      // Load project details
      const projectResponse = await apiClient.get(`/api/projects/${projectId}`);
      const projectData = projectResponse.data;
      setProject(projectData);

      // Load project boards
      const boardsResponse = await apiClient.get(`/api/projects/${projectId}/boards`);
      const boardsData = boardsResponse.data;
      
      // Enhance boards with correct counts
      const enhancedBoards = await Promise.all(
        boardsData.map(async (board: any) => {
          try {
            // Get board statuses and count active ones (excluding archived/deleted)
            const statusesResponse = await apiClient.get(`/api/boards/${board.id}/statuses`);
            const statuses = statusesResponse.data;
            const activeStatusesCount = statuses.filter((status: any) => 
              status.id !== 'archived' && status.id !== 'deleted'
            ).length;
            
            // Get board tasks and count non-archived, non-deleted ones
            const boardResponse = await apiClient.get(`/api/boards/${board.id}`);
            const boardDetails = boardResponse.data;
            
            let activeTasksCount = 0;
            if (boardDetails.lists) {
              boardDetails.lists.forEach((list: any) => {
                if (list.tasks) {
                  activeTasksCount += list.tasks.filter((task: any) => 
                    task.status !== 'archived' && task.status !== 'deleted' && !task.archived
                  ).length;
                }
              });
            }
            
            return {
              ...board,
              lists_count: activeStatusesCount,
              tasks_count: activeTasksCount
            };
          } catch (error) {
            console.error(`Failed to enhance board ${board.id}:`, error);
            return {
              ...board,
              lists_count: 0,
              tasks_count: 0
            };
          }
        })
      );
      
      setBoards(enhancedBoards);

      // Load team information if project has a team
      if (projectData.team_id) {
        try {
          const teamResponse = await apiClient.get(`/api/teams/${projectData.team_id}`);
          const teamData = teamResponse.data;
          setTeam(teamData);
          
          // The team endpoint returns members included
          if (teamData.members) {
            setTeamMembers(teamData.members);
          }
        } catch (error) {
          console.error('Failed to load team data:', error);
        }
      }

      // Load project managers
      try {
        const managersResponse = await apiClient.get(`/api/projects/${projectId}/managers`);
        // The API returns full user objects, so we need to extract the user IDs
        const managerIds = managersResponse.data.map((manager: any) => manager.id);
        setProjectManagers(managerIds);
      } catch (error) {
        console.error('Failed to load project managers:', error);
      }

      // Log successful data load
      trackEvent('DATA_LOAD_SUCCESS', {
        text: `Successfully loaded project data with ${enhancedBoards.length} boards and ${teamMembers.length} team members`,
        page: 'project',
        project_id: projectId,
        boards_count: enhancedBoards.length,
        team_members_count: teamMembers.length
      });

    } catch (error: any) {
      console.error('Failed to load project data:', error);
      toast.error('Failed to load project data');
      
      // Log data loading error
      trackEvent('DATA_LOAD_ERROR', {
        text: `Failed to load project data: ${error.message || 'Unknown error'}`,
        page: 'project',
        project_id: projectId,
        error: error.message || 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, teamMembers.length]);

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    
    // Log project page view
    trackEvent('PAGE_VIEW', {
      text: `User viewed project page for project ${projectId}`,
      page_name: 'project',
      page_url: `/projects/${projectId}`,
      project_id: projectId,
      user_id: parsedUser.id,
      user_role: parsedUser.role
    });
    
    // Load project data
    loadProjectData();
  }, [router, projectId, loadProjectData]);

  const handleBoardClick = (boardId: string) => {
    // Log board click
    trackEvent('BOARD_CLICK', {
      text: `User clicked on board ${boardId} in project ${projectId}`,
      page: 'project',
      project_id: projectId,
      board_id: boardId
    });
    
    // Add enhanced board interaction tracking
    trackEvent('PROJECT_BOARD_INTERACTION', {
      text: `User navigated to board ${boardId} from project detail page`,
      interaction_type: 'board_navigation',
      board_id: boardId,
      project_id: projectId,
      timestamp: new Date().toISOString(),
      navigation_source: 'project_detail_page',
      total_boards_in_project: boards.length
    });
    
    router.push(`/boards/${boardId}`);
  };

  const handleCreateBoard = () => {
    // Log create board click
    trackEvent('CREATE_BOARD_CLICK', {
      text: `User clicked create board button in project ${projectId}`,
      page: 'project',
      project_id: projectId
    });
    
    // Add enhanced board creation tracking
    trackEvent('PROJECT_BOARD_CREATION_ATTEMPT', {
      text: `User attempted to create a new board in project ${project?.name || projectId} (currently ${boards.length} boards)`,
      interaction_type: 'create_board_button',
      project_id: projectId,
      current_boards_count: boards.length,
      user_role: user?.role,
      timestamp: new Date().toISOString(),
      project_name: project?.name,
      team_members_count: teamMembers.length
    });
    
    setShowCreateBoard(true);
  };

  const formatDate = (dateString: string | number) => {
    // Handle Unix timestamp (convert from seconds to milliseconds)
    const timestamp = typeof dateString === 'string' ? parseFloat(dateString) : dateString;
    const date = new Date(timestamp * 1000); // Convert from seconds to milliseconds
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const canDeleteProject = () => {
    if (!user || !project) return false;
    
    if (user.role === 'admin') return true;
    
    if (user.role === 'manager') {
      // Check if user created the project
      if (project.created_by === user.id) return true;
      // Check if user is assigned as a manager
      if (projectManagers.includes(user.id)) return true;
    }
    
    return false;
  };

  const handleDeleteProject = async () => {
    if (!project) return;

    try {
      setIsDeleting(true);
      
      const response = await apiClient.delete(`/api/projects/${projectId}`);
      
      // Log successful deletion
      trackEvent('PROJECT_DELETE', {
        text: `User successfully deleted project "${project.name}"`,
        project_id: projectId,
        project_name: project.name,
        cascade_deleted: response.data.cascadeDeleted,
        timestamp: new Date().toISOString()
      });
      
      toast.success(`Project "${project.name}" deleted successfully`);
      
      // Navigate back to projects list
      router.push('/projects');
    } catch (error: any) {
      console.error('Failed to delete project:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete project');
      
      // Log deletion error
      trackEvent('PROJECT_DELETE_ERROR', {
        text: `Failed to delete project: ${error.response?.data?.detail || error.message || 'Unknown error'}`,
        project_id: projectId,
        error: error.response?.data?.detail || error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteClick = () => {
    trackEvent('PROJECT_DELETE_ATTEMPT', {
      text: `User attempted to delete project "${project?.name}" with ${boards.length} boards and ${boards.reduce((total, board) => total + (board.tasks_count || 0), 0)} tasks`,
      project_id: projectId,
      project_name: project?.name,
      boards_count: boards.length,
      tasks_count: boards.reduce((total, board) => total + (board.tasks_count || 0), 0),
      timestamp: new Date().toISOString()
    });
    
    setShowDeleteConfirm(true);
  };

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Project Header */}
        <div className="bg-card rounded-lg shadow-card p-6 border border-card">
          {/* Top Row - Main Info */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <div className="flex-shrink-0">
                {(() => {
                  const IconComponent = getIconComponent(project?.icon || 'folder');
                  return <IconComponent className="h-12 w-12 text-accent" />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-primary">
                  {loading ? 'Loading...' : project?.name || 'Project'}
                </h1>
                <p className="text-secondary mt-1">
                  {loading ? 'Loading project details...' : project?.description || 'Project description'}
                </p>
                {project && (
                  <p className="text-sm text-muted mt-2">
                    Created {formatDate(project.created_at)}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Bottom Row - Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-secondary">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" leftIcon={<Eye className="h-4 w-4" />}>
                View
              </Button>
              <Button variant="outline" size="sm" leftIcon={<Settings className="h-4 w-4" />}>
                Settings
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              {canDeleteProject() && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={handleDeleteClick}
                  className="text-error hover:text-error hover:bg-error/10"
                >
                  Delete
                </Button>
              )}
              <Button size="sm" onClick={handleCreateBoard} data-testid="create-board-button" leftIcon={<Plus className="h-4 w-4" />}>
                Create Board
              </Button>
            </div>
          </div>
        </div>

        {/* Project Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FolderOpen className="h-8 w-8 text-accent" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted">Boards</p>
                <p className="text-2xl font-semibold text-primary">{boards.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-success" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted">Team Members</p>
                <p className="text-2xl font-semibold text-primary">{teamMembers.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-info" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted">Total Tasks</p>
                <p className="text-2xl font-semibold text-primary">
                  {boards.reduce((total, board) => total + (board.tasks_count || 0), 0)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Boards */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-primary">Project Boards</h2>
                <Button variant="ghost" size="sm" onClick={handleCreateBoard} leftIcon={<Plus className="h-4 w-4" />}>
                  Add Board
                </Button>
              </div>
              
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} height="8rem" />
                  ))}
                </div>
              ) : boards.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {boards.map((board) => (
                    <button
                      key={board.id}
                      onClick={() => handleBoardClick(board.id)}
                      className="text-left p-4 rounded-lg border border-secondary hover:border-accent hover:bg-interactive-secondary-hover transition-colors group"
                      data-testid={`board-card-${board.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 p-2 rounded-lg bg-accent-10 border border-accent-20">
                            {(() => {
                              const IconComponent = getIconComponent(board.icon || 'kanban');
                              return <IconComponent className="h-4 w-4 text-accent" />;
                            })()}
                          </div>
                          <h3 className="font-medium text-primary group-hover:text-accent transition-colors truncate">
                            {board.name}
                          </h3>
                        </div>
                        <MoreHorizontal className="h-4 w-4 text-muted flex-shrink-0" />
                      </div>
                      <p className="text-sm text-secondary mb-3 line-clamp-2">
                        {board.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted">
                        <span>{formatDate(board.created_at)}</span>
                        <div className="flex items-center space-x-3">
                          <span>{board.lists_count || 0} lists</span>
                          <span>{board.tasks_count || 0} tasks</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FolderOpen className="mx-auto h-12 w-12 text-muted" />
                  <h3 className="mt-2 text-sm font-medium text-primary">No boards yet</h3>
                  <p className="mt-1 text-sm text-secondary">
                    Get started by creating your first board.
                  </p>
                  <div className="mt-6">
                    <Button onClick={handleCreateBoard} leftIcon={<Plus className="h-4 w-4" />}>
                      Create Board
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Team Members */}
          <div>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-primary">Team Members</h2>
                <Link href="/members">
                  <Button variant="ghost" size="sm" data-testid="view-all-members" rightIcon={<ArrowRight className="h-4 w-4" />}>
                    View all
                  </Button>
                </Link>
              </div>
              
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <SkeletonAvatar size="sm" />
                      <div className="flex-1 space-y-2">
                        <Skeleton width="75%" />
                        <Skeleton width="50%" size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : teamMembers.length > 0 ? (
                <div className="space-y-3">
                  {teamMembers.slice(0, 5).map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center space-x-3"
                      data-testid={`team-member-${member.user_id}`}
                    >
                      <Avatar size="sm" name={member.user_name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary truncate">
                          {member.user_name}
                        </p>
                        <p className="text-xs text-muted capitalize">
                          {member.role}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {teamMembers.length > 5 && (
                    <div className="pt-2 border-t border-secondary">
                      <Link href="/members">
                        <Button variant="ghost" size="sm" className="w-full">
                          View {teamMembers.length - 5} more members
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Users className="mx-auto h-8 w-8 text-muted" />
                  <h3 className="mt-2 text-sm font-medium text-primary">No team members</h3>
                  <p className="mt-1 text-sm text-secondary">
                    This project doesn&apos;t have any team members yet.
                  </p>
                </div>
              )}
            </Card>

            {/* Team Info */}
            {team && (
              <Card className="p-6 mt-6">
                <h3 className="text-lg font-semibold text-primary mb-3">Team Information</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-primary">{team.name}</p>
                    <p className="text-sm text-secondary">{team.description}</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Create Board Modal */}
      <Dialog open={showCreateBoard} onOpenChange={setShowCreateBoard}>
        <DialogContent className="max-w-2xl">
          <CreateBoardModal 
            projectId={projectId}
            projectName={project?.name || 'Project'}
            onClose={() => setShowCreateBoard(false)}
            onBoardCreated={loadProjectData}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        description={`Are you sure you want to delete "${project?.name}"? This will permanently delete ${boards.length} board${boards.length !== 1 ? 's' : ''}, ${boards.reduce((total, board) => total + (board.tasks_count || 0), 0)} task${boards.reduce((total, board) => total + (board.tasks_count || 0), 0) !== 1 ? 's' : ''}, and all associated comments and activities. This action cannot be undone.`}
        confirmText="Delete Project"
        type="danger"
        loading={isDeleting}
      />
    </DashboardLayout>
  );
} 