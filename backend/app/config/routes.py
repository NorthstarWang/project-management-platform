#!/usr/bin/env python3
"""
Centralized Route Configuration
Defines all API endpoints in one place for consistency across backend routes and tests
"""

class APIRoutes:
    """Centralized API route definitions"""
    
    # Base paths
    API_BASE = "/api"
    SYNTHETIC_BASE = "/_synthetic"
    
    # Authentication routes
    AUTH_REGISTER = f"{API_BASE}/register"
    AUTH_LOGIN = f"{API_BASE}/login"
    
    # User management routes
    USERS_LIST = f"{API_BASE}/users"
    USERS_ME = f"{API_BASE}/users/me"
    USERS_ASSIGNED_TASKS = f"{API_BASE}/users/{{user_id}}/assigned_tasks"
    USERS_ASSIGNED_PROJECTS = f"{API_BASE}/users/me/assigned_projects"
    USERS_BOARDS = f"{API_BASE}/users/me/boards"
    
    # Team management routes
    TEAMS_CREATE = f"{API_BASE}/teams"
    TEAMS_LIST = f"{API_BASE}/teams"
    TEAMS_DETAIL = f"{API_BASE}/teams/{{team_id}}"
    
    # Project management routes
    PROJECTS_CREATE = f"{API_BASE}/projects"
    PROJECTS_LIST = f"{API_BASE}/projects"
    PROJECTS_DETAIL = f"{API_BASE}/projects/{{project_id}}"
    PROJECTS_ASSIGN_MANAGER = f"{API_BASE}/projects/{{project_id}}/assign_manager"
    PROJECTS_MANAGERS = f"{API_BASE}/projects/{{project_id}}/managers"
    PROJECTS_BOARDS = f"{API_BASE}/projects/{{project_id}}/boards"
    PROJECTS_SEARCH = f"{API_BASE}/projects/{{project_id}}/search"
    
    # Board management routes
    BOARDS_CREATE = f"{API_BASE}/boards"
    BOARDS_DETAIL = f"{API_BASE}/boards/{{board_id}}"
    BOARDS_ENROLL_MEMBER = f"{API_BASE}/boards/{{board_id}}/enroll_member"
    BOARDS_MEMBERS = f"{API_BASE}/boards/{{board_id}}/members"
    BOARDS_REMOVE_MEMBER = f"{API_BASE}/boards/{{board_id}}/members/{{user_id}}"
    BOARDS_SEARCH = f"{API_BASE}/boards/{{board_id}}/search"
    
    # List management routes
    LISTS_CREATE = f"{API_BASE}/lists"
    LISTS_DETAIL = f"{API_BASE}/lists/{{list_id}}"
    
    # Task management routes
    TASKS_CREATE = f"{API_BASE}/tasks"
    TASKS_DETAIL = f"{API_BASE}/tasks/{{task_id}}"
    TASKS_MOVE = f"{API_BASE}/tasks/{{task_id}}/move"
    TASKS_ARCHIVE = f"{API_BASE}/tasks/{{task_id}}/archive"
    TASKS_UNARCHIVE = f"{API_BASE}/tasks/{{task_id}}/unarchive"
    TASKS_FULL = f"{API_BASE}/tasks/{{task_id}}/full"
    TASKS_ACTIVITIES = f"{API_BASE}/tasks/{{task_id}}/activities"
    TASKS_COMMENTS = f"{API_BASE}/tasks/{{task_id}}/comments"
    
    # Comment management routes
    COMMENTS_CREATE = f"{API_BASE}/comments"
    COMMENTS_DETAIL = f"{API_BASE}/comments/{{comment_id}}"
    
    # Notification routes
    NOTIFICATIONS_LIST = f"{API_BASE}/notifications"
    NOTIFICATIONS_UNREAD_COUNT = f"{API_BASE}/notifications/unread_count"
    NOTIFICATIONS_MARK_READ = f"{API_BASE}/notifications/{{notification_id}}/mark_read"
    NOTIFICATIONS_MARK_ALL_READ = f"{API_BASE}/notifications/mark_all_read"
    
    # Synthetic API routes (for testing and environment control)
    SYNTHETIC_NEW_SESSION = f"{SYNTHETIC_BASE}/new_session"
    SYNTHETIC_STATE = f"{SYNTHETIC_BASE}/state"
    SYNTHETIC_SET_STATE = f"{SYNTHETIC_BASE}/set_state"
    SYNTHETIC_AUGMENT_STATE = f"{SYNTHETIC_BASE}/augment_state"
    SYNTHETIC_RESET = f"{SYNTHETIC_BASE}/reset"
    SYNTHETIC_LOG_EVENT = f"{SYNTHETIC_BASE}/log_event"
    SYNTHETIC_LOGS = f"{SYNTHETIC_BASE}/logs"
    SYNTHETIC_VERIFY_TASK = f"{SYNTHETIC_BASE}/verify_task"
    
    @classmethod
    def get_route(cls, route_name: str, **kwargs) -> str:
        """
        Get a route with parameters filled in
        
        Args:
            route_name: The route constant name (e.g., 'TASKS_DETAIL')
            **kwargs: Parameters to fill in the route (e.g., task_id='123')
        
        Returns:
            The route with parameters filled in
        
        Example:
            APIRoutes.get_route('TASKS_DETAIL', task_id='123')
            # Returns: '/api/tasks/123'
        """
        route = getattr(cls, route_name)
        return route.format(**kwargs)
    
    @classmethod
    def get_all_routes(cls) -> dict:
        """Get all routes as a dictionary"""
        routes = {}
        for attr_name in dir(cls):
            if not attr_name.startswith('_') and attr_name.isupper():
                routes[attr_name] = getattr(cls, attr_name)
        return routes


# Convenience functions for common route patterns
def get_user_route(user_id: str) -> str:
    """Get route for specific user assigned tasks"""
    return APIRoutes.USERS_ASSIGNED_TASKS.format(user_id=user_id)

def get_project_route(project_id: str) -> str:
    """Get route for specific project"""
    return APIRoutes.PROJECTS_DETAIL.format(project_id=project_id)

def get_board_route(board_id: str) -> str:
    """Get route for specific board"""
    return APIRoutes.BOARDS_DETAIL.format(board_id=board_id)

def get_task_route(task_id: str) -> str:
    """Get route for specific task"""
    return APIRoutes.TASKS_DETAIL.format(task_id=task_id)

def get_search_route(entity_type: str, entity_id: str) -> str:
    """Get search route for board or project"""
    if entity_type == "board":
        return APIRoutes.BOARDS_SEARCH.format(board_id=entity_id)
    elif entity_type == "project":
        return APIRoutes.PROJECTS_SEARCH.format(project_id=entity_id)
    else:
        raise ValueError(f"Unknown entity type: {entity_type}")


# Export the main class for easy importing
__all__ = ['APIRoutes', 'get_user_route', 'get_project_route', 'get_board_route', 'get_task_route', 'get_search_route'] 