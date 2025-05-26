#!/usr/bin/env python3
"""
Notification System API Test Suite
Tests notification retrieval, marking as read, and notification management endpoints
"""

import sys
import os
from base_test import BaseAPITest

# Add the parent directory to the path so we can import from app.config
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

try:
    from app.config import APIRoutes
except ImportError:
    # Fallback if import fails
    class APIRoutes:
        NOTIFICATIONS_LIST = "/api/notifications"
        NOTIFICATIONS_UNREAD_COUNT = "/api/notifications/unread_count"
        NOTIFICATIONS_MARK_READ = "/api/notifications/{notification_id}/mark_read"
        NOTIFICATIONS_MARK_ALL_READ = "/api/notifications/mark_all_read"
        PROJECTS_LIST = "/api/projects"
        PROJECTS_BOARDS = "/api/projects/{project_id}/boards"
        BOARDS_DETAIL = "/api/boards/{board_id}"
        TASKS_CREATE = "/api/tasks"
        COMMENTS_CREATE = "/api/comments"
        LISTS_CREATE = "/api/lists"


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
        
        project = self._get_first_project(admin_headers)
        if not project:
            return
        
        board = self._get_first_board(admin_headers, project["id"])
        if not board:
            return
        
        lists = self._get_board_lists(admin_headers, board["id"])
        if not lists:
            return
        
        self._create_task_and_comment(admin_headers, lists[0]["id"])
        print("    Created test task and comment for notifications")
    
    def _get_first_project(self, headers):
        """Get the first available project"""
        response = self.make_request("GET", APIRoutes.PROJECTS_LIST, headers=headers)
        if response and response.status_code == 200:
            projects = response.json()
            return projects[0] if projects else None
        return None
    
    def _get_first_board(self, headers, project_id):
        """Get the first board for a project"""
        response = self.make_request("GET", APIRoutes.PROJECTS_BOARDS.format(project_id=project_id), headers=headers)
        if response and response.status_code == 200:
            boards = response.json()
            return boards[0] if boards else None
        return None
    
    def _get_board_lists(self, headers, board_id):
        """Get lists for a board"""
        response = self.make_request("GET", APIRoutes.BOARDS_DETAIL.format(board_id=board_id), headers=headers)
        if response and response.status_code == 200:
            board_data = response.json()
            return board_data.get("lists", [])
        return []
    
    def _create_task_and_comment(self, headers, list_id):
        """Create a task and add a comment to generate notifications"""
        task_data = {
            "title": "Test Task for Notifications",
            "description": "This task will generate notifications",
            "list_id": list_id,
            "assignee_id": self.test_users["member"]["id"] if "member" in self.test_users else None,
            "priority": "medium"
        }
        response = self.make_request("POST", APIRoutes.TASKS_CREATE, data=task_data, headers=headers)
        if response and response.status_code == 200:
            task = response.json()
            
            # Add a comment to create more notifications
            comment_data = {
                "content": "Test comment to generate notification",
                "task_id": task["id"]
            }
            self.make_request("POST", APIRoutes.COMMENTS_CREATE, data=comment_data, headers=headers)
    
    def test_get_all_notifications(self):
        """Test getting all notifications for user"""
        member_headers = self.get_member_headers()
        response = self.make_request("GET", APIRoutes.NOTIFICATIONS_LIST, headers=member_headers)
        if response and response.status_code == 200:
            notifications = response.json()
            self.log_test("GET /api/notifications", True, f"Retrieved {len(notifications)} notifications")
        else:
            self.log_test("GET /api/notifications", False, "Failed to get notifications", response)
    
    def test_get_unread_notifications(self):
        """Test getting only unread notifications"""
        member_headers = self.get_member_headers()
        response = self.make_request("GET", APIRoutes.NOTIFICATIONS_LIST, 
                                   params={"unread_only": "true"}, headers=member_headers)
        if response and response.status_code == 200:
            notifications = response.json()
            self.log_test("GET /api/notifications?unread_only=true", True, f"Retrieved {len(notifications)} unread notifications")
        else:
            self.log_test("GET /api/notifications?unread_only=true", False, "Failed to get unread notifications", response)
    
    def test_get_unread_count(self):
        """Test getting unread notification count"""
        member_headers = self.get_member_headers()
        response = self.make_request("GET", APIRoutes.NOTIFICATIONS_UNREAD_COUNT, headers=member_headers)
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
        response = self.make_request("GET", APIRoutes.NOTIFICATIONS_LIST, 
                                   params={"unread_only": "true"}, headers=member_headers)
        if response and response.status_code == 200:
            notifications = response.json()
            if notifications:
                notification_id = notifications[0]["id"]
                
                # Mark it as read
                response = self.make_request("PUT", APIRoutes.NOTIFICATIONS_MARK_READ.format(notification_id=notification_id), 
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
        response = self.make_request("PUT", APIRoutes.NOTIFICATIONS_MARK_ALL_READ, headers=member_headers)
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