'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown,
  ChevronRight,
  Home,
  Users,
  Calendar,
  Bell,
  FolderOpen,
  LogOut,
  Zap,
  X,
  ArrowRight,
  Search,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { getIconComponent } from '@/components/ui/IconSelector';
import apiClient from '@/services/apiClient';
import authService from '@/services/authService';
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
  icon?: string;
}

interface Board {
  id: string;
  name: string;
  description: string;
  project_id: string;
  icon?: string;
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const getNavigationItems = (userRole: string) => {
  const baseNavigation = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'Discover', href: '/discover', icon: Search },
    { name: 'Members', href: '/members', icon: Users },
  ];

  // Add admin panel for admin users
  if (userRole === 'admin') {
    baseNavigation.push({ name: 'Admin Panel', href: '/admin', icon: Shield });
  }

  return baseNavigation;
};

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
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

  const handleLogout = async () => {
    try {
      console.log('🔄 Starting logout process...');
      
      // Call the proper authService logout method
      await authService.logout();
      
      console.log('✅ Logout successful, redirecting to login');
      toast.success('Logged out successfully');
      
      // Force redirect to login page
      router.push('/login');
      
      // Force reload to ensure all state is cleared
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('❌ Logout failed:', error);
      
      // Fallback: manually clear everything and redirect
      localStorage.removeItem('session_id');
      localStorage.removeItem('user');
      apiClient.clearSession();
      
      toast.error('Logout encountered an issue but session was cleared');
      
      // Force redirect regardless
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      } else {
        router.push('/login');
      }
    }
  };

  const truncateText = (text: string, maxLength: number = 20) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (!user) {
    return null; // Don't render sidebar if no user
  }

  const navigation = getNavigationItems(user.role);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo/Brand */}
      <div className="border-b border-secondary shadow-[0_1px_3px_0_rgb(0,0,0,0.1)]">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-2">
            <motion.div
              className="flex items-center justify-center w-8 h-8 bg-accent rounded-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Zap className="h-5 w-5 text-primary" />
            </motion.div>
            <h1 className="text-lg font-semibold text-primary">Hub</h1>
          </div>
          
          {/* Close button for mobile */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="lg:hidden"
          >
            <X className="h-4 w-4 text-muted" />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {/* Main Navigation */}
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <motion.div
              key={item.name}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href={item.href}
                className={cn(
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all duration-200',
                  isActive
                    ? 'bg-accent-2 text-accent'
                    : 'text-secondary hover:bg-interactive-secondary-hover hover:text-primary'
                )}
                onClick={() => onClose && onClose()} // Close mobile menu on navigation
                data-testid={`nav-link-${item.name.toLowerCase().replace(' ', '-')}`}
              >
                <item.icon
                  className={cn(
                    'mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200',
                    isActive ? 'text-accent' : 'text-muted group-hover:text-secondary'
                  )}
                />
                <span className="truncate">{item.name}</span>
              </Link>
            </motion.div>
          );
        })}

        {/* Projects Section */}
        <div className="mt-6">
          <div className={cn(
            "group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md transition-all duration-200",
            pathname === '/projects' ? 'bg-accent-2' : 'hover:bg-interactive-secondary-hover'
          )}>
            <FolderOpen className={cn(
              "mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200",
              pathname === '/projects' ? 'text-accent' : 'text-muted group-hover:text-secondary'
            )} />
            
            {/* Clickable Projects text - navigates to projects list */}
            <Link
              href="/projects"
              className={cn(
                "flex-1 text-left truncate transition-colors duration-200",
                pathname === '/projects' ? 'text-accent' : 'text-secondary group-hover:text-primary'
              )}
              onClick={() => {
                if (onClose) onClose();
              }}
              data-testid="projects-link"
            >
              Projects
            </Link>
            
            {/* Redirect to projects list button */}
            <motion.button
              onClick={() => {
                router.push('/projects');
                if (onClose) onClose();
              }}
              className="p-1 rounded hover:bg-interactive-primary/10 transition-colors duration-200 mr-1"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Go to Projects List"
              data-testid="projects-redirect-button"
            >
              <ArrowRight className="h-4 w-4 text-muted hover:text-primary transition-colors duration-200" />
            </motion.button>
            
            {/* Dropdown toggle button */}
            <motion.button
              onClick={() => setProjectsExpanded(!projectsExpanded)}
              className="p-1 rounded hover:bg-interactive-primary/10 transition-colors duration-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title={projectsExpanded ? "Collapse Projects" : "Expand Projects"}
              data-testid="projects-toggle-button"
            >
              <motion.div
                animate={{ rotate: projectsExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4 text-muted hover:text-primary transition-colors duration-200" />
              </motion.div>
            </motion.button>
          </div>

          <AnimatePresence>
            {projectsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="mt-1 space-y-1">
                  {projects.map((project, index) => {
                    const projectPath = `/projects/${project.id}`;
                    const isProjectActive = pathname.startsWith(projectPath);
                    const isExpanded = expandedProjects.has(project.id);
                    const projectBoards = boards[project.id] || [];
                    
                    return (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        {/* Project Item */}
                        <div className="flex items-center min-w-0">
                          {projectBoards.length > 0 && (
                            <motion.button
                              onClick={() => toggleProjectExpansion(project.id)}
                              className="flex items-center p-1 rounded hover:bg-interactive-secondary-hover transition-colors duration-200 flex-shrink-0"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <motion.div
                                animate={{ rotate: isExpanded ? 90 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <ChevronRight className="h-3 w-3 text-muted" />
                              </motion.div>
                            </motion.button>
                          )}
                          <motion.div
                            className="flex-1 min-w-0"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Link
                              href={projectPath}
                              className={cn(
                                'flex items-center pl-2 pr-2 py-2 text-sm rounded-md transition-all duration-200 min-w-0',
                                isProjectActive
                                  ? 'bg-accent-2 text-accent'
                                  : 'text-secondary hover:bg-interactive-secondary-hover hover:text-primary'
                              )}
                              title={project.name}
                              onClick={() => onClose && onClose()}
                              data-testid={`project-link-${project.id}`}
                            >
                              {(() => {
                                const IconComponent = getIconComponent(project.icon || 'folder');
                                return <IconComponent className="mr-2 h-4 w-4 flex-shrink-0 transition-colors duration-200" />;
                              })()}
                              <span className="truncate">{truncateText(project.name, 14)}</span>
                            </Link>
                          </motion.div>
                        </div>

                        {/* Project Boards */}
                        <AnimatePresence>
                          {isExpanded && projectBoards.length > 0 && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: 'easeInOut' }}
                              className="ml-6 overflow-hidden"
                            >
                              <div className="mt-1 space-y-1">
                                {projectBoards.map((board, boardIndex) => {
                                  const boardPath = `/boards/${board.id}`;
                                  const isBoardActive = pathname === boardPath;
                                  return (
                                    <motion.div
                                      key={board.id}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: boardIndex * 0.03 }}
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      className="min-w-0"
                                    >
                                      <Link
                                        href={boardPath}
                                        className={cn(
                                          'group flex items-center pl-4 pr-2 py-1 text-xs rounded-md transition-all duration-200 min-w-0',
                                          isBoardActive
                                            ? 'bg-accent-2 text-accent'
                                            : 'text-muted hover:bg-interactive-secondary-hover hover:text-secondary'
                                        )}
                                        title={board.name}
                                        onClick={() => onClose && onClose()}
                                        data-testid={`board-link-${board.id}`}
                                      >
                                        {(() => {
                                          const IconComponent = getIconComponent(board.icon || 'kanban');
                                          return <IconComponent className="mr-2 h-3 w-3 flex-shrink-0 transition-colors duration-200" />;
                                        })()}
                                        <span className="truncate">{truncateText(board.name, 12)}</span>
                                      </Link>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                  
                  {projects.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="pl-8 pr-2 py-2 text-sm text-muted"
                    >
                      No projects available
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Logout Button */}
      <div className="px-4 py-4 border-t border-secondary">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-secondary hover:text-primary"
          leftIcon={<LogOut className="h-4 w-4" />}
          data-testid="logout-button"
        >
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64 lg:overflow-y-auto bg-card shadow-lg border-r border-secondary">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-background-overlay lg:hidden"
              onClick={onClose}
            />
            
            {/* Sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto bg-card shadow-lg border-r border-secondary lg:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
} 