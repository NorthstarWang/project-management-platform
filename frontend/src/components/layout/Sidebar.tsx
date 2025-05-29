'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  FolderOpen, 
  Calendar, 
  Users, 
  ChevronDown,
  ChevronRight,
  LogOut,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import apiClient from '@/services/apiClient';
import { toast } from '@/components/ui/CustomToast';

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
}

interface Board {
  id: string;
  name: string;
  description: string;
  project_id: string;
}

const navigation = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Members', href: '/members', icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [boards, setBoards] = useState<Record<string, Board[]>>({});
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Load user's projects
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await apiClient.get('/api/projects');
      setProjects(response.data);
      
      // Load boards for each project
      const boardsData: Record<string, Board[]> = {};
      for (const project of response.data) {
        try {
          const boardsResponse = await apiClient.get(`/api/projects/${project.id}/boards`);
          boardsData[project.id] = boardsResponse.data;
        } catch (error) {
          console.error(`Failed to load boards for project ${project.id}:`, error);
          boardsData[project.id] = [];
        }
      }
      setBoards(boardsData);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const handleLogout = () => {
    // Clear user data and session
    apiClient.clearSession();
    
    toast.success('Logged out successfully');
    router.push('/login');
  };

  const truncateText = (text: string, maxLength: number = 20) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (!user) {
    return null; // Don't render sidebar if no user
  }

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-card shadow-lg lg:block border-r border-card">
      <div className="flex h-full flex-col">
        {/* Logo/Brand */}
        <div className="flex h-16 items-center justify-center px-6 border-b border-secondary">
          <h1 className="text-xl font-bold text-primary">ProjectHub</h1>
        </div>

        {/* User Profile */}
        <div className="px-6 py-4 border-b border-secondary">
          <div className="flex items-center space-x-3">
            <Avatar 
              size="sm"
              name={user.full_name}
              alt={user.full_name}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary truncate">
                {user.full_name}
              </p>
              <p className="text-xs text-muted capitalize">
                {user.role}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {/* Main Navigation */}
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-accent-2 text-accent'
                    : 'text-secondary hover:bg-interactive-secondary-hover hover:text-primary'
                )}
              >
                <item.icon
                  className={cn(
                    'mr-3 h-5 w-5 flex-shrink-0',
                    isActive ? 'text-accent' : 'text-muted group-hover:text-secondary'
                  )}
                />
                {item.name}
              </Link>
            );
          })}

          {/* Projects Section */}
          <div className="mt-6">
            <button
              onClick={() => setProjectsExpanded(!projectsExpanded)}
              className="group flex w-full items-center px-2 py-2 text-sm font-medium text-secondary rounded-md hover:bg-interactive-secondary-hover hover:text-primary"
            >
              <FolderOpen className="mr-3 h-5 w-5 flex-shrink-0 text-muted group-hover:text-secondary" />
              Projects
              <ChevronDown
                className={cn(
                  'ml-auto h-4 w-4 transition-transform',
                  projectsExpanded ? 'rotate-180' : ''
                )}
              />
            </button>

            {projectsExpanded && (
              <div className="mt-1 space-y-1">
                {projects.map((project) => {
                  const projectPath = `/projects/${project.id}`;
                  const isProjectActive = pathname.startsWith(projectPath);
                  const isExpanded = expandedProjects.has(project.id);
                  const projectBoards = boards[project.id] || [];
                  
                  return (
                    <div key={project.id}>
                      {/* Project Item */}
                      <div className="flex items-center">
                        <button
                          onClick={() => toggleProjectExpansion(project.id)}
                          className="flex items-center p-1 rounded hover:bg-interactive-secondary-hover"
                        >
                          {projectBoards.length > 0 ? (
                            isExpanded ? (
                              <ChevronDown className="h-3 w-3 text-muted" />
                            ) : (
                              <ChevronRight className="h-3 w-3 text-muted" />
                            )
                          ) : (
                            <div className="h-3 w-3" />
                          )}
                        </button>
                        <Link
                          href={projectPath}
                          className={cn(
                            'flex-1 flex items-center pl-2 pr-2 py-2 text-sm rounded-md transition-colors',
                            isProjectActive
                              ? 'bg-accent-2 text-accent'
                              : 'text-secondary hover:bg-interactive-secondary-hover hover:text-primary'
                          )}
                          title={project.name}
                        >
                          <span className="truncate">{truncateText(project.name, 18)}</span>
                        </Link>
                      </div>

                      {/* Project Boards */}
                      {isExpanded && projectBoards.length > 0 && (
                        <div className="ml-6 mt-1 space-y-1">
                          {projectBoards.map((board) => {
                            const boardPath = `/boards/${board.id}`;
                            const isBoardActive = pathname === boardPath;
                            return (
                              <Link
                                key={board.id}
                                href={boardPath}
                                className={cn(
                                  'group flex items-center pl-4 pr-2 py-1 text-xs rounded-md transition-colors',
                                  isBoardActive
                                    ? 'bg-accent-2 text-accent'
                                    : 'text-muted hover:bg-interactive-secondary-hover hover:text-secondary'
                                )}
                                title={board.name}
                              >
                                <Layers className="mr-2 h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{truncateText(board.name, 16)}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {projects.length === 0 && (
                  <div className="pl-8 pr-2 py-2 text-sm text-muted">
                    No projects available
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* Logout Button */}
        <div className="px-4 py-4 border-t border-secondary">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-secondary hover:text-primary"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
} 