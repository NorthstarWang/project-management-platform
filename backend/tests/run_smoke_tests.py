#!/usr/bin/env python3
"""
Smoke Test Runner - Quick validation using modular test suites
Runs only critical ones for quick validation
"""

import sys
import os
import time
from typing import List, Dict

# Import modular test suites
from test_synthetic_api import SyntheticAPITest
from test_auth import AuthenticationTest
from test_users import UserManagementTest
from test_projects import ProjectManagementTest
from test_boards import BoardManagementTest
from test_tasks import TaskManagementTest
from test_notifications import NotificationTest
from test_search import SearchTest


class SmokeTestRunner:
    """Runs critical tests from each module for quick validation"""
    
    def __init__(self, base_url: str = None):
        # Use environment variable or fallback to localhost for local development
        if base_url is None:
            base_url = os.getenv("API_BASE_URL", "http://localhost:8000")
        
        self.base_url = base_url
        self.results = {
            "passed": 0,
            "failed": 0,
            "total": 0,
            "errors": []
        }
    
    def run_smoke_tests(self):
        """Run smoke tests - 1-2 critical tests per module"""
        print("🚀 SMOKE TEST SUITE")
        print("=" * 50)
        print(f"Testing: {self.base_url}")
        print("Quick validation of critical endpoints")
        print("=" * 50)
        
        start_time = time.time()
        
        # Run critical tests from each module
        self.test_synthetic_critical()
        self.test_auth_critical()
        self.test_users_critical()
        self.test_projects_critical()
        self.test_boards_critical()
        self.test_tasks_critical()
        self.test_notifications_critical()
        self.test_search_critical()
        
        end_time = time.time()
        duration = end_time - start_time
        
        self.print_smoke_summary(duration)
        
        # Return exit code
        return 0 if self.results["failed"] == 0 else 1
    
    def run_critical_test(self, test_class, test_method_name: str, description: str):
        """Run a single critical test method"""
        try:
            # Create test instance
            test_instance = test_class(self.base_url)
            test_instance.setup_session()
            test_instance.setup_test_users()
            
            # Run specific test method
            test_method = getattr(test_instance, test_method_name)
            test_method()
            
            # Check results
            if test_instance.test_results["failed"] == 0:
                print(f"✅ {description}")
                self.results["passed"] += 1
            else:
                print(f"❌ {description}")
                self.results["failed"] += 1
                self.results["errors"].extend(test_instance.test_results["errors"])
            
            self.results["total"] += 1
            
        except Exception as e:
            print(f"❌ {description} - Error: {e}")
            self.results["failed"] += 1
            self.results["total"] += 1
            self.results["errors"].append(f"{description}: {str(e)}")
    
    def test_synthetic_critical(self):
        """Test critical synthetic API endpoints"""
        print("\n🔧 Synthetic API")
        self.run_critical_test(SyntheticAPITest, "test_new_session", "Session initialization")
        self.run_critical_test(SyntheticAPITest, "test_get_state", "State retrieval")
    
    def test_auth_critical(self):
        """Test critical authentication"""
        print("\n🔐 Authentication")
        self.run_critical_test(AuthenticationTest, "test_admin_login", "Admin login")
    
    def test_users_critical(self):
        """Test critical user management"""
        print("\n👥 User Management")
        self.run_critical_test(UserManagementTest, "test_get_current_user_info", "Current user info")
    
    def test_projects_critical(self):
        """Test critical project management"""
        print("\n📋 Project Management")
        self.run_critical_test(ProjectManagementTest, "test_list_user_projects", "Project listing")
    
    def test_boards_critical(self):
        """Test critical board management"""
        print("\n📊 Board Management")
        self.run_critical_test(BoardManagementTest, "test_get_user_boards", "User boards")
    
    def test_tasks_critical(self):
        """Test critical task management"""
        print("\n✅ Task Management")
        self.run_critical_test(TaskManagementTest, "test_create_task", "Task creation")
    
    def test_notifications_critical(self):
        """Test critical notifications"""
        print("\n🔔 Notifications")
        self.run_critical_test(NotificationTest, "test_get_unread_count", "Unread count")
    
    def test_search_critical(self):
        """Test critical search functionality"""
        print("\n🔍 Search")
        self.run_critical_test(SearchTest, "test_board_search", "Board search")
    
    def print_smoke_summary(self, duration: float):
        """Print smoke test summary"""
        success_rate = (self.results["passed"] / self.results["total"] * 100) if self.results["total"] > 0 else 0
        
        print("\n" + "=" * 50)
        print("🚀 SMOKE TEST SUMMARY")
        print("=" * 50)
        print(f"⏱️  Duration: {duration:.1f} seconds")
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        print(f"📊 Total: {self.results['total']}")
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 95:
            print("\n🎉 EXCELLENT! All critical systems operational!")
        elif success_rate >= 85:
            print("\n✅ GOOD! Core functionality working.")
        elif success_rate >= 70:
            print("\n⚠️ WARNING! Some critical issues detected.")
        else:
            print("\n❌ CRITICAL! Major systems failing.")
        
        if self.results["errors"]:
            print(f"\n❌ ERRORS ({len(self.results['errors'])}):")
            for error in self.results["errors"][:5]:  # Show first 5 errors
                print(f"   • {error}")
            if len(self.results["errors"]) > 5:
                print(f"   ... and {len(self.results['errors']) - 5} more")
        
        print("=" * 50)


def main():
    """Run smoke tests"""
    runner = SmokeTestRunner()
    exit_code = runner.run_smoke_tests()
    sys.exit(exit_code)


if __name__ == "__main__":
    main() 