'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getIconComponent } from '@/components/ui/IconSelector';
import { 
  Plus, 
  FolderOpen,
  Calendar,
  Users,
  ArrowRight,
  Briefcase
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import { toast } from '@/components/ui/CustomToast';
import { Skeleton } from '@/components/ui/Skeleton';
import CreateProjectModal from '@/components/CreateProjectModal';

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
  created_at: string | number;
  created_by?: string;
  boards_count?: number;
  tasks_count?: number;
  icon?: string;
}

interface Stats {
  totalProjects: number;
  totalBoards: number;
  totalTasks: number;
  activeProjects: number;
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

export default function ProjectsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
    totalBoards: 0,
    totalTasks: 0,
    activeProjects: 0
  });
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    
    // Log projects page view
    trackEvent('PAGE_VIEW', {
      page_name: 'projects',
      page_url: '/projects',
      user_id: parsedUser.id,
      user_role: parsedUser.role
    });
    
    // Load projects data
    loadProjectsData();
  }, [router]);

  const loadProjectsData = async () => {
    try {
      setLoading(true);
      
      // Log data loading start
      trackEvent('DATA_LOAD_START', {
        page: 'projects',
        data_types: ['projects']
      });
      
      // Load all projects accessible to the user
      const projectsResponse = await apiClient.get('/api/projects');
      const projectsData = projectsResponse.data;
      
      // Enhance projects with board and task counts
      const enhancedProjects = await Promise.all(
        projectsData.map(async (project: Project) => {
          try {
            const boardsResponse = await apiClient.get(`/api/projects/${project.id}/boards`);
            const boards = boardsResponse.data;
            
            // Calculate total active tasks across all boards (excluding archived/deleted)
            let totalActiveTasks = 0;
            for (const board of boards) {
              try {
                // Get board details with tasks
                const boardResponse = await apiClient.get(`/api/boards/${board.id}`);
                const boardDetails = boardResponse.data;
                
                if (boardDetails.lists) {
                  boardDetails.lists.forEach((list: any) => {
                    if (list.tasks) {
                      totalActiveTasks += list.tasks.filter((task: any) => 
                        task.status !== 'archived' && task.status !== 'deleted' && !task.archived
                      ).length;
                    }
                  });
                }
              } catch (error) {
                console.error(`Failed to load tasks for board ${board.id}:`, error);
              }
            }
            
            return {
              ...project,
              boards_count: boards.length,
              tasks_count: totalActiveTasks
            };
          } catch (error) {
            console.error(`Failed to load boards for project ${project.id}:`, error);
            return {
              ...project,
              boards_count: 0,
              tasks_count: 0
            };
          }
        })
      );
      
      setProjects(enhancedProjects);
      
      // Calculate stats
      const totalBoards = enhancedProjects.reduce((sum, p) => sum + (p.boards_count || 0), 0);
      const totalTasks = enhancedProjects.reduce((sum, p) => sum + (p.tasks_count || 0), 0);
      const activeProjects = enhancedProjects.filter(p => (p.boards_count || 0) > 0).length;
      
      setStats({
        totalProjects: enhancedProjects.length,
        totalBoards,
        totalTasks,
        activeProjects
      });

      // Log successful data load
      trackEvent('DATA_LOAD_SUCCESS', {
        page: 'projects',
        projects_count: enhancedProjects.length,
        total_boards: totalBoards,
        total_tasks: totalTasks
      });

    } catch (error: any) {
      console.error('Failed to load projects data:', error);
      toast.error('Failed to load projects');
      
      // Log data loading error
      trackEvent('DATA_LOAD_ERROR', {
        page: 'projects',
        error: error.message || 'Unknown error'
      });
    } finally {
      setLoading(false);
      setInitialLoading(false); // Only set this to false after first load
    }
  };

  const handleProjectClick = (projectId: string) => {
    // Log project click
    trackEvent('PROJECT_CLICK', {
      page: 'projects',
      project_id: projectId
    });
    
    router.push(`/projects/${projectId}`);
  };

  const handleCreateProject = () => {
    // Log create project click
    trackEvent('CREATE_PROJECT_CLICK', {
      page: 'projects',
      current_projects_count: projects.length
    });
    
    setShowCreateProjectModal(true);
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

  const getProjectStatus = (project: Project) => {
    if (!project.boards_count || project.boards_count === 0) return 'Not started';
    if (project.tasks_count && project.tasks_count > 10) return 'Active';
    return 'In progress';
  };

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Projects</h1>
            <p className="text-secondary mt-1">
              Manage and track all your projects in one place
            </p>
          </div>
          {user.role !== 'user' && (
            <Button onClick={handleCreateProject} leftIcon={<Plus className="h-4 w-4" />}>
              Create Project
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Briefcase className="h-8 w-8 text-accent" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted">Total Projects</p>
                <p className="text-2xl font-semibold text-primary">
                  {loading ? '...' : stats.totalProjects}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FolderOpen className="h-8 w-8 text-info" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted">Active Projects</p>
                <p className="text-2xl font-semibold text-primary">
                  {loading ? '...' : stats.activeProjects}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-success" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted">Total Boards</p>
                <p className="text-2xl font-semibold text-primary">
                  {loading ? '...' : stats.totalBoards}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-warning" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted">Total Tasks</p>
                <p className="text-2xl font-semibold text-primary">
                  {loading ? '...' : stats.totalTasks}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Projects List */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-primary">All Projects</h2>
            <span className="text-sm text-muted">
              {loading ? 'Loading...' : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          <div className="min-h-[400px] lg:min-h-[800px]">
            {initialLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} height="14rem" />
                ))}
              </div>
            ) : projects.length > 0 ? (
              <motion.div 
                className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6"
                layout
              >
                <AnimatePresence mode="popLayout">
                  {projects.map((project, index) => (
                    <motion.button
                      key={project.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -20 }}
                      transition={{
                        duration: 0.3,
                        delay: initialLoading ? index * 0.1 : 0, // Stagger only on initial load
                        ease: 'easeOut'
                      }}
                      whileHover={{ 
                        scale: 1.02,
                        transition: { duration: 0.2 }
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleProjectClick(project.id)}
                      className="text-left p-6 rounded-lg border border-secondary hover:border-accent hover:bg-interactive-secondary-hover transition-all duration-200 group h-64 flex flex-col"
                      data-testid={`project-card-${project.id}`}
                    >
                      {/* Top Section - Icon, Title, Status */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-4 flex-1 min-w-0">
                          <div className="flex-shrink-0 p-2 rounded-lg bg-accent-10 border border-accent-20">
                            {(() => {
                              const IconComponent = getIconComponent(project.icon || 'folder');
                              return <IconComponent className="h-5 w-5 text-accent" />;
                            })()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-primary group-hover:text-accent transition-colors line-clamp-2 leading-tight">
                              {project.name}
                            </h3>
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                            !project.boards_count || project.boards_count === 0 
                              ? 'bg-muted/30 text-muted' 
                              : project.tasks_count && project.tasks_count > 10 
                                ? 'bg-success/10 text-success border border-success/20' 
                                : 'bg-info/10 text-info border border-info/20'
                          }`}>
                            {getProjectStatus(project)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Description - Flexible space */}
                      <div className="flex-1 mb-4">
                        <p className="text-sm text-secondary line-clamp-3 leading-relaxed">
                          {project.description || 'No description available'}
                        </p>
                      </div>
                      
                      {/* Bottom Section - Stats and Action */}
                      <div className="mt-auto space-y-3">
                        <div className="flex items-center justify-between text-xs text-muted">
                          <div className="flex items-center space-x-3">
                            <span>{project.boards_count || 0} boards</span>
                            <span>•</span>
                            <span>{project.tasks_count || 0} tasks</span>
                          </div>
                          <span>{formatDate(project.created_at)}</span>
                        </div>
                        
                        <div className="pt-3 border-t border-secondary flex items-center justify-between">
                          <span className="text-xs text-muted">
                            View details
                          </span>
                          <ArrowRight className="h-4 w-4 text-muted group-hover:text-accent transition-colors" />
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="text-center py-12"
                >
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ 
                      type: 'spring',
                      stiffness: 300,
                      damping: 20,
                      delay: 0.1
                    }}
                  >
                    <FolderOpen className="mx-auto h-12 w-12 text-muted mb-4" />
                  </motion.div>
                  <h3 className="text-lg font-medium text-primary mb-2">No projects yet</h3>
                  <p className="text-secondary mb-6 max-w-md mx-auto">
                    {user.role === 'user' 
                      ? "You don't have access to any projects yet. Contact your manager to be added to a project."
                      : "Get started by creating your first project to organize your work and collaborate with your team."
                    }
                  </p>
                  {user.role !== 'user' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Button onClick={handleCreateProject} leftIcon={<Plus className="h-4 w-4" />}>
                        Create Your First Project
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </Card>
      </div>

      {showCreateProjectModal && (
        <CreateProjectModal
          isOpen={showCreateProjectModal}
          onClose={() => setShowCreateProjectModal(false)}
          onProjectCreated={() => {
            setShowCreateProjectModal(false);
            loadProjectsData();
          }}
        />
      )}
    </DashboardLayout>
  );
} 