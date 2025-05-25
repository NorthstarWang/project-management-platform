#!/usr/bin/env python3
"""
Base Test Class for Project Management Platform API Tests
Contains shared functionality for all route-specific test files
"""

import requests
import json
import time
import os
from typing import Dict, Any, Optional, List


class BaseAPITest:
    """Base class for API tests with common functionality"""
    
    def __init__(self, base_url: str = None):
        # Use environment variable or fallback to localhost for local development
        if base_url is None:
            base_url = os.getenv("API_BASE_URL", "http://localhost:8000")
        
        self.base_url = base_url
        self.session_id = None
        self.test_users = {}
        self.test_data = {}
        self.created_resources = {
            "projects": [],
            "boards": [],
            "lists": [],
            "tasks": [],
            "comments": [],
            "users": []
        }
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }
    
    def log_test(self, test_name: str, success: bool, details: str = "", response: Optional[requests.Response] = None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        
        # Print response details for failed tests
        if not success and response:
            print(f"    Status Code: {response.status_code}")
            try:
                print(f"    Response: {response.json()}")
            except:
                print(f"    Response Text: {response.text}")
        
        if success:
            self.test_results["passed"] += 1
        else:
            self.test_results["failed"] += 1
            self.test_results["errors"].append(f"{test_name}: {details}")
    
    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    headers: Optional[Dict] = None, params: Optional[Dict] = None) -> requests.Response:
        """Make HTTP request with proper error handling"""
        url = f"{self.base_url}{endpoint}"
        
        # Add session_id to params if available
        if self.session_id and params is None:
            params = {"session_id": self.session_id}
        elif self.session_id and params:
            params["session_id"] = self.session_id
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, params=params, headers=headers)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, params=params, headers=headers)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, params=params, headers=headers)
            elif method.upper() == "DELETE":
                response = requests.delete(url, params=params, headers=headers)
            else:
                return None
            
            return response
        except Exception as e:
            print(f"Request error for {method} {url}: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def setup_session(self, seed: str = None):
        """Initialize a new session for testing with proper isolation"""
        # Use a unique seed for each test run to ensure isolation
        if seed is None:
            seed = f"test_{int(time.time())}_{id(self)}"
        
        response = self.make_request("POST", "/_synthetic/new_session", params={"seed": seed})
        if response and response.status_code == 200:
            data = response.json()
            self.session_id = data.get("session_id")
            return True
        return False
    
    def reset_environment(self, seed: str = None):
        """Reset the environment to clean state"""
        if seed is None:
            seed = f"clean_{int(time.time())}_{id(self)}"
        
        response = self.make_request("POST", "/_synthetic/reset", params={"seed": seed})
        return response and response.status_code == 200
    
    def cleanup_test_data(self):
        """Clean up any resources created during tests"""
        # Reset environment to clean state
        self.reset_environment()
        
        # Clear tracking data
        self.created_resources = {
            "projects": [],
            "boards": [],
            "lists": [],
            "tasks": [],
            "comments": [],
            "users": []
        }
        self.test_data.clear()
    
    def track_created_resource(self, resource_type: str, resource_id: str):
        """Track a resource that was created during testing for cleanup"""
        if resource_type in self.created_resources:
            self.created_resources[resource_type].append(resource_id)
    
    def setup_test_users(self):
        """Setup test users for authentication tests"""
        # Clear previous user data
        self.test_users.clear()
        
        # Login as admin
        admin_login = {
            "username": "admin_alice",
            "password": "admin123",
            "email": "",
            "full_name": "",
            "role": "member"
        }
        response = self.make_request("POST", "/api/login", data=admin_login)
        if response and response.status_code == 200:
            self.test_users["admin"] = response.json()
            print(f"    ✅ Admin user setup: {self.test_users['admin']['username']}")
        else:
            print(f"    ❌ Admin user setup failed: {response.status_code if response else 'No response'}")
            if response:
                print(f"    Error: {response.text}")
        
        # Login as manager
        manager_login = {
            "username": "manager_david",
            "password": "manager123",
            "email": "",
            "full_name": "",
            "role": "member"
        }
        response = self.make_request("POST", "/api/login", data=manager_login)
        if response and response.status_code == 200:
            self.test_users["manager"] = response.json()
            print(f"    ✅ Manager user setup: {self.test_users['manager']['username']}")
        else:
            print(f"    ❌ Manager user setup failed: {response.status_code if response else 'No response'}")
        
        # Login as member
        member_login = {
            "username": "frontend_emma",
            "password": "dev123",
            "email": "",
            "full_name": "",
            "role": "member"
        }
        response = self.make_request("POST", "/api/login", data=member_login)
        if response and response.status_code == 200:
            self.test_users["member"] = response.json()
            print(f"    ✅ Member user setup: {self.test_users['member']['username']}")
        else:
            print(f"    ❌ Member user setup failed: {response.status_code if response else 'No response'}")
    
    def get_admin_headers(self) -> Dict[str, str]:
        """Get headers for admin user"""
        return {"x-user-id": self.test_users["admin"]["id"]} if "admin" in self.test_users else {}
    
    def get_manager_headers(self) -> Dict[str, str]:
        """Get headers for manager user"""
        return {"x-user-id": self.test_users["manager"]["id"]} if "manager" in self.test_users else {}
    
    def get_member_headers(self) -> Dict[str, str]:
        """Get headers for member user"""
        return {"x-user-id": self.test_users["member"]["id"]} if "member" in self.test_users else {}
    
    def run_isolated_test(self, test_method, test_name: str = None):
        """Run a test method with proper isolation and cleanup"""
        if test_name is None:
            test_name = test_method.__name__
        
        try:
            # Setup fresh environment
            if not self.setup_session():
                self.log_test(f"{test_name} (setup)", False, "Failed to setup session")
                return
            
            self.setup_test_users()
            
            # Run the test
            test_method()
            
        except Exception as e:
            self.log_test(test_name, False, f"Test exception: {str(e)}")
        finally:
            # Always cleanup
            self.cleanup_test_data()
    
    def create_test_project(self, name: str = None, headers: Dict[str, str] = None) -> Optional[Dict]:
        """Helper to create a test project and track it for cleanup"""
        if name is None:
            name = f"Test Project {int(time.time())}"
        
        if headers is None:
            headers = self.get_admin_headers()
        
        # Get a team ID from existing teams
        teams_response = self.make_request("GET", "/_synthetic/state", headers=headers)
        if teams_response and teams_response.status_code == 200:
            state = teams_response.json()
            teams = state.get("teams", [])
            if teams:
                team_id = teams[0]["id"]
                
                project_data = {
                    "name": name,
                    "description": f"Test project created at {time.time()}",
                    "team_id": team_id
                }
                
                response = self.make_request("POST", "/api/projects", data=project_data, headers=headers)
                if response and response.status_code == 200:
                    project = response.json()
                    self.track_created_resource("projects", project["id"])
                    return project
        
        return None
    
    def create_test_board(self, project_id: str, name: str = None, headers: Dict[str, str] = None) -> Optional[Dict]:
        """Helper to create a test board and track it for cleanup"""
        if name is None:
            name = f"Test Board {int(time.time())}"
        
        if headers is None:
            headers = self.get_admin_headers()
        
        board_data = {
            "name": name,
            "description": f"Test board created at {time.time()}",
            "project_id": project_id
        }
        
        response = self.make_request("POST", "/api/boards", data=board_data, headers=headers)
        if response and response.status_code == 200:
            board = response.json()
            self.track_created_resource("boards", board["id"])
            return board
        
        return None
    
    def create_test_list(self, board_id: str, name: str = None, headers: Dict[str, str] = None) -> Optional[Dict]:
        """Helper to create a test list and track it for cleanup"""
        if name is None:
            name = f"Test List {int(time.time())}"
        
        if headers is None:
            headers = self.get_admin_headers()
        
        list_data = {
            "name": name,
            "board_id": board_id,
            "position": 0
        }
        
        response = self.make_request("POST", "/api/lists", data=list_data, headers=headers)
        if response and response.status_code == 200:
            list_obj = response.json()
            self.track_created_resource("lists", list_obj["id"])
            return list_obj
        
        return None
    
    def create_test_task(self, list_id: str, title: str = None, headers: Dict[str, str] = None) -> Optional[Dict]:
        """Helper to create a test task and track it for cleanup"""
        if title is None:
            title = f"Test Task {int(time.time())}"
        
        if headers is None:
            headers = self.get_admin_headers()
        
        task_data = {
            "title": title,
            "description": f"Test task created at {time.time()}",
            "list_id": list_id,
            "priority": "medium"
        }
        
        response = self.make_request("POST", "/api/tasks", data=task_data, headers=headers)
        if response and response.status_code == 200:
            task = response.json()
            self.track_created_resource("tasks", task["id"])
            return task
        
        return None
    
    def print_test_summary(self):
        """Print test results summary"""
        total = self.test_results["passed"] + self.test_results["failed"]
        success_rate = (self.test_results["passed"] / total * 100) if total > 0 else 0
        
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {self.test_results['passed']}")
        print(f"❌ Failed: {self.test_results['failed']}")
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if self.test_results["errors"]:
            print("\n❌ FAILED TESTS:")
            for error in self.test_results["errors"]:
                print(f"   • {error}")
        
        print("=" * 60) 