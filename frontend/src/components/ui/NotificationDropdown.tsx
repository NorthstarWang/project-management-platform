import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { NotificationCard } from '@/components/ui/NotificationCard';
import { useNotifications } from '@/hooks/useNotifications';
import { useRouter } from 'next/navigation';

interface NotificationDropdownProps {
  className?: string;
}

export function NotificationDropdown({ className }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(showUnreadOnly);
    }
  }, [isOpen, showUnreadOnly, fetchNotifications]);

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    // Refresh the list after marking all as read
    fetchNotifications(showUnreadOnly);
  };

  const handleViewAllNotifications = () => {
    setIsOpen(false);
    router.push('/notifications');
  };

  const displayedNotifications = showUnreadOnly 
    ? notifications.filter(n => !n.read)
    : notifications.slice(0, 5); // Show only first 5 in dropdown

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Notification Bell Button */}
      <Button 
        variant="ghost" 
        size="sm" 
        className="relative transition-all duration-300"
        onClick={handleToggleDropdown}
        data-testid="notification-bell"
      >
        <Bell className="h-5 w-5 text-muted transition-colors duration-300" />
        {/* Notification badge */}
        {unreadCount > 0 && (
          <Badge
            className="absolute -top-1 -right-1 h-5 w-5 text-xs rounded-full flex items-center justify-center min-w-[20px] px-1"
            variant="destructive"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <Card className="absolute right-0 top-full mt-2 w-96 max-h-[600px] overflow-hidden shadow-lg border border-card z-[80]">
          {/* Header */}
          <div className="p-4 border-b border-card">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary">Notifications</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="text-xs"
                    data-testid="mark-all-read"
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Mark all read
                  </Button>
                )}
              </div>
            </div>
            
            {/* Filter Toggle */}
            <div className="flex items-center space-x-4 mt-3">
              <button
                onClick={() => setShowUnreadOnly(false)}
                className={`text-sm transition-colors ${
                  !showUnreadOnly ? 'text-accent font-medium' : 'text-secondary hover:text-primary'
                }`}
                data-testid="show-all-notifications"
              >
                All
              </button>
              <button
                onClick={() => setShowUnreadOnly(true)}
                className={`text-sm transition-colors ${
                  showUnreadOnly ? 'text-accent font-medium' : 'text-secondary hover:text-primary'
                }`}
                data-testid="show-unread-notifications"
              >
                Unread ({unreadCount})
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4">
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex space-x-3">
                        <div className="w-8 h-8 bg-surface rounded"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-surface rounded w-3/4"></div>
                          <div className="h-3 bg-surface rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <p className="text-error text-sm">{error}</p>
              </div>
            ) : displayedNotifications.length > 0 ? (
              <div>
                {displayedNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    showMarkAsRead={false}
                    compact
                    closeNotificationDropdown={() => setIsOpen(false)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Bell className="mx-auto h-12 w-12 text-muted" />
                <h3 className="mt-2 text-sm font-medium text-primary">
                  {showUnreadOnly ? 'No unread notifications' : 'No notifications'}
                </h3>
                <p className="mt-1 text-sm text-muted">
                  {showUnreadOnly 
                    ? "You're all caught up!" 
                    : 'We\'ll notify you when something happens.'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {!loading && displayedNotifications.length > 0 && (
            <>
              <Separator />
              <div className="p-3">
                <Button
                  variant="ghost"
                  className="w-full text-sm"
                  onClick={handleViewAllNotifications}
                  data-testid="view-all-notifications"
                >
                  <ExternalLink className="h-3 w-3 mr-2" />
                  View all notifications
                </Button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
} 