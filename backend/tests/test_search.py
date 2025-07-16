#!/usr/bin/env python3
"""
Search API Test Suite
Tests search functionality across boards and projects
"""

from base_test import BaseAPITest
from test_config import get_search_route


class SearchTest(BaseAPITest):
    """Test suite for search functionality"""
    
    def run_tests(self):
        """Run all search tests"""
        print("🔍 TESTING SEARCH FUNCTIONALITY")
        print("-" * 30)
        
        # Run each test in isolation
        self.run_isolated_test(self.test_board_search_with_results)
        self.run_isolated_test(self.test_board_search_no_results)
        self.run_isolated_test(self.test_project_search_with_results)
        self.run_isolated_test(self.test_project_search_no_results)
        self.run_isolated_test(self.test_search_member_forbidden)
        self.run_isolated_test(self.test_search_empty_query)
        
        self.print_test_summary()
    
    def test_board_search_with_results(self):
        """Test board-level search that should return results"""
        admin_headers = self.get_admin_headers()
        
        # Create test data
        project = self.create_test_project("Search Test Project", admin_headers)
        if not project:
            self.log_test("GET /api/boards/{id}/search", False, "Failed to create test project")
            return
        
        board = self.create_test_board(project["id"], "Search Test Board", admin_headers)
        if not board:
            self.log_test("GET /api/boards/{id}/search", False, "Failed to create test board")
            return
        
        test_list = self.create_test_list(board["id"], "Search Test List", admin_headers)
        if not test_list:
            self.log_test("GET /api/boards/{id}/search", False, "Failed to create test list")
            return
        
        # Create a task with searchable content
        task = self.create_test_task(test_list["id"], "Authentication Implementation", admin_headers)
        if not task:
            self.log_test("GET /api/boards/{id}/search", False, "Failed to create test task")
            return
        
        # Search for the task
        search_url = get_search_route("board", board["id"])
        response = self.make_request("GET", search_url, params={"q": "authentication"}, headers=admin_headers)
        
        if response and response.status_code == 200:
            results = response.json()
            found_task = any(task["title"] == "Authentication Implementation" for task in results)
            self.log_test("GET /api/boards/{id}/search", found_task, f"Found {len(results)} results, task found: {found_task}")
        else:
            self.log_test("GET /api/boards/{id}/search", False, "Failed to search board", response)
    
    def test_board_search_no_results(self):
        """Test board-level search that should return no results"""
        admin_headers = self.get_admin_headers()
        
        # Create test data
        project = self.create_test_project("Empty Search Test Project", admin_headers)
        board = self.create_test_board(project["id"], "Empty Search Test Board", admin_headers)
        test_list = self.create_test_list(board["id"], "Empty Search Test List", admin_headers)
        
        if not test_list:
            self.log_test("GET /api/boards/{id}/search (no results)", False, "Failed to create test setup")
            return
        
        # Search for something that doesn't exist
        search_url = get_search_route("board", board["id"])
        response = self.make_request("GET", search_url, params={"q": "nonexistent"}, headers=admin_headers)
        
        if response and response.status_code == 200:
            results = response.json()
            no_results = len(results) == 0
            self.log_test("GET /api/boards/{id}/search (no results)", no_results, f"Correctly returned {len(results)} results")
        else:
            self.log_test("GET /api/boards/{id}/search (no results)", False, "Failed to search board", response)
    
    def test_project_search_with_results(self):
        """Test project-level search that should return results"""
        admin_headers = self.get_admin_headers()
        
        # Create test data
        project = self.create_test_project("Project Search Test", admin_headers)
        board = self.create_test_board(project["id"], "Project Search Board", admin_headers)
        test_list = self.create_test_list(board["id"], "Project Search List", admin_headers)
        task = self.create_test_task(test_list["id"], "Database Migration Task", admin_headers)
        
        if not task:
            self.log_test("GET /api/projects/{id}/search", False, "Failed to create test setup")
            return
        
        # Search for the task at project level
        search_url = get_search_route("project", project["id"])
        response = self.make_request("GET", search_url, params={"q": "database"}, headers=admin_headers)
        
        if response and response.status_code == 200:
            results = response.json()
            found_task = any(task["title"] == "Database Migration Task" for task in results)
            self.log_test("GET /api/projects/{id}/search", found_task, f"Found {len(results)} results, task found: {found_task}")
        else:
            self.log_test("GET /api/projects/{id}/search", False, "Failed to search project", response)
    
    def test_project_search_no_results(self):
        """Test project-level search that should return no results"""
        admin_headers = self.get_admin_headers()
        
        # Create test data
        project = self.create_test_project("Empty Project Search Test", admin_headers)
        board = self.create_test_board(project["id"], "Empty Project Search Board", admin_headers)
        test_list = self.create_test_list(board["id"], "Empty Project Search List", admin_headers)
        
        if not test_list:
            self.log_test("GET /api/projects/{id}/search (no results)", False, "Failed to create test setup")
            return
        
        # Search for something that doesn't exist
        search_url = get_search_route("project", project["id"])
        response = self.make_request("GET", search_url, params={"q": "nonexistent"}, headers=admin_headers)
        
        if response and response.status_code == 200:
            results = response.json()
            no_results = len(results) == 0
            self.log_test("GET /api/projects/{id}/search (no results)", no_results, f"Correctly returned {len(results)} results")
        else:
            self.log_test("GET /api/projects/{id}/search (no results)", False, "Failed to search project", response)
    
    def test_search_member_forbidden(self):
        """Test that members cannot search boards they're not enrolled in"""
        admin_headers = self.get_admin_headers()
        member_headers = self.get_member_headers()
        
        # Create a board as admin (member not enrolled)
        project = self.create_test_project("Forbidden Search Test Project", admin_headers)
        board = self.create_test_board(project["id"], "Forbidden Search Test Board", admin_headers)
        
        if not board:
            self.log_test("GET /api/boards/{id}/search (forbidden)", False, "Failed to create test setup")
            return
        
        # Try to search as member (should be forbidden)
        search_url = get_search_route("board", board["id"])
        response = self.make_request("GET", search_url, params={"q": "test"}, headers=member_headers)
        
        # Should fail with 403 or 404
        success = response is not None and response.status_code in [403, 404]
        self.log_test("GET /api/boards/{id}/search (forbidden)", success, "Correctly denied member search access", response)
    
    def test_search_empty_query(self):
        """Test search with empty query parameter"""
        admin_headers = self.get_admin_headers()
        
        # Create test data
        project = self.create_test_project("Empty Query Test Project", admin_headers)
        board = self.create_test_board(project["id"], "Empty Query Test Board", admin_headers)
        
        if not board:
            self.log_test("GET /api/boards/{id}/search (empty query)", False, "Failed to create test setup")
            return
        
        # Search with empty query
        search_url = get_search_route("board", board["id"])
        response = self.make_request("GET", search_url, params={"q": ""}, headers=admin_headers)
        
        if response and response.status_code == 200:
            results = response.json()
            # Empty query should return empty results or all results (implementation dependent)
            self.log_test("GET /api/boards/{id}/search (empty query)", True, f"Empty query returned {len(results)} results")
        else:
            # Some implementations might return 400 for empty query, which is also valid
            success = response is not None and response.status_code in [200, 400]
            self.log_test("GET /api/boards/{id}/search (empty query)", success, "Handled empty query appropriately", response)


def main():
    """Run search tests"""
    test_suite = SearchTest()
    test_suite.run_tests()


if __name__ == "__main__":
    main() 