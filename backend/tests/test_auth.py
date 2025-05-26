#!/usr/bin/env python3
"""
Authentication API Test Suite
Tests user registration, login, and authentication endpoints
"""

import time
from base_test import BaseAPITest
from test_config import APIRoutes


class AuthenticationTest(BaseAPITest):
    """Test suite for authentication endpoints"""
    
    def run_tests(self):
        """Run all authentication tests"""
        print("🔐 TESTING AUTHENTICATION")
        print("-" * 30)
        
        # Setup session
        if not self.setup_session():
            print("❌ Failed to setup session")
            return
        
        self.test_user_registration()
        self.test_admin_login()
        self.test_manager_login()
        self.test_member_login()
        self.test_invalid_login()
        self.test_duplicate_registration()
        
        self.print_test_summary()
    
    def test_user_registration(self):
        """Test new user registration"""
        user_data = {
            "username": f"test_user_{int(time.time())}",
            "password": "test123",
            "email": "test@example.com",
            "full_name": "Test User",
            "role": "member"
        }
        response = self.make_request("POST", APIRoutes.AUTH_REGISTER, data=user_data)
        if response and response.status_code == 200:
            self.test_users["new_user"] = response.json()
            self.log_test("POST /api/register", True, f"Created user: {user_data['username']}")
        else:
            self.log_test("POST /api/register", False, "Failed to register user", response)
    
    def test_admin_login(self):
        """Test admin user login"""
        login_data = {
            "username": "admin_alice",
            "password": "admin123",
            "email": "",
            "full_name": "",
            "role": "member"
        }
        response = self.make_request("POST", APIRoutes.AUTH_LOGIN, data=login_data)
        if response and response.status_code == 200:
            user_data = response.json()
            self.test_users["admin"] = user_data
            self.log_test("POST /api/login (admin)", True, f"Logged in as {user_data.get('username')}")
        else:
            self.log_test("POST /api/login (admin)", False, "Failed to login as admin", response)
    
    def test_manager_login(self):
        """Test manager user login"""
        manager_login = {
            "username": "manager_david",
            "password": "manager123",
            "email": "",
            "full_name": "",
            "role": "member"
        }
        response = self.make_request("POST", APIRoutes.AUTH_LOGIN, data=manager_login)
        if response and response.status_code == 200:
            user_data = response.json()
            self.test_users["manager"] = user_data
            self.log_test("POST /api/login (manager)", True, f"Logged in as {user_data.get('username')}")
        else:
            self.log_test("POST /api/login (manager)", False, "Failed to login as manager", response)
    
    def test_member_login(self):
        """Test member user login"""
        member_login = {
            "username": "frontend_emma",
            "password": "dev123",
            "email": "",
            "full_name": "",
            "role": "member"
        }
        response = self.make_request("POST", APIRoutes.AUTH_LOGIN, data=member_login)
        if response and response.status_code == 200:
            user_data = response.json()
            self.test_users["member"] = user_data
            self.log_test("POST /api/login (member)", True, f"Logged in as {user_data.get('username')}")
        else:
            self.log_test("POST /api/login (member)", False, "Failed to login as member", response)
    
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        invalid_login = {
            "username": "nonexistent_user",
            "password": "wrong_password",
            "email": "",
            "full_name": "",
            "role": "member"
        }
        response = self.make_request("POST", APIRoutes.AUTH_LOGIN, data=invalid_login)
        
        # Should fail with 401 or 400; 500 indicates a server-side issue
        if response and response.status_code == 500:
            self.log_test("POST /api/login (invalid)", False, "Server error occurred (500) during invalid login test", response)
        else:
            success = response is not None and response.status_code in [400, 401]
            self.log_test("POST /api/login (invalid)", success, "Correctly rejected invalid credentials", response)
    
    def test_duplicate_registration(self):
        """Test registration with existing username"""
        duplicate_user = {
            "username": "admin_alice",  # Existing username
            "password": "test123",
            "email": "duplicate@example.com",
            "full_name": "Duplicate User",
            "role": "member"
        }
        response = self.make_request("POST", APIRoutes.AUTH_REGISTER, data=duplicate_user)
        # Should fail with 400 or 409
        success = response is not None and response.status_code in [400, 409]
        self.log_test("POST /api/register (duplicate)", success, "Correctly rejected duplicate username", response)


def main():
    """Run authentication tests"""
    test_suite = AuthenticationTest()
    test_suite.run_tests()


if __name__ == "__main__":
    main() 