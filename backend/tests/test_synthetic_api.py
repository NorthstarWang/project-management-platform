#!/usr/bin/env python3
"""
Synthetic API Test Suite
Tests core synthetic endpoints for session management, state control, and logging
"""

from base_test import BaseAPITest
from test_config import APIRoutes


class SyntheticAPITest(BaseAPITest):
    """Test suite for synthetic API endpoints"""
    
    def run_tests(self):
        """Run all synthetic API tests"""
        print("🔧 TESTING SYNTHETIC API")
        print("-" * 30)
        
        self.test_new_session()
        self.test_log_event()
        self.test_get_logs()
        self.test_get_state()
        self.test_reset_environment()
        self.test_augment_state()
        self.test_set_state()
        self.test_verify_task()
        
        self.print_test_summary()
    
    def test_new_session(self):
        """Test creating a new session"""
        response = self.make_request("POST", APIRoutes.SYNTHETIC_NEW_SESSION, params={"seed": "test123"})
        if response and response.status_code == 200:
            data = response.json()
            if "session_id" in data:
                self.session_id = data["session_id"]
                self.log_test("POST /_synthetic/new_session", True, f"Created session: {self.session_id}")
            else:
                self.log_test("POST /_synthetic/new_session", False, "No session_id in response")
        else:
            self.log_test("POST /_synthetic/new_session", False, "Failed to create session", response)
    
    def test_log_event(self):
        """Test logging a custom event"""
        if not self.session_id:
            self.log_test("POST /_synthetic/log_event", False, "No session available")
            return
        
        event_data = {
            "actionType": "test_action",
            "payload": {
                "test_property": "test_value",
                "page_url": "http://localhost:3000/test"
            }
        }
        
        response = self.make_request("POST", APIRoutes.SYNTHETIC_LOG_EVENT, data=event_data)
        if response and response.status_code == 200:
            data = response.json()
            success = data.get("status") == "logged"
            self.log_test("POST /_synthetic/log_event", success, "Event logged successfully")
        else:
            self.log_test("POST /_synthetic/log_event", False, "Failed to log event", response)
    
    def test_get_logs(self):
        """Test retrieving logs for session"""
        if not self.session_id:
            self.log_test("GET /_synthetic/logs", False, "No session available")
            return
        
        response = self.make_request("GET", APIRoutes.SYNTHETIC_LOGS)
        if response and response.status_code == 200:
            logs = response.json()
            success = isinstance(logs, list)
            self.log_test("GET /_synthetic/logs", success, f"Retrieved {len(logs)} log entries")
        else:
            self.log_test("GET /_synthetic/logs", False, "Failed to get logs", response)
    
    def test_get_state(self):
        """Test retrieving backend state"""
        response = self.make_request("GET", APIRoutes.SYNTHETIC_STATE)
        if response and response.status_code == 200:
            state = response.json()
            has_users = "users" in state
            has_projects = "projects" in state
            success = has_users and has_projects
            self.log_test("GET /_synthetic/state", success, f"State has users: {has_users}, projects: {has_projects}")
        else:
            self.log_test("GET /_synthetic/state", False, "Failed to get state", response)
    
    def test_reset_environment(self):
        """Test resetting the environment"""
        response = self.make_request("POST", APIRoutes.SYNTHETIC_RESET, params={"seed": "reset123"})
        if response and response.status_code == 200:
            data = response.json()
            success = data.get("status") == "ok"
            self.log_test("POST /_synthetic/reset", success, "Environment reset successfully")
        else:
            self.log_test("POST /_synthetic/reset", False, "Failed to reset environment", response)
    
    def test_augment_state(self):
        """Test augmenting backend state"""
        augment_data = {
            "test_property": "augmented_value",
            "test_array": ["item1", "item2"]
        }
        
        response = self.make_request("POST", APIRoutes.SYNTHETIC_AUGMENT_STATE, data=augment_data)
        if response and response.status_code == 200:
            data = response.json()
            success = data.get("status") == "ok"
            self.log_test("POST /_synthetic/augment_state", success, "State augmented successfully")
        else:
            self.log_test("POST /_synthetic/augment_state", False, "Failed to augment state", response)
    
    def test_set_state(self):
        """Test setting (overwriting) backend state"""
        new_state = {
            "users": [{"id": "test_user", "username": "test"}],
            "projects": [],
            "test_message": "State overwritten"
        }
        
        response = self.make_request("POST", APIRoutes.SYNTHETIC_SET_STATE, data=new_state)
        if response and response.status_code == 200:
            data = response.json()
            success = data.get("status") == "ok"
            self.log_test("POST /_synthetic/set_state", success, "State set successfully")
        else:
            self.log_test("POST /_synthetic/set_state", False, "Failed to set state", response)
    
    def test_verify_task(self):
        """Test task verification"""
        if not self.session_id:
            self.log_test("GET /_synthetic/verify_task", False, "No session available")
            return
        
        # First log a task completion
        task_done_event = {
            "actionType": "TASK_DONE",
            "payload": {
                "taskName": "test_task"
            }
        }
        
        log_response = self.make_request("POST", APIRoutes.SYNTHETIC_LOG_EVENT, data=task_done_event)
        if not log_response or log_response.status_code != 200:
            self.log_test("GET /_synthetic/verify_task", False, "Failed to log task completion")
            return
        
        # Now verify the task
        response = self.make_request("GET", APIRoutes.SYNTHETIC_VERIFY_TASK, params={"task_name": "test_task"})
        if response and response.status_code == 200:
            data = response.json()
            success = data.get("success") is True
            self.log_test("GET /_synthetic/verify_task", success, f"Task verification: {data.get('success')}")
        else:
            self.log_test("GET /_synthetic/verify_task", False, "Failed to verify task", response)


def main():
    """Run synthetic API tests"""
    test_suite = SyntheticAPITest()
    test_suite.run_tests()


if __name__ == "__main__":
    main() 