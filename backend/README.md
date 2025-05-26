# Project Management Platform - Backend

A comprehensive FastAPI backend for a project management and task tracking platform, similar to Asana/Trello/Jira.

## 🚀 Features

- **Role-Based Access Control**: Admin, Manager, and Member roles with granular permissions
- **Complete Task Management**: Create, update, move, archive tasks with full lifecycle tracking
- **Team Collaboration**: Projects, boards, lists, and tasks with team-based access control
- **Activity Timeline**: Complete audit trail for all actions
- **Notification System**: Real-time notifications for task assignments, updates, and comments
- **Threaded Comments**: Support for nested comment discussions on tasks
- **Advanced Search**: Search tasks within boards and projects
- **Synthetic API**: Special endpoints for AI agent training and testing
- **Centralized Route Configuration**: Single source of truth for all API endpoints

## 📁 Project Structure

```
backend/
├── app/                    # Main application code
│   ├── config/            # Configuration and route definitions
│   │   ├── routes.py      # Centralized API route definitions
│   │   ├── __init__.py    # Configuration package exports
│   │   └── README.md      # Route configuration documentation
│   ├── models/            # Pydantic data models
│   ├── routes/            # FastAPI route handlers
│   ├── services/          # Business logic layer
│   ├── repositories/      # Data access layer
│   └── main.py           # FastAPI application entry point
├── tests/                 # Comprehensive test suite
│   ├── base_test.py       # Base test class with shared functionality
│   ├── test_*.py          # Route-specific test files
│   ├── run_all_tests.py   # Comprehensive test runner
│   └── README.md          # Testing documentation
├── requirements.txt       # Python dependencies
└── Dockerfile            # Container configuration
```

## 🛠️ Installation

### Using Docker (Recommended)

```bash
# Build and run with docker-compose from project root
docker-compose up --build
```

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 📊 API Overview

The backend provides 50+ RESTful API endpoints organized into the following categories:

- **Authentication**: User registration and login
- **User Management**: User profiles and assigned tasks
- **Team Management**: Team creation and membership
- **Project Management**: Projects and manager assignments
- **Board Management**: Boards, lists, and member enrollment
- **Task Management**: Full CRUD operations with archiving
- **Comments**: Threaded discussions on tasks
- **Notifications**: User notifications with read/unread status
- **Search**: Task search within boards and projects
- **Activity Timeline**: Complete audit trail for tasks

All endpoints are defined in the centralized route configuration system (`app/config/routes.py`) for consistency and easy maintenance.

## 🧪 Testing

The project includes a comprehensive, modular test suite organized by route categories for better maintainability and targeted testing. All test files use the centralized route configuration system for consistency.

### Test Structure

The test suite is split into focused modules:
- `test_synthetic_api.py` - Synthetic API endpoints (`/_synthetic/*`)
- `test_auth.py` - Authentication endpoints
- `test_users.py` - User management endpoints
- `test_projects.py` - Project management endpoints
- `test_boards.py` - Board management endpoints
- `test_tasks.py` - Task management endpoints
- `test_notifications.py` - Notification system endpoints
- `test_search.py` - Search functionality endpoints

### Running Tests

```bash
# Run all test suites
cd tests && python run_all_tests.py

# Run specific test categories
cd tests && python run_all_tests.py --suites auth tasks notifications

# Run individual test files
cd tests && python test_auth.py

# List available test suites
cd tests && python run_all_tests.py --list

# Legacy comprehensive test (still available)
cd tests && python comprehensive_api_test.py
```

### Test Features

- **51+ API endpoints** tested across all categories
- **Role-based testing** (admin, manager, member permissions)
- **Error handling** validation for invalid requests
- **Edge cases** and boundary condition testing
- **Detailed reporting** with pass/fail indicators and error details
- **Centralized route configuration** ensures test consistency

Current test status: **100% pass rate** ✅

## 📚 API Documentation

Once the server is running, you can access:
- Interactive API docs: http://localhost:8000/docs
- Alternative API docs: http://localhost:8000/redoc

## 🔑 Default Users

The system comes pre-configured with test users:

| Username | Password | Role |
|----------|----------|------|
| admin_alice | admin123 | Admin |
| manager_david | manager123 | Manager |
| frontend_emma | dev123 | Member |

See the full list of 17 test users in the application state.

## 🏗️ Architecture

The backend follows a clean architecture pattern:

- **Routes**: Handle HTTP requests and responses
- **Services**: Contain business logic and orchestration
- **Repositories**: Manage data persistence (currently in-memory)
- **Models**: Define data structures and validation
- **Config**: Centralized configuration including route definitions

## 🔧 Centralized Route Configuration

The backend uses a centralized route configuration system located in `app/config/routes.py`. This system provides:

- **Single source of truth** for all API endpoints
- **Consistency** between backend routes and test files
- **Easy maintenance** - change a route in one place and it updates everywhere
- **Type safety** with helper functions for common patterns
- **Extensibility** for adding new routes

See `app/config/README.md` for detailed documentation on the route configuration system.

## 🤝 Contributing

This is a synthetic training environment for AI agents. The codebase is designed to be realistic while remaining fully self-contained and deterministic.

## 📄 License

This project is part of a synthetic website template for AI agent training. 