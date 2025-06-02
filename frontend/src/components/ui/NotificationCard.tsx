import { Clock, Check, MessageSquare, UserPlus, Edit, Move, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Notification } from '@/services/notificationService';
import notificationRedirectionService from '@/services/notificationRedirection';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  showMarkAsRead?: boolean;
  compact?: boolean;
  closeNotificationDropdown?: () => void;
}

export function NotificationCard({ 
  notification, 
  onMarkAsRead, 
  showMarkAsRead = true,
  compact = false,
  closeNotificationDropdown
}: NotificationCardProps) {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return <UserPlus className="h-4 w-4 text-accent" />;
      case 'task_updated':
        return <Edit className="h-4 w-4 text-warning" />;
      case 'task_commented':
        return <MessageSquare className="h-4 w-4 text-info" />;
      case 'task_moved':
        return <Move className="h-4 w-4 text-secondary" />;
      case 'board_enrolled':
        return <UserPlus className="h-4 w-4 text-success" />;
      case 'project_assigned':
        return <UserPlus className="h-4 w-4 text-accent" />;
      default:
        return <Clock className="h-4 w-4 text-muted" />;
    }
  };

  const getNotificationTypeBadge = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return <Badge variant="info" size="sm">Assigned</Badge>;
      case 'task_updated':
        return <Badge variant="warning" size="sm">Updated</Badge>;
      case 'task_commented':
        return <Badge variant="info" size="sm">Comment</Badge>;
      case 'task_moved':
        return (
          <div className="inline-flex items-center rounded-full border border-secondary px-2 py-0.5 text-xs font-semibold text-secondary transition-colors">
            Moved
          </div>
        );
      case 'board_enrolled':
        return <Badge variant="success" size="sm">Board Access</Badge>;
      case 'project_assigned':
        return <Badge variant="info" size="sm">Project</Badge>;
      default:
        return <Badge variant="secondary" size="sm">Notification</Badge>;
    }
  };

  const formatTime = (dateString: string) => {
    // Handle different date formats - could be ISO string or Unix timestamp
    let date: Date;
    
    if (typeof dateString === 'string' && dateString.includes('-')) {
      // ISO date string format
      date = new Date(dateString);
    } else {
      // Assume Unix timestamp - check if it's in seconds or milliseconds
      const timestamp = typeof dateString === 'string' ? parseFloat(dateString) : dateString;
      // If timestamp is less than a reasonable date in milliseconds, it's probably in seconds
      if (timestamp < 10000000000) {
        date = new Date(timestamp * 1000); // Convert seconds to milliseconds
      } else {
        date = new Date(timestamp); // Already in milliseconds
      }
    }
    
    // Validate date
    if (isNaN(date.getTime())) {
      return 'Unknown';
    }
    
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else if (diffInMinutes < 10080) { // Less than 7 days
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
    } else {
      // For older dates, show actual date
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const handleNotificationClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('🎯 Notification clicked!', {
      notification,
      router_type: typeof router,
      router_methods: Object.keys(router || {}),
      router_push: typeof router?.push
    });

    // Prevent multiple clicks while redirecting
    if (isRedirecting) {
      console.log('⏳ Already redirecting, ignoring click');
      return;
    }

    // Mark as read if unread
    if (!notification.read && onMarkAsRead) {
      console.log('📖 Marking notification as read:', notification.id);
      onMarkAsRead(notification.id);
    }

    // Check if notification can be redirected
    const canRedirect = notificationRedirectionService.canRedirect(notification);
    console.log('🔍 Can redirect?', canRedirect);

    if (canRedirect) {
      try {
        setIsRedirecting(true);
        console.log('🚀 Starting redirection with router:', router);
        
        await notificationRedirectionService.redirectToNotification(notification, {
          router,
          closeNotificationDropdown
        });
        
        console.log('✅ Redirection completed successfully');
      } catch (error) {
        console.error('🚨 Failed to redirect notification:', error);
        // The redirection service now handles errors internally with user-friendly messages
        // No need to manually redirect to dashboard here as it's handled in the service
      } finally {
        setIsRedirecting(false);
      }
    } else {
      console.log('❌ Cannot redirect, going to dashboard');
      // If no specific redirection, just close dropdown and go to dashboard
      if (closeNotificationDropdown) {
        closeNotificationDropdown();
      }
      router.push('/dashboard');
    }
  };

  const handleMarkAsReadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('✅ Mark as read clicked:', notification.id);
    
    if (onMarkAsRead && !notification.read) {
      onMarkAsRead(notification.id);
    }
  };

  if (compact) {
    return (
      <div 
        className={`flex items-center p-3 hover:bg-surface transition-colors cursor-pointer ${
          !notification.read 
            ? 'bg-accent-15 shadow-sm' 
            : ''
        } ${isRedirecting ? 'opacity-75' : ''}`}
        style={{
          borderBottom: '1px solid var(--border-muted)',
          ...(notification.read ? {
            borderLeft: '4px solid transparent'
          } : {
            borderLeft: '4px solid var(--interactive-primary)',
            backgroundColor: 'var(--accent-bg-15)'
          })
        }}
        onClick={handleNotificationClick}
        data-testid={`notification-compact-${notification.id}`}
      >
        <div className="flex-shrink-0 mr-3">
          {isRedirecting ? (
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
          ) : (
            getNotificationIcon(notification.type)
          )}
        </div>
        
        <div className="flex-1 min-w-0 mr-3">
          <div className="flex items-center mb-1">
            <p className={`text-sm mr-3 ${notification.read ? 'text-secondary' : 'text-primary font-medium'}`}>
              {isRedirecting ? 'Opening...' : notification.title}
            </p>
            {!isRedirecting && getNotificationTypeBadge(notification.type)}
          </div>
          {!isRedirecting && (
            <p className="text-xs text-muted truncate">
              {notification.message}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-2 flex-shrink-0">
          {!isRedirecting && (
            <>
              <div className="text-xs text-muted text-right">
                {formatTime(notification.created_at)}
              </div>
              <div className="w-2 flex justify-center">
                {!notification.read && (
                  <div 
                    className="w-2 h-2 rounded-full shadow-sm"
                    style={{ 
                      backgroundColor: 'var(--interactive-primary)',
                      boxShadow: '0 0 0 1px rgba(var(--interactive-primary-rgb, 0, 211, 127), 0.2)'
                    }}
                  ></div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card 
      className={`p-4 transition-all duration-200 hover:shadow-md border cursor-pointer ${
        !notification.read ? 'border-accent shadow-sm' : 'border-card'
      } ${isRedirecting ? 'opacity-75' : ''}`}
      style={!notification.read ? {
        backgroundColor: 'var(--accent-bg-15)',
        borderColor: 'var(--interactive-primary)'
      } : {}}
      data-testid={`notification-card-${notification.id}`}
      onClick={handleNotificationClick}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">
          {isRedirecting ? (
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
          ) : (
            getNotificationIcon(notification.type)
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center">
              <p className={`text-sm font-medium mr-4 ${
                notification.read ? 'text-secondary' : 'text-primary'
              }`}>
                {isRedirecting ? 'Opening...' : notification.title}
              </p>
              {!isRedirecting && getNotificationTypeBadge(notification.type)}
            </div>
            {!notification.read && !isRedirecting && (
              <div 
                className="w-2 h-2 rounded-full flex-shrink-0 mt-2 shadow-sm"
                style={{ 
                  backgroundColor: 'var(--interactive-primary)',
                  boxShadow: '0 0 0 1px rgba(var(--interactive-primary-rgb, 0, 211, 127), 0.2)'
                }}
              ></div>
            )}
          </div>
          
          {!isRedirecting && (
            <p className={`text-sm mb-3 ${
              notification.read ? 'text-muted' : 'text-secondary'
            }`}>
              {notification.message}
            </p>
          )}
          
          {!isRedirecting && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs text-muted">
                <Clock className="h-3 w-3" />
                <span>{formatTime(notification.created_at)}</span>
              </div>
              
              {showMarkAsRead && !notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAsReadClick}
                  className="text-xs"
                  data-testid={`mark-read-${notification.id}`}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark as read
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
} 