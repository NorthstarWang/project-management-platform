'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { NotificationCard } from '@/components/ui/NotificationCard';
import { useNotifications } from '@/hooks/useNotifications';
import { 
  Bell, 
  CheckCheck, 
  Filter,
  RefreshCw,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { track } from '@/services/analyticsLogger';

interface User {
  id: string;
  username: string;
  full_name: string;
  role: string;
  email: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refreshNotifications
  } = useNotifications();

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    
    // Log notifications page view
    track('PAGE_VIEW', {  
      text: 'User viewed notifications page',
      page_name: 'notifications',
      page_url: '/notifications',
      user_id: parsedUser.id,
      user_role: parsedUser.role
    });
  }, [router]);

  // Filter notifications based on current filter and search query
  const filteredNotifications = notifications.filter(notification => {
    // Apply filter
    if (filter === 'unread' && notification.read) return false;
    if (filter === 'read' && !notification.read) return false;
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query) ||
        notification.type.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const handleFilterChange = (newFilter: 'all' | 'unread' | 'read') => {
    setFilter(newFilter);
    
    // Log filter change
    track('NOTIFICATION_FILTER_CHANGE', {
      text: `User changed filter to ${newFilter}`,
      page: 'notifications',
      old_filter: filter,
      new_filter: newFilter,
      user_id: user?.id
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    
    // Log mark all as read action
    track('NOTIFICATIONS_MARK_ALL_READ', {
      text: 'User marked all notifications as read',
      page: 'notifications',
      count: unreadCount,
      user_id: user?.id
    });
  };

  const handleRefresh = () => {
    refreshNotifications();
    
    // Log refresh action
    track('NOTIFICATIONS_REFRESH', {
      text: 'User refreshed notifications',
      page: 'notifications',
      user_id: user?.id
    });
  };

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-card rounded-lg shadow-card p-6 border border-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Bell className="h-8 w-8 text-accent" />
              <div>
                <h1 className="text-2xl font-bold text-primary">Notifications</h1>
                <p className="text-secondary mt-1">
                  Stay updated with your tasks and team activities
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
                data-testid="refresh-notifications"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  data-testid="mark-all-read-page"
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark all read ({unreadCount})
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            {/* Filters */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted" />
              <span className="text-sm text-secondary mr-2">Filter:</span>
              <div className="flex items-center space-x-2">
                <Button
                  variant={filter === 'all' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => handleFilterChange('all')}
                  data-testid="filter-all"
                >
                  All
                  <Badge variant="secondary" className="ml-2">
                    {notifications.length}
                  </Badge>
                </Button>
                <Button
                  variant={filter === 'unread' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => handleFilterChange('unread')}
                  data-testid="filter-unread"
                >
                  Unread
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount}
                  </Badge>
                </Button>
                <Button
                  variant={filter === 'read' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => handleFilterChange('read')}
                  data-testid="filter-read"
                >
                  Read
                  <Badge variant="secondary" className="ml-2">
                    {notifications.length - unreadCount}
                  </Badge>
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-muted" />
              </div>
              <Input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-9"
                data-testid="search-notifications"
              />
            </div>
          </div>
        </Card>

        {/* Notifications List */}
        <Card className="p-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex space-x-4">
                    <div className="w-8 h-8 bg-surface rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-surface rounded w-3/4"></div>
                      <div className="h-3 bg-surface rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <Bell className="mx-auto h-12 w-12 text-error" />
              <h3 className="mt-2 text-sm font-medium text-primary">Error loading notifications</h3>
              <p className="mt-1 text-sm text-muted">{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={handleRefresh}
              >
                Try again
              </Button>
            </div>
          ) : filteredNotifications.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-primary">
                  {filter === 'all' && 'All Notifications'}
                  {filter === 'unread' && 'Unread Notifications'}
                  {filter === 'read' && 'Read Notifications'}
                  {searchQuery && ` matching "${searchQuery}"`}
                </h2>
                <span className="text-sm text-secondary">
                  {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="space-y-3">
                {filteredNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    showMarkAsRead={true}
                    compact={false}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Bell className="mx-auto h-12 w-12 text-muted" />
              <h3 className="mt-2 text-sm font-medium text-primary">
                {searchQuery ? 'No matching notifications' : 
                 filter === 'unread' ? 'No unread notifications' :
                 filter === 'read' ? 'No read notifications' :
                 'No notifications'}
              </h3>
              <p className="mt-1 text-sm text-muted">
                {searchQuery ? `No notifications match "${searchQuery}"` :
                 filter === 'unread' ? "You're all caught up!" :
                 filter === 'read' ? "You haven't read any notifications yet." :
                 'We\'ll notify you when something happens.'}
              </p>
              {searchQuery && (
                <Button
                  variant="ghost"
                  className="mt-4"
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
} 