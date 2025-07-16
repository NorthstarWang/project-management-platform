#!/usr/bin/env python3
"""
Base Test Class for API Testing
Provides shared functionality for all test suites
"""

import json
import os
import requests
import time
from test_config import APIRoutes


class BaseAPITest:
    """Base class for API testing with shared functionality"""
    
    def __init__(self):
        # Get base URL from environment or use default
        self.base_url = os.getenv('API_BASE_URL', 'http://localhost:8000')
        self.session_id = None
        self.test_results = []
        self.test_users = {}
        self.test_data = {}
        
        # Print environment info
        print(f"🌐 Testing against: {self.base_url}")
        print(f"📁 Working directory: {os.getcwd()}")
        print()
    
    def setup_session(self):
        """Initialize a new session for testing"""
        try:
            response = requests.post(f"{self.base_url}{APIRoutes.SYNTHETIC_NEW_SESSION}?seed=test123", timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.session_id = data.get('session_id')
                print(f"✅ Session initialized: {self.session_id}")
                return True
            else:
                print(f"❌ Failed to initialize session: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Session setup error: {e}")
            return False
    
    def make_request(self, method, endpoint, data=None, headers=None, params=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        
        # Add session_id to params only for synthetic endpoints
        if self.session_id and endpoint.startswith('/_synthetic'):
            if params is None:
                params = {}
            params['session_id'] = self.session_id
        
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == "POST":
                response = requests.post(url, json=data, headers=headers, params=params, timeout=10)
            elif method == "PUT":
                response = requests.put(url, json=data, headers=headers, params=params, timeout=10)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, params=params, timeout=10)
            else:
                print(f"❌ Unsupported method: {method}")
                return None
            
            return response
        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {e}")
            return None
    
    def log_test(self, test_name, success, message, response=None):
        """Log test result"""
        status = "✅" if success else "❌"
        print(f"{status} {test_name}: {message}")
        
        if response and not success:
            print(f"   Status: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data}")
            except (ValueError, json.JSONDecodeError):
                print(f"   Response: {response.text[:200]}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message
        })
    
    def print_test_summary(self):
        """Print summary of test results"""
        total = len(self.test_results)
        passed = sum(1 for r in self.test_results if r['success'])
        failed = total - passed
        
        print("\n📊 Test Summary:")
        print(f"   ✅ Passed: {passed}")
        print(f"   ❌ Failed: {failed}")
        print(f"   📈 Success Rate: {(passed/total*100):.1f}%")
        print()
    
    def get_admin_headers(self):
        """Get headers for admin user"""
        if "admin" not in self.test_users:
            # Login as admin
            login_data = {
                "username": "admin_alice",
                "password": "admin123",
                "email": "",
                "full_name": "",
                "role": "member"
            }
            response = self.make_request("POST", APIRoutes.AUTH_LOGIN, data=login_data)
            if response and response.status_code == 200:
                self.test_users["admin"] = response.json()
        
        if "admin" in self.test_users:
            return {"x-user-id": self.test_users["admin"]["id"]}
        return {}
    
    def get_manager_headers(self):
        """Get headers for manager user"""
        if "manager" not in self.test_users:
            # Login as manager
            login_data = {
                "username": "manager_david",
                "password": "manager123",
                "email": "",
                "full_name": "",
                "role": "member"
            }
            response = self.make_request("POST", APIRoutes.AUTH_LOGIN, data=login_data)
            if response and response.status_code == 200:
                self.test_users["manager"] = response.json()
        
        if "manager" in self.test_users:
            return {"x-user-id": self.test_users["manager"]["id"]}
        return {}
    
    def get_member_headers(self):
        """Get headers for member user"""
        if "member" not in self.test_users:
            # Login as member
            login_data = {
                "username": "frontend_emma",
                "password": "dev123",
                "email": "",
                "full_name": "",
                "role": "member"
            }
            response = self.make_request("POST", APIRoutes.AUTH_LOGIN, data=login_data)
            if response and response.status_code == 200:
                self.test_users["member"] = response.json()
        
        if "member" in self.test_users:
            return {"x-user-id": self.test_users["member"]["id"]}
        return {}
    
    def create_test_project(self, name, headers):
        """Helper to create a test project"""
        # Get a valid team ID from the backend
        state_response = self.make_request("GET", APIRoutes.SYNTHETIC_STATE)
        if not state_response or state_response.status_code != 200:
            return None
        
        state = state_response.json()
        teams = state.get('teams', [])
        if not teams:
            return None
        
        # Use the first available team
        team_id = teams[0]['id']
        
        project_data = {
            "name": name,
            "description": f"Test project: {name}",
            "team_id": team_id
        }
        response = self.make_request("POST", APIRoutes.PROJECTS_CREATE, data=project_data, headers=headers)
        if response and response.status_code == 200:
            return response.json()
        return None
    
    def create_test_board(self, project_id, name, headers):
        """Helper to create a test board"""
        board_data = {
            "name": name,
            "description": f"Test board: {name}",
            "project_id": project_id
        }
        response = self.make_request("POST", APIRoutes.BOARDS_CREATE, data=board_data, headers=headers)
        if response and response.status_code == 200:
            return response.json()
        return None
    
    def create_test_list(self, board_id, name, headers):
        """Helper to create a test list"""
        list_data = {
            "name": name,
            "board_id": board_id,
            "position": 0
        }
        response = self.make_request("POST", APIRoutes.LISTS_CREATE, data=list_data, headers=headers)
        if response and response.status_code == 200:
            return response.json()
        return None
    
    def create_test_task(self, list_id, title, headers):
        """Helper to create a test task"""
        task_data = {
            "title": title,
            "description": f"Test task: {title}",
            "list_id": list_id,
            "priority": "medium"
        }
        response = self.make_request("POST", APIRoutes.TASKS_CREATE, data=task_data, headers=headers)
        if response and response.status_code == 200:
            return response.json()
        return None
    
    def run_isolated_test(self, test_method):
        """Run a test method in isolation with fresh session"""
        # Reset test data for isolation
        self.test_data = {}
        self.test_users = {}  # Reset user cache for fresh authentication
        
        # Setup fresh session
        if not self.setup_session():
            self.log_test(test_method.__name__, False, "Failed to setup session for isolated test")
            return
        
        # Run the test
        test_method()
        
        # Small delay between tests
        time.sleep(0.1) 