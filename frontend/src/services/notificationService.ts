import apiClient from './apiClient';

export interface Notification {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  related_task_id?: string;
  related_board_id?: string;
  related_project_id?: string;
  related_team_id?: string;
  related_join_request_id?: string;
  related_invitation_id?: string;
}

export interface NotificationResponse {
  data: Notification[];
}

class NotificationService {
  /**
   * Get notifications for the current user
   */
  async getNotifications(unreadOnly: boolean = false): Promise<Notification[]> {
    const params = unreadOnly ? { unread_only: 'true' } : undefined;
    const response = await apiClient.get<Notification[]>('/api/notifications', params);
    return response.data;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<{ unread_count: number }>('/api/notifications/unread_count');
    return response.data.unread_count;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await apiClient.put(`/api/notifications/${notificationId}/mark_read`);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<number> {
    const response = await apiClient.put<{ count: number }>('/api/notifications/mark_all_read');
    return response.data.count;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService; 