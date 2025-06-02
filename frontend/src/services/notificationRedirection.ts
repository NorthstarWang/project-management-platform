import { Notification } from './notificationService';
import apiClient from './apiClient';
import { toast } from '@/components/ui/CustomToast';

export interface NavigationContext {
  router: any; // Next.js 13+ App Router
  closeNotificationDropdown?: () => void;
}

class NotificationRedirectionService {
  /**
   * Navigate user to the relevant page based on notification
   */
  async redirectToNotification(notification: Notification, context: NavigationContext) {
    const { router, closeNotificationDropdown } = context;

    try {
      console.log('🔔 Notification redirection started:', {
        notification,
        type: notification.type,
        related_task_id: notification.related_task_id,
        related_board_id: notification.related_board_id,
        related_project_id: notification.related_project_id
      });

      // Close notification dropdown if provided
      if (closeNotificationDropdown) {
        closeNotificationDropdown();
      }

      // Handle different notification types
      switch (notification.type) {
        case 'task_assigned':
        case 'task_updated':
        case 'task_moved':
          console.log('📋 Redirecting to task:', notification.related_task_id);
          return await this.redirectToTask(notification, router);
          
        case 'task_commented':
          console.log('💬 Redirecting to task comment:', notification.related_task_id);
          return await this.redirectToTaskComment(notification, router);
          
        case 'board_enrolled':
          console.log('📊 Redirecting to board:', notification.related_board_id);
          return await this.redirectToBoard(notification, router);
          
        case 'project_assigned':
          console.log('🏗️ Redirecting to project:', notification.related_project_id);
          return await this.redirectToProject(notification, router);
          
        case 'team_join_request':
        case 'team_invitation':
        case 'team_join_request_approved':
        case 'team_join_request_denied':
        case 'team_invitation_accepted':
        case 'team_invitation_declined':
          console.log('👥 Redirecting to team page:', notification.related_team_id);
          return await this.redirectToTeamPage(notification, router);
          
        default:
          console.warn('❌ Unknown notification type:', notification.type);
          // Fallback to dashboard
          router.push('/dashboard');
      }
    } catch (error) {
      console.error('🚨 Failed to redirect for notification:', error);
      
      // Handle permission errors gracefully
      if (this.isPermissionError(error)) {
        this.handlePermissionError(notification, router);
      } else if (this.isNotFoundError(error)) {
        this.handleNotFoundError(notification, router);
      } else {
        // Fallback to dashboard on other errors
        router.push('/dashboard');
      }
    }
  }

  /**
   * Check if error is a permission-related error
   */
  private isPermissionError(error: any): boolean {
    return error?.status === 403 || 
           error?.message?.includes('403') ||
           error?.data?.detail?.includes('Access denied');
  }

  /**
   * Check if error is a not-found error (data integrity issue)
   */
  private isNotFoundError(error: any): boolean {
    return error?.status === 404 || 
           error?.message?.includes('404') ||
           error?.data?.detail?.includes('Not Found');
  }

  /**
   * Handle permission errors with user-friendly messaging
   */
  private handlePermissionError(notification: Notification, router: any): void {
    console.log('🔒 Permission error detected, handling gracefully');
    
    // Show user-friendly toast message
    const taskTitle = this.extractTaskTitleFromMessage(notification.message);
    const messageMap = {
      'task_assigned': `You no longer have access to the board containing "${taskTitle}". You may have been removed from the project.`,
      'task_updated': `You no longer have access to the board containing "${taskTitle}". The task may have been moved or you may have been removed from the project.`,
      'task_moved': `You no longer have access to the board containing "${taskTitle}". You may have been removed from the project.`,
      'task_commented': `You no longer have access to the board containing "${taskTitle}". You may have been removed from the project.`,
      'board_enrolled': 'You no longer have access to this board. You may have been removed from the project.',
      'project_assigned': 'You no longer have access to this project. Your permissions may have been revoked.'
    };

    const userMessage = messageMap[notification.type as keyof typeof messageMap] || 
                       'You no longer have access to this content. Your permissions may have been changed.';
    
    toast.error(userMessage, {
      duration: 6000,
      description: 'Redirecting you to your dashboard instead.'
    });

    // Track permission error for analytics
    this.trackRedirection(notification, 'permission_denied', {
      error_type: 'access_denied',
      error_message: 'User lacks permission to access notification content'
    });

    // Redirect to dashboard after brief delay to allow toast to be seen
    setTimeout(() => {
      router.push('/dashboard');
    }, 1000);
  }

  /**
   * Handle not-found errors (data integrity issues)
   */
  private handleNotFoundError(notification: Notification, router: any): void {
    console.log('🗂️ Data integrity issue detected, handling gracefully');
    
    // Show user-friendly toast message for data issues
    const taskTitle = this.extractTaskTitleFromMessage(notification.message);
    const messageMap = {
      'task_assigned': `The task "${taskTitle}" no longer exists or has been moved. It may have been deleted or archived.`,
      'task_updated': `The task "${taskTitle}" no longer exists. It may have been deleted or moved to a different project.`,
      'task_moved': `The task "${taskTitle}" no longer exists in its original location. It may have been deleted.`,
      'task_commented': `The task "${taskTitle}" no longer exists. The comment may be referring to a deleted task.`,
      'board_enrolled': 'This board no longer exists. It may have been deleted or archived.',
      'project_assigned': 'This project no longer exists. It may have been deleted or archived.'
    };

    const userMessage = messageMap[notification.type as keyof typeof messageMap] || 
                       'The content referenced in this notification no longer exists. It may have been deleted or moved.';
    
    toast.error(userMessage, {
      duration: 6000,
      description: 'This usually happens when content is deleted. Redirecting you to your dashboard.'
    });

    // Track data integrity error for analytics
    this.trackRedirection(notification, 'data_not_found', {
      error_type: 'missing_reference',
      error_message: 'Referenced content no longer exists'
    });

    // Redirect to dashboard after brief delay
    setTimeout(() => {
      router.push('/dashboard');
    }, 1000);
  }

  /**
   * Extract task title from notification message
   */
  private extractTaskTitleFromMessage(message: string): string {
    // Try to extract task title from common notification message patterns
    const patterns = [
      /task '([^']+)'/i,
      /task "([^"]+)"/i,
      /to task ([^\s]+)/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return 'the task';
  }

  /**
   * Redirect to a task and open its detail modal
   */
  private async redirectToTask(notification: Notification, router: any) {
    if (!notification.related_task_id) {
      console.warn('⚠️ Task notification missing related_task_id');
      return router.push('/dashboard');
    }

    try {
      console.log('🔍 Fetching task details for ID:', notification.related_task_id);
      
      // Get task details to find the board
      const taskResponse = await apiClient.get(`/api/tasks/${notification.related_task_id}`);
      const task = taskResponse.data;
      console.log('✅ Task details fetched:', task);

      // Get the board details (which includes lists) instead of fetching list individually
      console.log('🔍 Finding board for task list ID:', task.list_id);
      
      // Find which board contains this list by checking all user's boards
      const userBoardsResponse = await apiClient.get('/api/users/me/boards');
      const userBoards = userBoardsResponse.data;
      
      let targetBoard = null;
      let targetList = null;
      
      for (const board of userBoards) {
        // Get full board details to check lists
        try {
          const boardDetailsResponse = await apiClient.get(`/api/boards/${board.id}`);
          const boardDetails = boardDetailsResponse.data;
          
          // Check if this board contains the list we're looking for
          const foundList = boardDetails.lists?.find((list: any) => list.id === task.list_id);
          if (foundList) {
            targetBoard = boardDetails;
            targetList = foundList;
            break;
          }
        } catch {
          // Skip boards we can't access
          continue;
        }
      }
      
      if (!targetBoard || !targetList) {
        throw new Error(`Board containing list ${task.list_id} not found or not accessible`);
      }
      
      console.log('✅ Target board and list found:', { board: targetBoard.name, list: targetList.name });

      // Construct URL with parameters for auto-opening task modal
      const url = `/boards/${targetBoard.id}?task=${task.id}&list=${targetList.id}`;
      console.log('🚀 Navigating to URL:', url);
      
      // Track redirection
      this.trackRedirection(notification, 'task_detail', {
        task_id: task.id,
        board_id: targetBoard.id,
        list_id: targetList.id
      });

      return router.push(url);
    } catch (error) {
      console.error('🚨 Failed to get task details:', error);
      
      // Re-throw to be handled by the main error handler
      throw error;
    }
  }

  /**
   * Redirect to a task comment and scroll to the specific comment
   */
  private async redirectToTaskComment(notification: Notification, router: any) {
    if (!notification.related_task_id) {
      console.warn('⚠️ Comment notification missing related_task_id');
      return router.push('/dashboard');
    }

    try {
      console.log('🔍 Fetching task details for comment navigation, ID:', notification.related_task_id);
      
      // Get task details
      const taskResponse = await apiClient.get(`/api/tasks/${notification.related_task_id}`);
      const task = taskResponse.data;
      console.log('✅ Task details fetched for comment:', task);

      // Get the board details (which includes lists) instead of fetching list individually
      console.log('🔍 Finding board for task list ID:', task.list_id);
      
      // Find which board contains this list by checking all user's boards
      const userBoardsResponse = await apiClient.get('/api/users/me/boards');
      const userBoards = userBoardsResponse.data;
      
      let targetBoard = null;
      let targetList = null;
      
      for (const board of userBoards) {
        // Get full board details to check lists
        try {
          const boardDetailsResponse = await apiClient.get(`/api/boards/${board.id}`);
          const boardDetails = boardDetailsResponse.data;
          
          // Check if this board contains the list we're looking for
          const foundList = boardDetails.lists?.find((list: any) => list.id === task.list_id);
          if (foundList) {
            targetBoard = boardDetails;
            targetList = foundList;
            break;
          }
        } catch {
          // Skip boards we can't access
          continue;
        }
      }
      
      if (!targetBoard || !targetList) {
        throw new Error(`Board containing list ${task.list_id} not found or not accessible`);
      }
      
      console.log('✅ Target board and list found for comment:', { board: targetBoard.name, list: targetList.name });

      // Try to get the latest comment for this task to scroll to
      console.log('🔍 Fetching comments for task:', task.id);
      const commentsResponse = await apiClient.get(`/api/tasks/${task.id}/comments`);
      const comments = commentsResponse.data;
      console.log('✅ Comments fetched:', comments);
      
      // Find the most recent comment (assuming that's what they want to see)
      const latestComment = comments.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      console.log('🔍 Latest comment found:', latestComment);

      // Construct URL with parameters for auto-opening task modal and scrolling to comment
      let url = `/boards/${targetBoard.id}?task=${task.id}&list=${targetList.id}`;
      if (latestComment) {
        url += `&comment=${latestComment.id}`;
      }
      console.log('🚀 Navigating to comment URL:', url);
      
      // Track redirection
      this.trackRedirection(notification, 'task_comment', {
        task_id: task.id,
        board_id: targetBoard.id,
        list_id: targetList.id,
        comment_id: latestComment?.id
      });

      return router.push(url);
    } catch (error) {
      console.error('🚨 Failed to get task comment details:', error);
      
      // Re-throw to be handled by the main error handler
      throw error;
    }
  }

  /**
   * Redirect to a board
   */
  private async redirectToBoard(notification: Notification, router: any) {
    if (!notification.related_board_id) {
      console.warn('⚠️ Board notification missing related_board_id');
      return router.push('/dashboard');
    }

    try {
      const url = `/boards/${notification.related_board_id}`;
      console.log('🚀 Navigating to board URL:', url);

      // Track redirection
      this.trackRedirection(notification, 'board', {
        board_id: notification.related_board_id
      });

      return router.push(url);
    } catch (error) {
      console.error('🚨 Failed to redirect to board:', error);
      
      // Re-throw to be handled by the main error handler
      throw error;
    }
  }

  /**
   * Redirect to a project
   */
  private async redirectToProject(notification: Notification, router: any) {
    if (!notification.related_project_id) {
      console.warn('⚠️ Project notification missing related_project_id');
      return router.push('/dashboard');
    }

    try {
      const url = `/projects/${notification.related_project_id}`;
      console.log('🚀 Navigating to project URL:', url);

      // Track redirection
      this.trackRedirection(notification, 'project', {
        project_id: notification.related_project_id
      });

      return router.push(url);
    } catch (error) {
      console.error('🚨 Failed to redirect to project:', error);
      
      // Re-throw to be handled by the main error handler
      throw error;
    }
  }

  /**
   * Redirect to team page or discover page for team-related notifications
   */
  private async redirectToTeamPage(notification: Notification, router: any) {
    try {
      // For team join requests and invitations, redirect to discover page
      // where users can see their pending requests and invitations
      const url = '/discover';
      console.log('🚀 Navigating to discover page for team notification:', url);

      // Track redirection
      this.trackRedirection(notification, 'team_discover', {
        team_id: notification.related_team_id,
        join_request_id: notification.related_join_request_id,
        invitation_id: notification.related_invitation_id
      });

      return router.push(url);
    } catch (error) {
      console.error('🚨 Failed to redirect to team page:', error);
      
      // Re-throw to be handled by the main error handler
      throw error;
    }
  }

  /**
   * Track notification redirection for analytics
   */
  private async trackRedirection(notification: Notification, redirectType: string, additionalData: Record<string, any> = {}) {
    if (typeof window !== 'undefined') {
      try {
        const { track } = await import('./analyticsLogger');
        track('NOTIFICATION_REDIRECT', {
          notification_id: notification.id,
          notification_type: notification.type,
          redirect_type: redirectType,
          timestamp: new Date().toISOString(),
          ...additionalData
        });
      } catch (error) {
        console.warn('Analytics tracking failed:', error);
      }
    }
  }

  /**
   * Check if notification has valid redirection data
   */
  canRedirect(notification: Notification): boolean {
    const canRedirect = (() => {
      switch (notification.type) {
        case 'task_assigned':
        case 'task_updated':
        case 'task_moved':
        case 'task_commented':
          return !!notification.related_task_id;
          
        case 'board_enrolled':
          return !!notification.related_board_id;
          
        case 'project_assigned':
          return !!notification.related_project_id;
          
        case 'team_join_request':
        case 'team_invitation':
        case 'team_join_request_approved':
        case 'team_join_request_denied':
        case 'team_invitation_accepted':
        case 'team_invitation_declined':
          return !!notification.related_team_id;
          
        default:
          return false;
      }
    })();

    console.log('🔍 Can redirect notification?', {
      notification_type: notification.type,
      related_task_id: notification.related_task_id,
      related_board_id: notification.related_board_id,
      related_project_id: notification.related_project_id,
      related_team_id: notification.related_team_id,
      can_redirect: canRedirect
    });

    return canRedirect;
  }
}

// Create singleton instance
const notificationRedirectionService = new NotificationRedirectionService();

export default notificationRedirectionService; 