'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  CheckSquare, 
  MessageCircle,
  Reply,
  ChevronRight,
  Loader2,
  X
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { getIconComponent } from '@/components/ui/IconSelector';
import apiClient from '@/services/apiClient';

interface SearchResult {
  projects: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    team_name: string | null;
    type: 'project';
  }>;
  boards: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    project_id: string;
    project_name: string | null;
    type: 'board';
  }>;
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    task_type: string;
    assignee: {
      id: string;
      name: string;
      username: string;
    } | null;
    board_id: string;
    board_name: string;
    project_id: string;
    project_name: string;
    list_id: string;
    type: 'task';
  }>;
  comments: Array<{
    id: string;
    content: string;
    author: {
      id: string;
      name: string;
      username: string;
    } | null;
    task_id: string;
    task_title: string;
    board_id: string;
    board_name: string;
    project_id: string;
    project_name: string;
    created_at: string;
    type: 'comment' | 'reply';
    parent_comment_id?: string;
  }>;
  total_count: number;
}

interface SearchResultsProps {
  query: string;
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
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

export function SearchResults({ query, isOpen, onClose, anchorRef }: SearchResultsProps) {
  const router = useRouter();
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const resultsRef = useRef<HTMLDivElement>(null);

  // Calculate position based on anchor element
  useEffect(() => {
    if (anchorRef.current && isOpen) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width
      });
    }
  }, [anchorRef, isOpen]);

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose, anchorRef]);

  // Perform search
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.length >= 2) {
        setLoading(true);
        const startTime = Date.now();
        
        try {
          const response = await apiClient.get(`/api/search?q=${encodeURIComponent(query)}`);
          setResults(response.data);
          
          // Track successful search
          trackEvent('GLOBAL_SEARCH_PERFORMED', {
            query,
            results_count: response.data.total_count,
            results_breakdown: {
              projects: response.data.projects.length,
              boards: response.data.boards.length,
              tasks: response.data.tasks.length,
              comments: response.data.comments.length
            },
            response_time_ms: Date.now() - startTime,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Search failed:', error);
          setResults(null);
          
          // Track search error
          trackEvent('GLOBAL_SEARCH_ERROR', {
            query,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          });
        } finally {
          setLoading(false);
        }
      } else {
        setResults(null);
      }
    }, 300); // Debounce search

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const handleProjectClick = (projectId: string) => {
    // Track search result click
    trackEvent('SEARCH_RESULT_CLICK', {
      result_type: 'project',
      result_id: projectId,
      query,
      position_in_results: results?.projects.findIndex(p => p.id === projectId) ?? -1,
      timestamp: new Date().toISOString()
    });
    
    router.push(`/projects/${projectId}`);
    onClose();
  };

  const handleBoardClick = (boardId: string) => {
    // Track search result click
    trackEvent('SEARCH_RESULT_CLICK', {
      result_type: 'board',
      result_id: boardId,
      query,
      position_in_results: results?.boards.findIndex(b => b.id === boardId) ?? -1,
      timestamp: new Date().toISOString()
    });
    
    router.push(`/boards/${boardId}`);
    onClose();
  };

  const handleTaskClick = async (task: SearchResult['tasks'][0]) => {
    // Track search result click
    trackEvent('SEARCH_RESULT_CLICK', {
      result_type: 'task',
      result_id: task.id,
      task_status: task.status,
      task_priority: task.priority,
      query,
      position_in_results: results?.tasks.findIndex(t => t.id === task.id) ?? -1,
      timestamp: new Date().toISOString()
    });
    
    // Navigate to board page with task info in URL params
    router.push(`/boards/${task.board_id}?task=${task.id}&list=${task.list_id}`);
    onClose();
  };

  const handleCommentClick = async (comment: SearchResult['comments'][0]) => {
    // Track search result click
    trackEvent('SEARCH_RESULT_CLICK', {
      result_type: comment.type,
      result_id: comment.id,
      comment_task_id: comment.task_id,
      query,
      position_in_results: results?.comments.findIndex(c => c.id === comment.id) ?? -1,
      timestamp: new Date().toISOString()
    });
    
    // Navigate to board page with task and comment info in URL params
    router.push(`/boards/${comment.board_id}?task=${comment.task_id}&comment=${comment.id}`);
    onClose();
  };

  const getResultIcon = (type: string, icon?: string) => {
    switch (type) {
      case 'project':
        const ProjectIcon = getIconComponent(icon || 'folder');
        return <ProjectIcon className="h-4 w-4" />;
      case 'board':
        const BoardIcon = getIconComponent(icon || 'kanban');
        return <BoardIcon className="h-4 w-4" />;
      case 'task':
        return <CheckSquare className="h-4 w-4" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4" />;
      case 'reply':
        return <Reply className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-error';
      case 'medium':
        return 'text-warning';
      case 'low':
        return 'text-success';
      default:
        return 'text-muted';
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <mark key={index} className="bg-accent/10 text-accent font-medium rounded px-0.5">{part}</mark> : 
        part
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={resultsRef}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          width: Math.min(position.width, 600),
          maxWidth: '600px',
          zIndex: 50
        }}
        className="bg-card rounded-lg shadow-xl border border-card max-h-[70vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-secondary flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted" />
            ) : (
              <Search className="h-4 w-4 text-muted" />
            )}
            <span className="text-sm text-secondary">
              {loading ? 'Searching...' : 
               results ? `${results.total_count} result${results.total_count !== 1 ? 's' : ''} found` : 
               query.length < 2 ? 'Type at least 2 characters' : 'No results'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-interactive-secondary-hover transition-colors"
            aria-label="Close search results"
          >
            <X className="h-4 w-4 text-muted" />
          </button>
        </div>

        {/* Results */}
        {results && results.total_count > 0 && (
          <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
            {/* Projects */}
            {results.projects.length > 0 && (
              <div className="p-2">
                <div className="px-2 py-1 text-xs font-medium text-muted uppercase">
                  Projects ({results.projects.length})
                </div>
                {results.projects.map((project, index) => (
                  <motion.button
                    key={project.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleProjectClick(project.id)}
                    className="w-full p-3 rounded-lg hover:bg-interactive-secondary-hover transition-colors flex items-start space-x-3 text-left group"
                  >
                    <div className="flex-shrink-0 p-2 rounded-lg bg-accent-10 border border-accent-20 text-accent">
                      {getResultIcon('project', project.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-primary group-hover:text-accent transition-colors">
                          {highlightMatch(project.name, query)}
                        </span>
                        {project.team_name && (
                          <Badge variant="secondary" size="sm">{project.team_name}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-secondary line-clamp-1 mt-1">
                        {highlightMatch(project.description, query)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                ))}
              </div>
            )}

            {/* Boards */}
            {results.boards.length > 0 && (
              <div className="p-2 border-t border-secondary">
                <div className="px-2 py-1 text-xs font-medium text-muted uppercase">
                  Boards ({results.boards.length})
                </div>
                {results.boards.map((board, index) => (
                  <motion.button
                    key={board.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleBoardClick(board.id)}
                    className="w-full p-3 rounded-lg hover:bg-interactive-secondary-hover transition-colors flex items-start space-x-3 text-left group"
                  >
                    <div className="flex-shrink-0 p-2 rounded-lg bg-info/10 border border-info/20 text-info">
                      {getResultIcon('board', board.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-primary group-hover:text-accent transition-colors">
                          {highlightMatch(board.name, query)}
                        </span>
                        {board.project_name && (
                          <span className="text-xs text-muted">in {board.project_name}</span>
                        )}
                      </div>
                      <p className="text-sm text-secondary line-clamp-1 mt-1">
                        {highlightMatch(board.description, query)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                ))}
              </div>
            )}

            {/* Tasks */}
            {results.tasks.length > 0 && (
              <div className="p-2 border-t border-secondary">
                <div className="px-2 py-1 text-xs font-medium text-muted uppercase">
                  Tasks ({results.tasks.length})
                </div>
                {results.tasks.map((task, index) => (
                  <motion.button
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleTaskClick(task)}
                    className="w-full p-3 rounded-lg hover:bg-interactive-secondary-hover transition-colors flex items-start space-x-3 text-left group"
                  >
                    <div className="flex-shrink-0 p-2 rounded-lg bg-success/10 border border-success/20 text-success">
                      {getResultIcon('task')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-primary group-hover:text-accent transition-colors">
                          {highlightMatch(task.title, query)}
                        </span>
                        <Badge variant="secondary" size="sm" className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        {task.assignee && (
                          <div className="flex items-center space-x-1">
                            <Avatar size="xs" name={task.assignee.name} />
                            <span className="text-xs text-muted">{task.assignee.name}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-secondary line-clamp-1 mt-1">
                        {task.description ? highlightMatch(task.description, query) : 'No description'}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        {task.board_name} • {task.project_name}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                ))}
              </div>
            )}

            {/* Comments */}
            {results.comments.length > 0 && (
              <div className="p-2 border-t border-secondary">
                <div className="px-2 py-1 text-xs font-medium text-muted uppercase">
                  Comments ({results.comments.length})
                </div>
                {results.comments.map((comment, index) => (
                  <motion.button
                    key={comment.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleCommentClick(comment)}
                    className="w-full p-3 rounded-lg hover:bg-interactive-secondary-hover transition-colors flex items-start space-x-3 text-left group"
                  >
                    <div className="flex-shrink-0 p-2 rounded-lg bg-warning/10 border border-warning/20 text-warning">
                      {getResultIcon(comment.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        {comment.author && (
                          <>
                            <Avatar size="xs" name={comment.author.name} />
                            <span className="text-sm font-medium text-primary">
                              {comment.author.name}
                            </span>
                          </>
                        )}
                        <span className="text-xs text-muted">
                          {comment.type === 'reply' ? 'replied' : 'commented'} on
                        </span>
                        <span className="text-sm font-medium text-primary">
                          {comment.task_title}
                        </span>
                      </div>
                      <p className="text-sm text-secondary line-clamp-2 mt-1">
                        {highlightMatch(comment.content, query)}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        {comment.board_name} • {comment.project_name}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {results && results.total_count === 0 && query.length >= 2 && (
          <div className="p-8 text-center">
            <Search className="h-12 w-12 text-muted mx-auto mb-3" />
            <p className="text-secondary">No results found for &ldquo;{query}&rdquo;</p>
            <p className="text-sm text-muted mt-1">Try searching with different keywords</p>
          </div>
        )}

        {/* Minimum characters message */}
        {query.length < 2 && (
          <div className="p-8 text-center">
            <Search className="h-12 w-12 text-muted mx-auto mb-3" />
            <p className="text-secondary">Type at least 2 characters to search</p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
} 