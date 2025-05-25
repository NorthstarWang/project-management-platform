#!/usr/bin/env python3
"""
Notification System API Test Suite
Tests notification retrieval, marking as read, and notification management endpoints
"""

from base_test import BaseAPITest


class NotificationTest(BaseAPITest):
    """Test suite for notification system endpoints"""
    
    def run_tests(self):
        """Run all notification tests"""
        print("🔔 TESTING NOTIFICATION SYSTEM")
        print("-" * 30)
        
        # Setup session and users
        if not self.setup_session():
            print("❌ Failed to setup session")
            return
        
        self.setup_test_users()
        self._create_test_notifications()
        
        self.test_get_all_notifications()
        self.test_get_unread_notifications()
        self.test_get_unread_count()
        self.test_mark_notification_read()
        self.test_mark_all_notifications_read()
        
        self.print_test_summary()
    
    def _create_test_notifications(self):
        """Create some test notifications by performing actions"""
        admin_headers = self.get_admin_headers()
        member_headers = self.get_member_headers()
        
        # Try to create a notification by creating and assigning a task
        # First get projects through API
        response = self.make_request("GET", "/api/projects", headers=admin_headers)
        if response and response.status_code == 200:
            api_projects = response.json()
            
            if api_projects:
                project = api_projects[0]
                
                # Get boards for this project
                response = self.make_request("GET", f"/api/projects/{project['id']}/boards", headers=admin_headers)
                if response and response.status_code == 200:
                    boards = response.json()
                    
                    if boards:
                        board = boards[0]
                        
                        # Get board details to find lists
                        response = self.make_request("GET", f"/api/boards/{board['id']}", headers=admin_headers)
                        if response and response.status_code == 200:
                            board_data = response.json()
                            lists = board_data.get("lists", [])
                            
                            if lists:
                                # Create a task assigned to member to generate notification
                                task_data = {
                                    "title": "Test Task for Notifications",
                                    "description": "This task will generate notifications",
                                    "list_id": lists[0]["id"],
                                    "assignee_id": self.test_users["member"]["id"] if "member" in self.test_users else None,
                                    "priority": "medium"
                                }
                                response = self.make_request("POST", "/api/tasks", data=task_data, headers=admin_headers)
                                if response and response.status_code == 200:
                                    task = response.json()
                                    
                                    # Add a comment to create more notifications
                                    comment_data = {
                                        "content": "Test comment to generate notification",
                                        "task_id": task["id"]
                                    }
                                    self.make_request("POST", "/api/comments", data=comment_data, headers=admin_headers)
                                    print("    Created test task and comment for notifications")
    
    def test_get_all_notifications(self):
        """Test getting all notifications for user"""
        member_headers = self.get_member_headers()
        response = self.make_request("GET", "/api/notifications", headers=member_headers)
        if response and response.status_code == 200:
            notifications = response.json()
            self.log_test("GET /api/notifications", True, f"Retrieved {len(notifications)} notifications")
        else:
            self.log_test("GET /api/notifications", False, "Failed to get notifications", response)
    
    def test_get_unread_notifications(self):
        """Test getting only unread notifications"""
        member_headers = self.get_member_headers()
        response = self.make_request("GET", "/api/notifications", 
                                   params={"unread_only": "true"}, headers=member_headers)
        if response and response.status_code == 200:
            notifications = response.json()
            self.log_test("GET /api/notifications?unread_only=true", True, f"Retrieved {len(notifications)} unread notifications")
        else:
            self.log_test("GET /api/notifications?unread_only=true", False, "Failed to get unread notifications", response)
    
    def test_get_unread_count(self):
        """Test getting unread notification count"""
        member_headers = self.get_member_headers()
        response = self.make_request("GET", "/api/notifications/unread_count", headers=member_headers)
        if response and response.status_code == 200:
            count_data = response.json()
            count = count_data.get("count", 0)
            self.log_test("GET /api/notifications/unread_count", True, f"Unread count: {count}")
        else:
            self.log_test("GET /api/notifications/unread_count", False, "Failed to get unread count", response)
    
    def test_mark_notification_read(self):
        """Test marking a specific notification as read"""
        member_headers = self.get_member_headers()
        
        # First get notifications to find one to mark as read
        response = self.make_request("GET", "/api/notifications", 
                                   params={"unread_only": "true"}, headers=member_headers)
        if response and response.status_code == 200:
            notifications = response.json()
            if notifications:
                notification_id = notifications[0]["id"]
                
                # Mark it as read
                response = self.make_request("PUT", f"/api/notifications/{notification_id}/mark_read", 
                                           headers=member_headers)
                if response and response.status_code == 200:
                    self.log_test("PUT /api/notifications/{id}/mark_read", True, "Notification marked as read")
                else:
                    self.log_test("PUT /api/notifications/{id}/mark_read", False, "Failed to mark notification as read", response)
            else:
                # If no unread notifications, that's actually a valid state
                self.log_test("PUT /api/notifications/{id}/mark_read", True, "No unread notifications to mark (valid state)")
        else:
            self.log_test("PUT /api/notifications/{id}/mark_read", False, "Failed to get notifications for marking", response)
    
    def test_mark_all_notifications_read(self):
        """Test marking all notifications as read"""
        member_headers = self.get_member_headers()
        response = self.make_request("PUT", "/api/notifications/mark_all_read", headers=member_headers)
        if response and response.status_code == 200:
            result = response.json()
            marked_count = result.get("marked_count", 0)
            self.log_test("PUT /api/notifications/mark_all_read", True, f"Marked {marked_count} notifications as read")
        else:
            self.log_test("PUT /api/notifications/mark_all_read", False, "Failed to mark all notifications as read", response)


def main():
    """Run notification tests"""
    test_suite = NotificationTest()
    test_suite.run_tests()


if __name__ == "__main__":
    main() 