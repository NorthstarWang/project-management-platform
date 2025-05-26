# API Test Suite

This directory contains comprehensive test suites for the Project Management Platform API, organized by route categories for better maintainability and targeted testing. All test files use the centralized route configuration system for consistency and easy maintenance.

## 🔧 Centralized Route Configuration

All test files use the centralized route configuration system located in `../app/config/routes.py`. This provides:

- **Consistency**: All tests use the same endpoint definitions as the backend
- **Maintainability**: Route changes in one place update all tests automatically
- **Safety**: Fallback route definitions if import fails
- **Type Safety**: Helper functions for parameterized routes

### Usage in Test Files

```python
import sys
import os
from base_test import BaseAPITest

# Add the parent directory to the path so we can import from app.config
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

try:
    from app.config import APIRoutes, get_search_route
except ImportError:
    # Fallback if import fails
    class APIRoutes:
        TASKS_CREATE = "/api/tasks"
        TASKS_DETAIL = "/api/tasks/{task_id}"
        # ... other routes

class MyTest(BaseAPITest):
    def test_create_task(self):
        # Use centralized routes
        response = self.make_request("POST", APIRoutes.TASKS_CREATE, data=task_data)
        
    def test_update_task(self):
        # Use parameterized routes
        response = self.make_request("PUT", APIRoutes.TASKS_DETAIL.format(task_id=task_id))
        
    def test_search(self):
        # Use helper functions
        response = self.make_request("GET", get_search_route("board", board_id))
```

## Configuration

### Environment Variables

The test suite supports environment-based configuration for server deployment:

| Variable | Description | Default |
|----------|-------------|---------|
| `API_BASE_URL` | Base URL for the API server | `http://localhost:8000` |

**Examples:**
```bash
# Local development (default)
python run_all_tests.py

# Custom server
export API_BASE_URL="http://api.example.com:8000"
python run_all_tests.py

# Docker environment (automatic - API_BASE_URL=http://backend:8000)
docker-compose exec backend python tests/run_all_tests.py

# Production server
export API_BASE_URL="https://api.production.com"
python run_all_tests.py
```

### Command Line Override

You can also specify the URL directly via command line:
```bash
# Override environment variable
python run_all_tests.py --url http://staging.example.com:8000

# Smoke tests with custom URL
python run_smoke_tests.py  # Uses API_BASE_URL or localhost:8000
```

## Test Structure

The test suite is organized into modular files, each focusing on specific API route categories:

### Test Files

| File | Description | Routes Tested |
|------|-------------|---------------|
| `base_test.py` | Base test class with shared functionality | Common utilities |
| `test_synthetic_api.py` | Synthetic API endpoints | `/_synthetic/*` |
| `test_auth.py` | Authentication endpoints | `/api/register`, `/api/login` |
| `test_users.py` | User management endpoints | `/api/users/*` |
| `test_projects.py` | Project management endpoints | `/api/projects/*` |
| `test_boards.py` | Board management endpoints | `/api/boards/*` |
| `test_tasks.py` | Task management endpoints | `/api/tasks/*` |
| `test_notifications.py` | Notification system endpoints | `/api/notifications/*` |
| `test_search.py` | Search functionality endpoints | `/api/*/search` |

### Test Runners

| File | Description |
|------|-------------|
| `run_all_tests.py` | Comprehensive test runner with CLI options |
| `run_smoke_tests.py` | Quick validation suite (~15 seconds) |

## Running Tests

### Prerequisites

1. **Backend server must be running**:
   ```bash
   cd backend
   docker-compose up --build
   # OR
   python -m uvicorn app.main:app --reload
   ```

2. **Install dependencies** (if running outside Docker):
   ```bash
   pip install requests
   ```

### Running All Tests

```bash
# Run all test suites
python run_all_tests.py

# Run with custom URL
python run_all_tests.py --url http://localhost:8000
```

### Running Specific Test Suites

```bash
# Run only authentication tests
python run_all_tests.py --suites auth

# Run multiple specific suites
python run_all_tests.py --suites auth users projects

# List available test suites
python run_all_tests.py --list
```

### Running Individual Test Files

```bash
# Run specific test category
python test_auth.py
python test_tasks.py
python test_notifications.py

# Run with custom URL
python test_synthetic_api.py  # Uses default localhost:8000
```

## Test Categories

### 1. Synthetic API Tests (`test_synthetic_api.py`)
Tests environment control and observability endpoints:
- Session management (`/_synthetic/new_session`)
- State management (`/_synthetic/state`, `/_synthetic/set_state`, `/_synthetic/augment_state`)
- Event logging (`/_synthetic/log_event`, `/_synthetic/logs`)
- Task verification (`/_synthetic/verify_task`)
- Environment reset (`/_synthetic/reset`)

### 2. Authentication Tests (`test_auth.py`)
Tests user authentication and registration:
- User registration with validation
- Login for different user roles (admin, manager, member)
- Invalid credential handling
- Duplicate username prevention

### 3. User Management Tests (`test_users.py`)
Tests user-related endpoints:
- Getting all users (admin-only)
- Current user information
- User assigned tasks
- Role-based access control

### 4. Project Management Tests (`test_projects.py`)
Tests project lifecycle and management:
- Project creation (admin/manager only)
- Project listing and details
- Manager assignment to projects
- Project access control

### 5. Board Management Tests (`test_boards.py`)
Tests board operations and member management:
- Board creation within projects
- Board member enrollment/removal
- Board access and listing
- Role-based board permissions

### 6. Task Management Tests (`test_tasks.py`)
Tests comprehensive task operations:
- Task creation, updating, deletion
- Task movement between lists
- Task archiving/unarchiving
- Task details with comments and activities

### 7. Notification Tests (`test_notifications.py`)
Tests notification system:
- Notification retrieval (all/unread)
- Unread notification count
- Marking notifications as read
- Bulk notification management

### 8. Search Tests (`test_search.py`)
Tests search functionality:
- Board-level task search
- Project-level task search
- Search result validation
- Error handling for invalid searches

## Test Features

### Comprehensive Coverage
- **51+ API endpoints** tested across all categories
- **Role-based testing** (admin, manager, member permissions)
- **Error handling** validation for invalid requests
- **Edge cases** and boundary condition testing
- **Centralized route configuration** ensures consistency

### Realistic Test Scenarios
- Uses existing mock data (17 users, 3 teams, 14 boards, 56 tasks)
- Tests complex workflows (project → board → task → comment chains)
- Validates automatic activity and notification generation
- Tests cross-entity relationships and dependencies

### Detailed Reporting
- ✅/❌ Pass/fail indicators for each test
- Detailed error messages with HTTP status codes
- Response body inspection for failed tests
- Comprehensive summary with success rates
- Suite-by-suite breakdown of results

## Example Output

```
🧪 COMPREHENSIVE API TEST SUITE
============================================================
Testing against: http://localhost:8000
============================================================

==================== SYNTHETIC TESTS ====================
🔧 TESTING SYNTHETIC API
------------------------------
✅ PASS POST /_synthetic/new_session
    Session ID: abc123...
✅ PASS GET /_synthetic/state
    Users: 17
✅ PASS POST /_synthetic/log_event
    Custom event logged
...

==================== AUTH TESTS ====================
🔐 TESTING AUTHENTICATION
------------------------------
✅ PASS POST /api/register
    Created user: test_user_1234567890
✅ PASS POST /api/login (admin)
    Logged in as admin_alice
...

============================================================
📊 OVERALL TEST RESULTS SUMMARY
============================================================
✅ Total Passed: 45
❌ Total Failed: 3
📈 Overall Success Rate: 93.8%

📋 SUITE BREAKDOWN:
  ✅ Synthetic: 8/8 (100.0%)
  ✅ Auth: 6/6 (100.0%)
  ⚠️ Users: 4/5 (80.0%)
  ✅ Projects: 7/7 (100.0%)
  ...
============================================================
```

## Development Guidelines

### Adding New Tests

1. **Create new test file** following the naming pattern `test_<category>.py`
2. **Inherit from BaseAPITest** for common functionality
3. **Use centralized routes** from `app.config.APIRoutes`
4. **Add to run_all_tests.py** test suite registry
5. **Follow existing patterns** for test structure and naming

### Test Structure Pattern

```python
import sys
import os
from base_test import BaseAPITest

# Add the parent directory to the path so we can import from app.config
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

try:
    from app.config import APIRoutes
except ImportError:
    # Fallback if import fails
    class APIRoutes:
        NEW_FEATURE_CREATE = "/api/new-feature"
        NEW_FEATURE_DETAIL = "/api/new-feature/{feature_id}"

class NewCategoryTest(BaseAPITest):
    def run_tests(self):
        print("🔧 TESTING NEW CATEGORY")
        print("-" * 30)
        
        if not self.setup_session():
            return
        
        self.setup_test_users()
        self.test_specific_functionality()
        self.print_test_summary()
    
    def test_specific_functionality(self):
        response = self.make_request("POST", APIRoutes.NEW_FEATURE_CREATE, data=data)
        # Test implementation
        pass
```

### Best Practices

- **Use centralized routes** from `APIRoutes` class instead of hardcoded strings
- **Include fallback routes** in case import fails
- **Use descriptive test names** that clearly indicate what's being tested
- **Test both success and failure cases** for comprehensive coverage
- **Validate response structure** and status codes
- **Include edge cases** and boundary conditions
- **Use existing mock data** when possible to avoid test pollution
- **Clean up test data** or use isolated test environments

## Troubleshooting

### Common Issues

1. **Connection refused**: Ensure backend server is running on correct port
2. **Test failures**: Check if backend state is properly initialized
3. **Permission errors**: Verify user roles and authentication setup
4. **Timeout issues**: Increase request timeout or check server performance
5. **Import errors**: Ensure `app.config` module is accessible from test directory

### Debug Mode

For detailed debugging, modify the `log_test` method in `base_test.py` to include more verbose output or add print statements in individual test methods.

## Legacy Files

- `comprehensive_api_test.py` - Original monolithic test file (deprecated)

### Test Infrastructure Features

#### 🏗️ **Shared Test Foundation** (`base_test.py`)
- **Automatic Session Isolation**: Each test run gets a unique session with a new seed (`test_{timestamp}_{object_id}`)
- **Environment Reset**: Backend state is reset before each test using `/_synthetic/reset`
- **Resource Tracking**: Helper methods (`create_test_project`, etc.) automatically track created entities
- **Automatic Cleanup**: All tracked resources and test data are cleared after each test via `cleanup_test_data()`
- **Pre-configured Test Users**: `admin_alice`, `manager_david`, `frontend_emma` available via `self.test_users`
- **Standardized Assertions**: `log_test()` method for consistent pass/fail reporting
- **Error Handling**: `make_request()` handles common request exceptions
- **Centralized Route Configuration**: Uses `APIRoutes` class with fallback support

#### 🔄 **Isolated Test Execution** (`run_isolated_test()`)
- Wrapper method in `BaseAPITest` ensures each test method runs in complete isolation:
  1. Sets up a fresh session and test users
  2. Executes the test method
  3. Cleans up all data and resets environment (even if test fails)

```python
# Example of isolated test execution in test files
class MyTestSuite(BaseAPITest):
    def run_tests(self):
        self.run_isolated_test(self.test_feature_one)
        self.run_isolated_test(self.test_feature_two)
    
    def test_feature_one(self):
        # Create resources for this test only
        project = self.create_test_project()
        # ... test logic ...
        # All created resources automatically cleaned up
```

#### 📊 **Comprehensive Reporting**
// ... existing code ... 