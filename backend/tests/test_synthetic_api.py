#!/usr/bin/env python3
"""
Synthetic API Test Suite
Tests all /_synthetic/* endpoints for environment control and observability
"""

import os
from base_test import BaseAPITest


class SyntheticAPITest(BaseAPITest):
    """Test suite for synthetic API endpoints"""
    
    def run_tests(self):
        """Run all synthetic API tests"""
        print("🔧 TESTING SYNTHETIC API")
        print("-" * 30)
        
        self.test_new_session()
        self.test_get_state()
        self.test_log_event()
        self.test_get_logs()
        self.test_verify_task()
        self.test_reset_environment()
        self.test_augment_state()
        self.test_set_state()
        
        self.print_test_summary()
    
    def test_new_session(self):
        """Test session initialization"""
        response = self.make_request("POST", "/_synthetic/new_session", params={"seed": "test123"})
        if response and response.status_code == 200:
            data = response.json()
            self.session_id = data.get("session_id")
            self.log_test("POST /_synthetic/new_session", True, f"Session ID: {self.session_id}")
        else:
            self.log_test("POST /_synthetic/new_session", False, "Failed to create session", response)
    
    def test_get_state(self):
        """Test getting backend state"""
        response = self.make_request("GET", "/_synthetic/state")
        if response and response.status_code == 200:
            state = response.json()
            self.log_test("GET /_synthetic/state", True, f"Users: {len(state.get('users', []))}")
        else:
            self.log_test("GET /_synthetic/state", False, "Failed to get state", response)
    
    def test_log_event(self):
        """Test logging custom events"""
        # Use environment variable for frontend URL, fallback to localhost for local development
        frontend_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
        
        event_data = {
            "actionType": "test_action",
            "payload": {"test": "data", "page_url": f"{frontend_url}/test"}
        }
        response = self.make_request("POST", "/_synthetic/log_event", data=event_data)
        success = response and response.status_code == 200
        self.log_test("POST /_synthetic/log_event", success, "Custom event logged", response)
    
    def test_get_logs(self):
        """Test retrieving logs"""
        response = self.make_request("GET", "/_synthetic/logs")
        if response and response.status_code == 200:
            logs = response.json()
            self.log_test("GET /_synthetic/logs", True, f"Retrieved {len(logs)} log entries")
        else:
            self.log_test("GET /_synthetic/logs", False, "Failed to get logs", response)
    
    def test_verify_task(self):
        """Test task verification"""
        # First log a task completion
        task_event = {
            "actionType": "TASK_DONE",
            "payload": {"taskName": "test_task"}
        }
        self.make_request("POST", "/_synthetic/log_event", data=task_event)
        
        # Then verify the task
        response = self.make_request("GET", "/_synthetic/verify_task", params={"task_name": "test_task"})
        if response and response.status_code == 200:
            result = response.json()
            success = result.get("success", False)
            self.log_test("GET /_synthetic/verify_task", success, f"Task verification: {success}")
        else:
            self.log_test("GET /_synthetic/verify_task", False, "Failed to verify task", response)
    
    def test_reset_environment(self):
        """Test environment reset"""
        response = self.make_request("POST", "/_synthetic/reset", params={"seed": "test456"})
        if response and response.status_code == 200:
            result = response.json()
            self.log_test("POST /_synthetic/reset", True, f"Reset with seed: {result.get('seed')}")
        else:
            self.log_test("POST /_synthetic/reset", False, "Failed to reset environment", response)
    
    def test_augment_state(self):
        """Test state augmentation"""
        augment_data = {
            "test_property": "test_value",
            "custom_data": {"nested": "value"}
        }
        response = self.make_request("POST", "/_synthetic/augment_state", data=augment_data)
        if response and response.status_code == 200:
            self.log_test("POST /_synthetic/augment_state", True, "State augmented successfully")
        else:
            self.log_test("POST /_synthetic/augment_state", False, "Failed to augment state", response)
    
    def test_set_state(self):
        """Test state overwrite"""
        set_data = {
            "users": [{"id": "test_user", "username": "test"}],
            "projects": [],
            "custom_message": "State completely overwritten"
        }
        response = self.make_request("POST", "/_synthetic/set_state", data=set_data)
        if response and response.status_code == 200:
            self.log_test("POST /_synthetic/set_state", True, "State overwritten successfully")
        else:
            self.log_test("POST /_synthetic/set_state", False, "Failed to set state", response)
        
        # Reset to fresh state for other tests
        self.make_request("POST", "/_synthetic/reset", params={"seed": "test123"})


def main():
    """Run synthetic API tests"""
    test_suite = SyntheticAPITest()
    test_suite.run_tests()


if __name__ == "__main__":
    main() 