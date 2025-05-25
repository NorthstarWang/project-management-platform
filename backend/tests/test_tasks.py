#!/usr/bin/env python3
"""
Task Management API Test Suite
Tests task creation, updates, movement, and lifecycle management endpoints
"""

from base_test import BaseAPITest


class TaskManagementTest(BaseAPITest):
    """Test suite for task management endpoints"""
    
    def run_tests(self):
        """Run all task management tests with proper isolation"""
        print("✅ TESTING TASK MANAGEMENT")
        print("-" * 30)
        
        # Run each test in isolation
        self.run_isolated_test(self.test_create_task)
        self.run_isolated_test(self.test_update_task)
        self.run_isolated_test(self.test_move_task)
        self.run_isolated_test(self.test_archive_task)
        self.run_isolated_test(self.test_unarchive_task)
        self.run_isolated_test(self.test_get_task_full_details)
        self.run_isolated_test(self.test_delete_task)
        self.run_isolated_test(self.test_create_task_in_nonexistent_list)
        
        self.print_test_summary()
    
    def test_create_task(self):
        """Test creating a new task"""
        admin_headers = self.get_admin_headers()
        
        # Create test infrastructure
        project = self.create_test_project("Task Test Project", admin_headers)
        if not project:
            self.log_test("POST /api/tasks", False, "Failed to create test project")
            return
        
        board = self.create_test_board(project["id"], "Task Test Board", admin_headers)
        if not board:
            self.log_test("POST /api/tasks", False, "Failed to create test board")
            return
        
        test_list = self.create_test_list(board["id"], "Test List", admin_headers)
        if not test_list:
            self.log_test("POST /api/tasks", False, "Failed to create test list")
            return
        
        # Create task
        task_data = {
            "title": "Test Task",
            "description": "A task created for testing",
            "list_id": test_list["id"],
            "assignee_id": self.test_users["admin"]["id"],
            "priority": "high",
            "due_date": "2024-12-31T23:59:59Z"
        }
        
        response = self.make_request("POST", "/api/tasks", data=task_data, headers=admin_headers)
        
        if response and response.status_code == 200:
            task = response.json()
            self.track_created_resource("tasks", task["id"])
            self.log_test("POST /api/tasks", True, f"Created task: {task_data['title']}")
        else:
            self.log_test("POST /api/tasks", False, "Failed to create task", response)
    
    def test_update_task(self):
        """Test updating task details"""
        admin_headers = self.get_admin_headers()
        
        # Create test infrastructure and task
        project = self.create_test_project("Update Test Project", admin_headers)
        board = self.create_test_board(project["id"], "Update Test Board", admin_headers)
        test_list = self.create_test_list(board["id"], "Update Test List", admin_headers)
        task = self.create_test_task(test_list["id"], "Original Task", admin_headers)
        
        if not task:
            self.log_test("PUT /api/tasks/{id}", False, "Failed to create task for update test")
            return
        
        # Update task
        update_data = {
            "title": "Updated Test Task",
            "description": "Updated description for testing",
            "priority": "medium",
            "status": "in_progress"
        }
        
        response = self.make_request("PUT", f"/api/tasks/{task['id']}", data=update_data, headers=admin_headers)
        if response and response.status_code == 200:
            updated_task = response.json()
            self.log_test("PUT /api/tasks/{id}", True, f"Updated task: {updated_task.get('title')}")
        else:
            self.log_test("PUT /api/tasks/{id}", False, "Failed to update task", response)
    
    def test_move_task(self):
        """Test moving task between lists"""
        admin_headers = self.get_admin_headers()
        
        # Create test infrastructure
        project = self.create_test_project("Move Test Project", admin_headers)
        board = self.create_test_board(project["id"], "Move Test Board", admin_headers)
        source_list = self.create_test_list(board["id"], "Source List", admin_headers)
        target_list = self.create_test_list(board["id"], "Target List", admin_headers)
        task = self.create_test_task(source_list["id"], "Task to Move", admin_headers)
        
        if not all([task, target_list]):
            self.log_test("PUT /api/tasks/{id}/move", False, "Failed to create test infrastructure")
            return
        
        # Move task
        move_data = {
            "list_id": target_list["id"],
            "position": 0
        }
        
        response = self.make_request("PUT", f"/api/tasks/{task['id']}/move", data=move_data, headers=admin_headers)
        if response and response.status_code == 200:
            self.log_test("PUT /api/tasks/{id}/move", True, "Task moved successfully")
        else:
            self.log_test("PUT /api/tasks/{id}/move", False, "Failed to move task", response)
    
    def test_archive_task(self):
        """Test archiving a task"""
        admin_headers = self.get_admin_headers()
        
        # Create test infrastructure and task
        project = self.create_test_project("Archive Test Project", admin_headers)
        board = self.create_test_board(project["id"], "Archive Test Board", admin_headers)
        test_list = self.create_test_list(board["id"], "Archive Test List", admin_headers)
        task = self.create_test_task(test_list["id"], "Task to Archive", admin_headers)
        
        if not task:
            self.log_test("PUT /api/tasks/{id}/archive", False, "Failed to create task for archive test")
            return
        
        # Archive task
        response = self.make_request("PUT", f"/api/tasks/{task['id']}/archive", headers=admin_headers)
        if response and response.status_code == 200:
            self.log_test("PUT /api/tasks/{id}/archive", True, "Task archived successfully")
        else:
            self.log_test("PUT /api/tasks/{id}/archive", False, "Failed to archive task", response)
    
    def test_unarchive_task(self):
        """Test unarchiving a task"""
        admin_headers = self.get_admin_headers()
        
        # Create test infrastructure and task
        project = self.create_test_project("Unarchive Test Project", admin_headers)
        board = self.create_test_board(project["id"], "Unarchive Test Board", admin_headers)
        test_list = self.create_test_list(board["id"], "Unarchive Test List", admin_headers)
        task = self.create_test_task(test_list["id"], "Task to Unarchive", admin_headers)
        
        if not task:
            self.log_test("PUT /api/tasks/{id}/unarchive", False, "Failed to create task for unarchive test")
            return
        
        # First archive the task
        archive_response = self.make_request("PUT", f"/api/tasks/{task['id']}/archive", headers=admin_headers)
        if not (archive_response and archive_response.status_code == 200):
            self.log_test("PUT /api/tasks/{id}/unarchive", False, "Failed to archive task first")
            return
        
        # Then unarchive it
        response = self.make_request("PUT", f"/api/tasks/{task['id']}/unarchive", headers=admin_headers)
        if response and response.status_code == 200:
            self.log_test("PUT /api/tasks/{id}/unarchive", True, "Task unarchived successfully")
        else:
            self.log_test("PUT /api/tasks/{id}/unarchive", False, "Failed to unarchive task", response)
    
    def test_get_task_full_details(self):
        """Test getting task with comments and activities"""
        admin_headers = self.get_admin_headers()
        
        # Create test infrastructure and task
        project = self.create_test_project("Details Test Project", admin_headers)
        board = self.create_test_board(project["id"], "Details Test Board", admin_headers)
        test_list = self.create_test_list(board["id"], "Details Test List", admin_headers)
        task = self.create_test_task(test_list["id"], "Task for Details", admin_headers)
        
        if not task:
            self.log_test("GET /api/tasks/{id}/full", False, "Failed to create task for details test")
            return
        
        # Add a comment to make the test more meaningful
        comment_data = {
            "content": "Test comment for task details",
            "task_id": task["id"]
        }
        self.make_request("POST", "/api/comments", data=comment_data, headers=admin_headers)
        
        # Get full task details
        response = self.make_request("GET", f"/api/tasks/{task['id']}/full", headers=admin_headers)
        if response and response.status_code == 200:
            task_details = response.json()
            activities = task_details.get("activities", [])
            self.log_test("GET /api/tasks/{id}/full", True, f"Got task with {len(activities)} activities")
        else:
            self.log_test("GET /api/tasks/{id}/full", False, "Failed to get task full details", response)
    
    def test_delete_task(self):
        """Test deleting a task"""
        admin_headers = self.get_admin_headers()
        
        # Create test infrastructure and task
        project = self.create_test_project("Delete Test Project", admin_headers)
        board = self.create_test_board(project["id"], "Delete Test Board", admin_headers)
        test_list = self.create_test_list(board["id"], "Delete Test List", admin_headers)
        task = self.create_test_task(test_list["id"], "Task to Delete", admin_headers)
        
        if not task:
            self.log_test("DELETE /api/tasks/{id}", False, "Failed to create task for delete test")
            return
        
        # Delete task
        response = self.make_request("DELETE", f"/api/tasks/{task['id']}", headers=admin_headers)
        if response and response.status_code == 200:
            self.log_test("DELETE /api/tasks/{id}", True, "Task deleted successfully")
        else:
            self.log_test("DELETE /api/tasks/{id}", False, "Failed to delete task", response)
    
    def test_create_task_in_nonexistent_list(self):
        """Test creating task in nonexistent list"""
        admin_headers = self.get_admin_headers()
        
        task_data = {
            "title": "Invalid Task",
            "description": "This should fail",
            "list_id": "nonexistent_list_id",
            "priority": "low"
        }
        
        response = self.make_request("POST", "/api/tasks", data=task_data, headers=admin_headers)
        # Should fail with 404 or 400
        success = response is not None and response.status_code in [400, 404]
        self.log_test("POST /api/tasks (invalid list)", success, "Correctly rejected task with invalid list", response)


def main():
    """Run task management tests"""
    test_suite = TaskManagementTest()
    test_suite.run_tests()


if __name__ == "__main__":
    main() 