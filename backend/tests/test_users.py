#!/usr/bin/env python3
"""
User Management API Test Suite
Tests user-related endpoints including profiles, permissions, and task assignments
"""

from base_test import BaseAPITest
from test_config import APIRoutes


class UserManagementTest(BaseAPITest):
    """Test suite for user management endpoints"""
    
    def run_tests(self):
        """Run all user management tests"""
        print("👥 TESTING USER MANAGEMENT")
        print("-" * 30)
        
        # Run each test in isolation
        self.run_isolated_test(self.test_get_current_user)
        self.run_isolated_test(self.test_list_users)
        self.run_isolated_test(self.test_get_user_assigned_tasks)
        self.run_isolated_test(self.test_list_users_member_forbidden)
        self.run_isolated_test(self.test_get_nonexistent_user_tasks)
        
        self.print_test_summary()
    
    def test_get_current_user(self):
        """Test getting current user information"""
        admin_headers = self.get_admin_headers()
        
        response = self.make_request("GET", APIRoutes.USERS_ME, headers=admin_headers)
        if response and response.status_code == 200:
            user = response.json()
            has_username = "username" in user
            has_role = "role" in user
            success = has_username and has_role
            self.log_test("GET /api/users/me", success, f"User: {user.get('username')}, Role: {user.get('role')}")
        else:
            self.log_test("GET /api/users/me", False, "Failed to get current user", response)
    
    def test_list_users(self):
        """Test listing users (admin/manager only)"""
        admin_headers = self.get_admin_headers()
        
        response = self.make_request("GET", APIRoutes.USERS_LIST, headers=admin_headers)
        if response and response.status_code == 200:
            users = response.json()
            success = isinstance(users, list) and len(users) > 0
            self.log_test("GET /api/users", success, f"Retrieved {len(users)} users")
        else:
            self.log_test("GET /api/users", False, "Failed to list users", response)
    
    def test_get_user_assigned_tasks(self):
        """Test getting tasks assigned to a specific user"""
        admin_headers = self.get_admin_headers()
        
        # Get current user first
        user_response = self.make_request("GET", APIRoutes.USERS_ME, headers=admin_headers)
        if not user_response or user_response.status_code != 200:
            self.log_test("GET /api/users/{id}/assigned_tasks", False, "Failed to get current user")
            return
        
        user = user_response.json()
        user_id = user["id"]
        
        response = self.make_request("GET", APIRoutes.USERS_ASSIGNED_TASKS.format(user_id=user_id), headers=admin_headers)
        if response and response.status_code == 200:
            tasks = response.json()
            success = isinstance(tasks, list)
            self.log_test("GET /api/users/{id}/assigned_tasks", success, f"User has {len(tasks)} assigned tasks")
        else:
            self.log_test("GET /api/users/{id}/assigned_tasks", False, "Failed to get user assigned tasks", response)
    
    def test_list_users_member_forbidden(self):
        """Test that members cannot list all users"""
        member_headers = self.get_member_headers()
        
        response = self.make_request("GET", APIRoutes.USERS_LIST, headers=member_headers)
        # Should fail with 403 (forbidden)
        success = response is not None and response.status_code == 403
        self.log_test("GET /api/users (member forbidden)", success, "Correctly denied member access to user list", response)
    
    def test_get_nonexistent_user_tasks(self):
        """Test getting tasks for nonexistent user"""
        admin_headers = self.get_admin_headers()
        
        response = self.make_request("GET", APIRoutes.USERS_ASSIGNED_TASKS.format(user_id="nonexistent_user"), headers=admin_headers)
        # Should fail with 404
        success = response is not None and response.status_code == 404
        self.log_test("GET /api/users/{nonexistent}/assigned_tasks", success, "Correctly handled nonexistent user", response)


def main():
    """Run user management tests"""
    test_suite = UserManagementTest()
    test_suite.run_tests()


if __name__ == "__main__":
    main() 