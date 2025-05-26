#!/usr/bin/env python3
"""
Comprehensive Test Runner for Project Management Platform
Runs all route-specific test suites or individual test categories
"""

import sys
import os
import argparse
from typing import List, Dict, Any

# Import all test suites
from test_synthetic_api import SyntheticAPITest
from test_auth import AuthenticationTest
from test_users import UserManagementTest
from test_projects import ProjectManagementTest
from test_boards import BoardManagementTest
from test_tasks import TaskManagementTest
from test_notifications import NotificationTest
from test_search import SearchTest


class ComprehensiveTestRunner:
    """Runs all API test suites with consolidated reporting"""
    
    def __init__(self, base_url: str = None):
        # Use environment variable or fallback to localhost for local development
        if base_url is None:
            base_url = os.getenv("API_BASE_URL", "http://localhost:8000")
        
        self.base_url = base_url
        # Set environment variable so test classes can pick it up
        os.environ["API_BASE_URL"] = self.base_url
        
        self.test_suites = {
            "synthetic": SyntheticAPITest,
            "auth": AuthenticationTest,
            "users": UserManagementTest,
            "projects": ProjectManagementTest,
            "boards": BoardManagementTest,
            "tasks": TaskManagementTest,
            "notifications": NotificationTest,
            "search": SearchTest
        }
        self.overall_results = {
            "passed": 0,
            "failed": 0,
            "suite_results": {}
        }
    
    def run_all_tests(self):
        """Run all test suites"""
        print("🧪 COMPREHENSIVE API TEST SUITE")
        print("=" * 60)
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        for suite_name, suite_class in self.test_suites.items():
            print(f"\n{'='*20} {suite_name.upper()} TESTS {'='*20}")
            suite = suite_class()  # No parameters needed
            suite.run_tests()
            
            # Collect results from new format
            passed = sum(1 for r in suite.test_results if r['success'])
            failed = len(suite.test_results) - passed
            errors = [r['test'] + ": " + r['message'] for r in suite.test_results if not r['success']]
            
            self.overall_results["passed"] += passed
            self.overall_results["failed"] += failed
            self.overall_results["suite_results"][suite_name] = {
                "passed": passed,
                "failed": failed,
                "errors": errors
            }
        
        self.print_overall_summary()
        return 0 if self.overall_results["failed"] == 0 else 1
    
    def run_specific_tests(self, test_suites: List[str]):
        """Run specific test suites"""
        print("🧪 SELECTIVE API TEST SUITE")
        print("=" * 60)
        print(f"Testing against: {self.base_url}")
        print(f"Running suites: {', '.join(test_suites)}")
        print("=" * 60)
        
        for suite_name in test_suites:
            if suite_name not in self.test_suites:
                print(f"❌ Unknown test suite: {suite_name}")
                continue
            
            print(f"\n{'='*20} {suite_name.upper()} TESTS {'='*20}")
            suite_class = self.test_suites[suite_name]
            suite = suite_class()  # No parameters needed
            suite.run_tests()
            
            # Collect results from new format
            passed = sum(1 for r in suite.test_results if r['success'])
            failed = len(suite.test_results) - passed
            errors = [r['test'] + ": " + r['message'] for r in suite.test_results if not r['success']]
            
            self.overall_results["passed"] += passed
            self.overall_results["failed"] += failed
            self.overall_results["suite_results"][suite_name] = {
                "passed": passed,
                "failed": failed,
                "errors": errors
            }
        
        self.print_overall_summary()
        return 0 if self.overall_results["failed"] == 0 else 1
    
    def print_overall_summary(self):
        """Print comprehensive test results summary"""
        total = self.overall_results["passed"] + self.overall_results["failed"]
        success_rate = (self.overall_results["passed"] / total * 100) if total > 0 else 0
        
        print("\n" + "=" * 60)
        print("📊 OVERALL TEST RESULTS SUMMARY")
        print("=" * 60)
        print(f"✅ Total Passed: {self.overall_results['passed']}")
        print(f"❌ Total Failed: {self.overall_results['failed']}")
        print(f"📈 Overall Success Rate: {success_rate:.1f}%")
        
        print("\n📋 SUITE BREAKDOWN:")
        for suite_name, results in self.overall_results["suite_results"].items():
            suite_total = results["passed"] + results["failed"]
            suite_rate = (results["passed"] / suite_total * 100) if suite_total > 0 else 0
            status = "✅" if results["failed"] == 0 else "⚠️" if suite_rate >= 50 else "❌"
            print(f"  {status} {suite_name.capitalize()}: {results['passed']}/{suite_total} ({suite_rate:.1f}%)")
        
        # Print all errors
        all_errors = []
        for suite_name, results in self.overall_results["suite_results"].items():
            for error in results["errors"]:
                all_errors.append(f"[{suite_name}] {error}")
        
        if all_errors:
            print("\n❌ ALL FAILED TESTS:")
            for error in all_errors:
                print(f"   • {error}")
        
        print("=" * 60)


def main():
    """Main entry point with command line argument parsing"""
    # Get default URL from environment or fallback to localhost
    default_url = os.getenv("API_BASE_URL", "http://localhost:8000")
    
    parser = argparse.ArgumentParser(description="Run API tests for Project Management Platform")
    parser.add_argument("--url", default=default_url, 
                       help=f"Base URL for the API (default: {default_url})")
    parser.add_argument("--suites", nargs="+", 
                       choices=["synthetic", "auth", "users", "projects", "boards", "tasks", "notifications", "search"],
                       help="Specific test suites to run (default: all)")
    parser.add_argument("--list", action="store_true", 
                       help="List available test suites")
    
    args = parser.parse_args()
    
    if args.list:
        print("Available test suites:")
        for suite in ["synthetic", "auth", "users", "projects", "boards", "tasks", "notifications", "search"]:
            print(f"  • {suite}")
        return 0
    
    # Create runner with specified URL
    runner = ComprehensiveTestRunner(args.url)
    
    if args.suites:
        exit_code = runner.run_specific_tests(args.suites)
    else:
        exit_code = runner.run_all_tests()
    
    sys.exit(exit_code)


if __name__ == "__main__":
    main() 