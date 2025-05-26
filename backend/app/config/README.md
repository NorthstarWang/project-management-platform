# Centralized Route Configuration System

This directory contains the centralized route configuration system for the Project Management Platform. This system ensures consistency between backend routes and test files, making it easy to maintain and modify API endpoints.

## Overview

The centralized route configuration system provides:

- **Single source of truth** for all API endpoints
- **Consistency** between backend routes and test files
- **Easy maintenance** - change a route in one place and it updates everywhere
- **Type safety** with helper functions for common patterns
- **Extensibility** for adding new routes

## Files

### `routes.py`
The main configuration file containing:
- `APIRoutes` class with all endpoint definitions
- Helper functions for common route patterns
- Utility methods for dynamic route generation

### `__init__.py`
Package initialization file that exports the main classes and functions for easy importing.

## Usage

### In Test Files

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

### In Backend Routes (Future Enhancement)

```python
from app.config import APIRoutes

# In your FastAPI router
@router.post(APIRoutes.TASKS_CREATE)
async def create_task():
    pass

@router.get(APIRoutes.TASKS_DETAIL)
async def get_task(task_id: str):
    pass
```

## Route Categories

### Authentication Routes
- `AUTH_REGISTER` - `/api/register`
- `AUTH_LOGIN` - `/api/login`

### User Management Routes
- `USERS_LIST` - `/api/users`
- `USERS_ME` - `/api/users/me`
- `USERS_ASSIGNED_TASKS` - `/api/users/{user_id}/assigned_tasks`
- `USERS_ASSIGNED_PROJECTS` - `/api/users/me/assigned_projects`
- `USERS_BOARDS` - `/api/users/me/boards`

### Project Management Routes
- `PROJECTS_CREATE` - `/api/projects`
- `PROJECTS_LIST` - `/api/projects`
- `PROJECTS_DETAIL` - `/api/projects/{project_id}`
- `PROJECTS_ASSIGN_MANAGER` - `/api/projects/{project_id}/assign_manager`
- `PROJECTS_MANAGERS` - `/api/projects/{project_id}/managers`
- `PROJECTS_BOARDS` - `/api/projects/{project_id}/boards`
- `PROJECTS_SEARCH` - `/api/projects/{project_id}/search`

### Board Management Routes
- `BOARDS_CREATE` - `/api/boards`
- `BOARDS_DETAIL` - `/api/boards/{board_id}`
- `BOARDS_ENROLL_MEMBER` - `/api/boards/{board_id}/enroll_member`
- `BOARDS_MEMBERS` - `/api/boards/{board_id}/members`
- `BOARDS_REMOVE_MEMBER` - `/api/boards/{board_id}/members/{user_id}`
- `BOARDS_SEARCH` - `/api/boards/{board_id}/search`

### Task Management Routes
- `TASKS_CREATE` - `/api/tasks`
- `TASKS_DETAIL` - `/api/tasks/{task_id}`
- `TASKS_MOVE` - `/api/tasks/{task_id}/move`
- `TASKS_ARCHIVE` - `/api/tasks/{task_id}/archive`
- `TASKS_UNARCHIVE` - `/api/tasks/{task_id}/unarchive`
- `TASKS_FULL` - `/api/tasks/{task_id}/full`

### Notification Routes
- `NOTIFICATIONS_LIST` - `/api/notifications`
- `NOTIFICATIONS_UNREAD_COUNT` - `/api/notifications/unread_count`
- `NOTIFICATIONS_MARK_READ` - `/api/notifications/{notification_id}/mark_read`
- `NOTIFICATIONS_MARK_ALL_READ` - `/api/notifications/mark_all_read`

### Synthetic API Routes (Testing)
- `SYNTHETIC_NEW_SESSION` - `/_synthetic/new_session`
- `SYNTHETIC_STATE` - `/_synthetic/state`
- `SYNTHETIC_RESET` - `/_synthetic/reset`
- `SYNTHETIC_LOG_EVENT` - `/_synthetic/log_event`
- `SYNTHETIC_LOGS` - `/_synthetic/logs`
- `SYNTHETIC_VERIFY_TASK` - `/_synthetic/verify_task`

## Helper Functions

### `get_route(route_name, **kwargs)`
Get a route with parameters filled in:
```python
route = APIRoutes.get_route('TASKS_DETAIL', task_id='123')
# Returns: '/api/tasks/123'
```

### Convenience Functions
- `get_user_route(user_id)` - Get user assigned tasks route
- `get_project_route(project_id)` - Get project detail route
- `get_board_route(board_id)` - Get board detail route
- `get_task_route(task_id)` - Get task detail route
- `get_search_route(entity_type, entity_id)` - Get search route for board or project

## Adding New Routes

To add a new route:

1. **Add to `routes.py`**:
   ```python
   class APIRoutes:
       # ... existing routes ...
       NEW_FEATURE_CREATE = f"{API_BASE}/new-feature"
       NEW_FEATURE_DETAIL = f"{API_BASE}/new-feature/{{feature_id}}"
   ```

2. **Add helper function if needed**:
   ```python
   def get_new_feature_route(feature_id: str) -> str:
       return APIRoutes.NEW_FEATURE_DETAIL.format(feature_id=feature_id)
   ```

3. **Update `__init__.py`**:
   ```python
   from .routes import APIRoutes, get_new_feature_route
   __all__ = ['APIRoutes', 'get_new_feature_route', ...]
   ```

4. **Use in tests**:
   ```python
   response = self.make_request("POST", APIRoutes.NEW_FEATURE_CREATE)
   response = self.make_request("GET", APIRoutes.NEW_FEATURE_DETAIL.format(feature_id=id))
   ```

## Benefits

### ✅ **Consistency**
- All endpoints defined in one place
- No more hardcoded strings scattered across files
- Consistent naming conventions

### ✅ **Maintainability**
- Change a route once, updates everywhere
- Easy to find all endpoints
- Clear documentation of API structure

### ✅ **Developer Experience**
- IDE autocomplete for route names
- Type safety with helper functions
- Clear error messages for invalid routes

### ✅ **Testing**
- Tests automatically use correct endpoints
- Easy to update test routes when API changes
- Fallback system for import failures

### ✅ **Extensibility**
- Easy to add new routes
- Helper functions for common patterns
- Flexible parameter substitution

## Migration Guide

To migrate existing code to use centralized routes:

1. **Import the configuration**:
   ```python
   from app.config import APIRoutes
   ```

2. **Replace hardcoded strings**:
   ```python
   # Before
   response = self.make_request("POST", "/api/tasks")
   
   # After
   response = self.make_request("POST", APIRoutes.TASKS_CREATE)
   ```

3. **Use helper functions for parameterized routes**:
   ```python
   # Before
   response = self.make_request("GET", f"/api/tasks/{task_id}")
   
   # After
   response = self.make_request("GET", APIRoutes.TASKS_DETAIL.format(task_id=task_id))
   ```

4. **Add fallback for import safety**:
   ```python
   try:
       from app.config import APIRoutes
   except ImportError:
       class APIRoutes:
           TASKS_CREATE = "/api/tasks"
           # ... minimal fallback routes
   ```

This centralized system makes the codebase more maintainable, consistent, and easier to extend as the API grows. 