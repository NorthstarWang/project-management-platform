'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { 
  Plus, 
  MoreHorizontal, 
  Calendar,
  Users,
  FolderOpen,
  ArrowRight,
  Settings,
  Eye
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import { toast } from '@/components/ui/CustomToast';
import { track } from '@/services/analyticsLogger';

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
}

interface Board {
  id: string;
  name: string;
  description: string;
  project_id: string;
  created_at: string;
  tasks_count?: number;
  lists_count?: number;
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

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    const sessionId = localStorage.getItem('session_id');
    
    if (!userData || !sessionId) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    
    // Set user ID header for API calls
    apiClient.setUserIdHeader(parsedUser.id);
    
    // Log project page view
    track('PAGE_VIEW', {
      page_name: 'project',
      page_url: `/projects/${projectId}`,
      project_id: projectId,
      user_id: parsedUser.id,
      user_role: parsedUser.role
    });
    
    // Load project data
    loadProjectData();
  }, [router, projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      
      // Log data loading start
      track('DATA_LOAD_START', {
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
      setBoards(boardsResponse.data);

      // Load team information if project has a team
      if (projectData.team_id) {
        try {
          const [teamResponse, membersResponse] = await Promise.all([
            apiClient.get(`/api/teams/${projectData.team_id}`),
            apiClient.get(`/api/teams/${projectData.team_id}/members`)
          ]);
          setTeam(teamResponse.data);
          setTeamMembers(membersResponse.data);
        } catch (error) {
          console.error('Failed to load team data:', error);
        }
      }

      // Log successful data load
      track('DATA_LOAD_SUCCESS', {
        page: 'project',
        project_id: projectId,
        boards_count: boardsResponse.data.length,
        team_members_count: teamMembers.length
      });

    } catch (error: any) {
      console.error('Failed to load project data:', error);
      toast.error('Failed to load project data');
      
      // Log data loading error
      track('DATA_LOAD_ERROR', {
        page: 'project',
        project_id: projectId,
        error: error.message || 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBoardClick = (boardId: string) => {
    // Log board click
    track('BOARD_CLICK', {
      page: 'project',
      project_id: projectId,
      board_id: boardId
    });
    
    router.push(`/boards/${boardId}`);
  };

  const handleCreateBoard = () => {
    // Log create board click
    track('CREATE_BOARD_CLICK', {
      page: 'project',
      project_id: projectId
    });
    
    // TODO: Open create board modal
    toast.info('Create board functionality coming soon');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Project Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <FolderOpen className="h-12 w-12 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {loading ? 'Loading...' : project?.name || 'Project'}
                </h1>
                <p className="text-gray-600 mt-1">
                  {loading ? 'Loading project details...' : project?.description || 'Project description'}
                </p>
                {project && (
                  <p className="text-sm text-gray-500 mt-1">
                    Created {formatDate(project.created_at)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button size="sm" onClick={handleCreateBoard} data-testid="create-board-button">
                <Plus className="h-4 w-4 mr-2" />
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
                <FolderOpen className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Boards</p>
                <p className="text-2xl font-semibold text-gray-900">{boards.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Team Members</p>
                <p className="text-2xl font-semibold text-gray-900">{teamMembers.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Tasks</p>
                <p className="text-2xl font-semibold text-gray-900">
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
                <h2 className="text-lg font-semibold text-gray-900">Project Boards</h2>
                <Button variant="ghost" size="sm" onClick={handleCreateBoard}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Board
                </Button>
              </div>
              
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-32 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : boards.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {boards.map((board) => (
                    <button
                      key={board.id}
                      onClick={() => handleBoardClick(board.id)}
                      className="text-left p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                      data-testid={`board-card-${board.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-medium text-gray-900">{board.name}</h3>
                        <MoreHorizontal className="h-4 w-4 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {board.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
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
                  <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No boards yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating your first board.
                  </p>
                  <div className="mt-6">
                    <Button onClick={handleCreateBoard}>
                      <Plus className="h-4 w-4 mr-2" />
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
                <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
                <Link href="/members">
                  <Button variant="ghost" size="sm" data-testid="view-all-members">
                    View all <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex items-center space-x-3">
                      <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {member.user_name}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {member.role}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {teamMembers.length > 5 && (
                    <div className="pt-2 border-t">
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
                  <Users className="mx-auto h-8 w-8 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No team members</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    This project doesn&apos;t have any team members yet.
                  </p>
                </div>
              )}
            </Card>

            {/* Team Info */}
            {team && (
              <Card className="p-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Team Information</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{team.name}</p>
                    <p className="text-sm text-gray-600">{team.description}</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 