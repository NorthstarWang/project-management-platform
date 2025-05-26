#!/usr/bin/env python3
"""
Configuration package for the Project Management Platform
"""

from .routes import APIRoutes, get_user_route, get_project_route, get_board_route, get_task_route, get_search_route

__all__ = ['APIRoutes', 'get_user_route', 'get_project_route', 'get_board_route', 'get_task_route', 'get_search_route'] 