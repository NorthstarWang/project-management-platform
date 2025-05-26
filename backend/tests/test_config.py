#!/usr/bin/env python3
"""
Centralized Test Configuration
Handles sys.path setup and APIRoutes import for all test files
"""

import sys
import os

# Add the parent directory to the path so we can import from app.config
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# Import APIRoutes - no exception handling needed as per requirement
from app.config import APIRoutes, get_search_route

# Export for easy importing
__all__ = ['APIRoutes', 'get_search_route'] 