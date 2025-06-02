'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { NotificationCard } from '@/components/ui/NotificationCard';
import { useNotifications } from '@/hooks/useNotifications';
import { 
  TestTube,
  Bell,
  RefreshCw,
  Database
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import { toast } from '@/components/ui/CustomToast';

interface User {
  id: string;
  username: string;
  full_name: string;
  role: string;
  email: string;
}

export default function TestNotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
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
  }, [router]);

  const handleRefresh = () => {
    refreshNotifications();
  };

  const handleRegenerateMockData = async () => {
    setIsRegenerating(true);
    try {
      const response = await apiClient.post('/api/debug/regenerate-mock-data');
      
      if (response.data.status === 'success') {
        toast.success('Mock data regenerated successfully!', {
          description: 'Notifications now only reference content you have access to. Refreshing...'
        });
        
        // Wait a moment then refresh notifications
        setTimeout(() => {
          refreshNotifications();
        }, 1000);
      } else {
        throw new Error(response.data.message || 'Failed to regenerate data');
      }
    } catch (error: any) {
      console.error('Failed to regenerate mock data:', error);
      toast.error('Failed to regenerate mock data', {
        description: error.response?.data?.message || error.message || 'Unknown error occurred'
      });
    } finally {
      setIsRegenerating(false);
    }
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
              <TestTube className="h-8 w-8 text-accent" />
              <div>
                <h1 className="text-2xl font-bold text-primary">Test Notifications</h1>
                <p className="text-secondary mt-1">
                  Test notification redirection functionality - check browser console for debug info
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRegenerateMockData}
                disabled={isRegenerating || loading}
              >
                <Database className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-pulse' : ''}`} />
                {isRegenerating ? 'Regenerating...' : 'Fix Notifications'}
              </Button>
            </div>
          </div>
        </div>

        {/* Debug Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-primary mb-4">Debug Information</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Total Notifications:</strong> {notifications.length}</p>
            <p><strong>Unread Count:</strong> {unreadCount}</p>
            <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
            <p><strong>Error:</strong> {error || 'None'}</p>
          </div>
          
          <div className="mt-4">
            <h3 className="font-medium text-primary mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-secondary">
              <li>Open browser developer console (F12) to see debug logs</li>
              <li>Click on any notification below to test redirection</li>
              <li>Check console for detailed redirection flow</li>
              <li>Verify you&apos;re redirected to the correct page</li>
              <li>If you get permission errors (403), you&apos;ll see a user-friendly toast message</li>
            </ol>
            
            <div className="mt-4 p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <h4 className="font-medium text-warning mb-2">📋 Permission Error Testing</h4>
              <p className="text-sm text-secondary">
                Some notifications may show <strong>403 Forbidden</strong> errors if you don&apos;t have access to the related content. 
                This is normal and the system will show a friendly error message and redirect you to the dashboard.
              </p>
              <p className="text-xs text-muted mt-2">
                <strong>Common scenarios:</strong> Task moved to a board you&apos;re not enrolled in, removed from project, etc.
              </p>
            </div>
            
            <div className="mt-4 p-4 bg-success/10 border border-success/20 rounded-lg">
              <h4 className="font-medium text-success mb-2">🔧 Fix Available</h4>
              <p className="text-sm text-secondary">
                If you&apos;re seeing many 403 errors, click the <strong>&quot;Fix Notifications&quot;</strong> button above. 
                This will regenerate mock data so notifications only reference content you actually have access to.
              </p>
              <p className="text-xs text-muted mt-2">
                <strong>What it does:</strong> Creates notifications only for boards you&apos;re enrolled in, tasks you can access, and projects you&apos;re assigned to.
              </p>
            </div>
          </div>
        </Card>

        {/* Sample Notifications */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Bell className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold text-primary">Sample Notifications</h2>
            </div>
          </div>

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
          ) : notifications.length > 0 ? (
            <div className="space-y-4">
              <div className="space-y-3">
                {notifications.slice(0, 10).map((notification) => (
                  <div key={notification.id} className="relative">
                    {/* Debug Info Overlay */}
                    <div className="mb-2 p-2 bg-surface rounded text-xs font-mono">
                      <div className="grid grid-cols-2 gap-2">
                        <span><strong>Type:</strong> {notification.type}</span>
                        <span><strong>Task ID:</strong> {notification.related_task_id || 'None'}</span>
                        <span><strong>Board ID:</strong> {notification.related_board_id || 'None'}</span>
                        <span><strong>Project ID:</strong> {notification.related_project_id || 'None'}</span>
                      </div>
                    </div>
                    
                    <NotificationCard
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      showMarkAsRead={true}
                      compact={false}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Bell className="mx-auto h-12 w-12 text-muted" />
              <h3 className="mt-2 text-sm font-medium text-primary">No notifications available</h3>
              <p className="mt-1 text-sm text-muted">
                No test notifications found. Make sure the backend has generated some mock data.
              </p>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
} 