# Synthetic Website Template

This repository provides a template for creating self-hosted, synthetic websites designed for training, evaluating, and demonstrating browser-based AI agents. It aims to accelerate development by providing a pre-configured starting point that adheres to a set of general requirements for such environments.


The template includes a React/TypeScript frontend and a Python/FastAPI backend, orchestrated via Docker Compose.

## Website type

This website is a **Project Management / Task Tracking Platform**.

For detailed project requirements and specifications (including necessary features for the website type), please refer to the [Operative Tortoise Instructions](https://docs.google.com/document/d/e/2PACX-1vSFPpbC8RZRSPzhg2Kygz9SEQqpNBMT5rYKcA-UZq0rBSGQjYWUrF1ZHBrNi_i0PmImGK70ooqtA05m/pub).

## Table of Contents

- [Synthetic Website Template](#synthetic-website-template)
  - [Website type](#website-type)
  - [Table of Contents](#table-of-contents)
  - [1. Getting Started](#1-getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation \& Launch](#installation--launch)
  - [2. How to Use: Core `/_synthetic/*` API](#2-how-to-use-core-_synthetic-api)
    - [API Interaction Prerequisites](#api-interaction-prerequisites)
    - [Key API Endpoints](#key-api-endpoints)
      - [1. Initialize a New Session](#1-initialize-a-new-session)
      - [2. Log a Custom Event](#2-log-a-custom-event)
      - [3. Get Logs for a Session](#3-get-logs-for-a-session)
      - [4. Get Full Backend State](#4-get-full-backend-state)
      - [5. Reset Environment](#5-reset-environment)
      - [6. Augment Backend State](#6-augment-backend-state)
      - [7. Set (Overwrite) Backend State](#7-set-overwrite-backend-state)
      - [8. Verify a Custom Task](#8-verify-a-custom-task)
  - [3. Design Principles for Synthetic Training Websites](#3-design-principles-for-synthetic-training-websites)
  - [4. How This Template Implements the Principles](#4-how-this-template-implements-the-principles)
    - [1. Self-Hosted Deployment](#1-self-hosted-deployment)
    - [2. Complete Application Simulation (Mocked Backend)](#2-complete-application-simulation-mocked-backend)
    - [3. Action Logging \& Telemetry](#3-action-logging--telemetry)
    - [4. State Exposure \& Control](#4-state-exposure--control)
    - [5. Task Verification \& Episode Management](#5-task-verification--episode-management)
    - [6. Accessibility \& Element Identification](#6-accessibility--element-identification)
  - [5. Building Your Own Synthetic Website from this Template](#5-building-your-own-synthetic-website-from-this-template)
    - [Overview](#overview)
    - [Step 1: Clone/Copy the Template](#step-1-clonecopy-the-template)
    - [Step 2: Define Your Application](#step-2-define-your-application)
    - [Step 3: Implement Data Seeding](#step-3-implement-data-seeding)
    - [Step 4: Define Task Verification](#step-4-define-task-verification)
    - [Step 5: Update Documentation](#step-5-update-documentation)
    - [Step 6: Add Automated Tests](#step-6-add-automated-tests)
  - [7. Task Hierarchy & Complexity Framework](#7-task-hierarchy--complexity-framework)
    - [Task Complexity Levels](#task-complexity-levels)
    - [Task Verification Framework](#task-verification-framework)
    - [Hierarchical Task Dependencies](#hierarchical-task-dependencies)
  - [8. Comprehensive Testing Infrastructure](#8-comprehensive-testing-infrastructure)
    - [Modular Test Architecture](#modular-test-architecture)
    - [Test Suite Categories](#test-suite-categories)
    - [Test Execution Options](#test-execution-options)
    - [Test Infrastructure Features](#test-infrastructure-features)
    - [Testing Best Practices](#testing-best-practices)
    - [Test Coverage Metrics](#test-coverage-metrics)
  - [9. Project Management Platform - Enhanced Features](#9-project-management-platform---enhanced-features)
    - [Core User Workflows Implemented](#core-user-workflows-implemented)
    - [Enhanced Features Beyond Core Requirements](#enhanced-features-beyond-core-requirements)
      - [🔐 **Enterprise-Grade Role-Based Access Control**](#-enterprise-grade-role-based-access-control)
      - [📊 **Complete Activity Timeline System**](#-complete-activity-timeline-system)
      - [🔔 **Real-Time Notification System**](#-real-time-notification-system)
      - [🔍 **Advanced Search Capabilities**](#-advanced-search-capabilities)
      - [📋 **Enhanced Task Management**](#-enhanced-task-management)
      - [💬 **Threaded Comment System**](#-threaded-comment-system)
      - [🏢 **Comprehensive Mock Database**](#-comprehensive-mock-database)
    - [Database Structure](#database-structure)
      - [Core Entities](#core-entities)
      - [Relationship Management](#relationship-management)
    - [API Endpoints (50+ endpoints)](#api-endpoints-50-endpoints)
      - [Authentication \& User Management](#authentication--user-management)
      - [Team Management](#team-management)
      - [Project Management](#project-management)
      - [Board Management](#board-management)
      - [List Management](#list-management)
      - [Task Management](#task-management)
      - [Comment Management](#comment-management)
      - [Activity Timeline](#activity-timeline)
      - [Notification System](#notification-system)
      - [Search Functionality](#search-functionality)
    - [Role-Based Workflow System](#role-based-workflow-system)
      - [Admin Capabilities](#admin-capabilities)
      - [Manager Capabilities](#manager-capabilities)
      - [Member Capabilities](#member-capabilities)
    - [Default Users for Testing](#default-users-for-testing)
      - [**Admin User**](#admin-user)
      - [**Managers (3 total)**](#managers-3-total)
      - [**Frontend Team Members (4 total)**](#frontend-team-members-4-total)
      - [**Backend Team Members (5 total)**](#backend-team-members-5-total)
      - [**Mobile Team Members (4 total)**](#mobile-team-members-4-total)
    - [**Team Structure**](#team-structure)
      - [**Frontend Development Team** (6 members)](#frontend-development-team-6-members)
      - [**Backend Development Team** (7 members)](#backend-development-team-7-members)
      - [**Mobile Development Team** (6 members)](#mobile-development-team-6-members)
    - [**Project Structure**](#project-structure)
      - [**1. E-Commerce Platform Redesign** (Frontend Team)](#1-e-commerce-platform-redesign-frontend-team)
      - [**2. API Modernization Initiative** (Backend Team)](#2-api-modernization-initiative-backend-team)
      - [**3. Mobile App Development** (Mobile Team)](#3-mobile-app-development-mobile-team)
    - [Automatic Activity \& Notification Generation](#automatic-activity--notification-generation)
      - [Task Creation](#task-creation)
      - [Task Updates](#task-updates)
      - [Task Comments](#task-comments)
      - [Task Movement](#task-movement)
      - [Task Archive/Unarchive](#task-archiveunarchive)
    - [API Testing Examples](#api-testing-examples)
      - [Initialize Session and Login](#initialize-session-and-login)
      - [Complete Workflow Example](#complete-workflow-example)
    - [Task Complexity Examples - All Fully Supported](#task-complexity-examples---all-fully-supported)
      - [Simple Task](#simple-task)
      - [Medium Task](#medium-task)
      - [Complex Task](#complex-task)
    - [Comprehensive Logging for AI Agent Training](#comprehensive-logging-for-ai-agent-training)
    - [Summary](#summary)

---

## 1. Getting Started

### Prerequisites
*   Docker and Docker Compose installed.
*   (Optional but Recommended for API interaction examples) `jq` for pretty-printing JSON.

### Installation & Launch
1.  Clone this repository:
    ```bash
    git clone <repository-url> # Replace <repository-url> with the actual URL
    cd synthetic-website-template
    ```
2.  Build and start the services:
    ```bash
    docker-compose up --build
    ```
    *   Frontend will be available at `http://localhost:3000` (configurable in `docker-compose.yaml`).
    *   Backend API will be available at `http://localhost:8000` (configurable in `docker-compose.yaml`).

### Data Persistence & Initialization

The backend automatically manages mock data initialization with smart persistence:

#### **Default Behavior (Recommended)**
- **First startup**: Generates comprehensive mock data (17 users, 3 projects, 14 boards, 56+ tasks)
- **Subsequent startups**: **Preserves all your changes** - tasks, comments, modifications persist
- **Manual reset**: Use `POST /_synthetic/reset` API endpoint to regenerate mock data when needed

#### **Environment Variable Control**
```bash
# Preserve data on restart (default)
docker-compose up

# Always regenerate mock data on startup
ALWAYS_RESET_DATA=true docker-compose up

# Or set in docker-compose.yaml:
environment:
  - ALWAYS_RESET_DATA=true
  - API_BASE_URL=http://backend:8000      # Backend API URL for tests
  - FRONTEND_BASE_URL=http://frontend:3000 # Frontend URL for test logs
```

#### **Data Management Commands**
```bash
# Reset to fresh mock data via API
curl -X POST "http://localhost:8000/_synthetic/reset"

# Check current data state
curl "http://localhost:8000/_synthetic/state" | jq '.users | length'

# View startup logs to see data initialization
docker-compose logs backend
```

#### **Use Cases**
- **Development**: Default behavior preserves your work between container restarts
- **Testing**: Set `ALWAYS_RESET_DATA=true` for consistent test environments  
- **Demos**: Use `/_synthetic/reset` to return to clean demo state
- **CI/CD**: Environment variable ensures predictable data state

---

## 2. How to Use: Core `/_synthetic/*` API

This section details how to interact with the core `/_synthetic/*` API endpoints provided by the backend for controlling and observing the synthetic environment.

### API Interaction Prerequisites
*   The synthetic website must be running (see [Getting Started](#getting-started)).
*   `curl` is used for examples. `jq` is recommended for readable JSON output.

### Key API Endpoints

#### 1. Initialize a New Session

This endpoint starts a new session, resets state and logs, and provides a `session_id`.

```bash
# Request a new session (optionally with a seed)
curl -s -X POST \\
  "http://localhost:8000/_synthetic/new_session?seed=123" \\
| jq
```

**Example Output**:
```json
{
  "session_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```
*(A `Set-Cookie: session_id=...` header will also be returned)*

#### 2. Log a Custom Event

This endpoint allows the client-side application to send structured log data to the backend. The `session_id` must be passed as a query parameter.

```bash
# Set your session ID (replace with the actual ID from new_session)
export SESSION_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Example: Log a custom click event
curl -s -X POST \
  "http://localhost:8000/_synthetic/log_event?session_id=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "actionType": "user_click",
    "payload": {
      "page_url": "http://localhost:3000/projects",
      "target_element_identifier": "[data-testid=\\'create-project-btn\\']",
      "custom_property": "custom_value"
    }
  }' \
| jq
```
**Example Output**:
```json
{
  "status": "logged"
}
```
Refer to the [Action Logging & Telemetry](#3-action-logging--telemetry) section for details on the log structure stored by the backend.

#### 3. Get Logs for a Session

Retrieve logs for a given `session_id`.

```bash
# Set your session ID (replace with the actual ID from new_session)
export SESSION_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Read logs for that session
curl -s \\
  "http://localhost:8000/_synthetic/logs?session_id=$SESSION_ID" \\
| jq
```

**Example Output (after some interactions)**:
```json
[
  {
    "session_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "timestamp": 1678886401.123, // Unix timestamp
    "action_type": "user_click",
    "payload": {
      "page_url": "http://localhost:3000/projects",
      "target_element_identifier": "[data-testid=\\'create-project-btn\\']",
      "custom_property": "custom_value"
    }
  },
  {
    "session_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "timestamp": 1678886405.456, // Unix timestamp
    "action_type": "TASK_DONE",
    "payload": {
      "taskName": "login_success"
    }
  }
]
```

#### 4. Get Full Backend State

Retrieve the current state of the mock backend.

```bash
# Ensure SESSION_ID is set from new_session or a previous interaction
# (The session_id cookie is typically used by the browser,
# for curl, ensure it's sent if your state logic depends on it,
# though GET /_synthetic/state itself doesn't strictly require it)
curl -s \\
  "http://localhost:8000/_synthetic/state" \\
  -H "Cookie: session_id=$SESSION_ID" \\
| jq
```

**Example Output (for the Project Management Platform)**:
```json
{
  "users": [
    {
      "id": "u1",
      "username": "admin_alice",
      "role": "admin",
      "full_name": "Alice Chen"
    }
  ],
  "projects": [
    {
      "id": "p1",
      "name": "E-Commerce Platform Redesign",
      "description": "Complete overhaul of the company's e-commerce platform",
      "team_id": "t1",
      "created_at": 1678886400
    }
  ],
  "logged_in_user_id": "u1"
}
```

#### 5. Reset Environment

Resets the backend state and clears logs. Optionally accepts a seed.

```bash
# The session_id cookie might be relevant if parts of your reset logic
# are session-dependent, but typically not for a full environment reset.
curl -s -X POST \\
  "http://localhost:8000/_synthetic/reset?seed=42" \\
  -H "Cookie: session_id=$SESSION_ID" \\
| jq
```

**Example Output**:
```json
{
  "status": "ok",
  "seed": "42"
}
```

#### 6. Augment Backend State

Add to or modify parts of the backend state.

```bash
# Ensure SESSION_ID is set if mutations should be session-aware
curl -s -X POST \
  "http://localhost:8000/_synthetic/augment_state" \
  -H "Cookie: session_id=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {
        "id": "t_cli_augmented",
        "title": "CLI Augmented Task",
        "description": "This task was added via augment_state.",
        "list_id": "l1",
        "created_at": 1678886500
      }
    ],
    "new_custom_property": "augmented_value"
  }' \
| jq
```

**Example Output**:
```json
{
  "status": "ok",
  "message": "State augmented with provided data."
}
```
*(After this, `GET /_synthetic/state` would show the new task and property merged into the existing state.)*

#### 7. Set (Overwrite) Backend State

Replace the entire backend state with the provided payload.

```bash
# Ensure SESSION_ID is set if mutations should be session-aware
curl -s -X POST \
  "http://localhost:8000/_synthetic/set_state" \
  -H "Cookie: session_id=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "users": [{"id": "new_user", "username": "overwritten_user"}],
    "projects": [],
    "logged_in_user_id": null,
    "custom_message": "State completely overwritten"
  }' \
| jq
```

**Example Output**:
```json
{
  "status": "ok",
  "message": "State has been overwritten."
}
```
*(After this, `GET /_synthetic/state` would show only the state provided in the `set_state` call.)*

#### 8. Verify a Custom Task

Checks if a specific task has been completed (by looking for a "TASK_DONE" log).

```bash
# Ensure SESSION_ID is set and a task "example_task" has been logged as done
# To log such an event from client-side JS (example):
# fetch(\`http://localhost:8000/_synthetic/log_event?session_id=\${SESSION_ID}\`, {
#   method: 'POST',
#   headers: {'Content-Type': 'application/json'},
#   body: JSON.stringify({ actionType: "TASK_DONE", payload: { taskName: "example_task" } })
# });

curl -s \\
  "http://localhost:8000/_synthetic/verify_task?task_name=example_task&session_id=$SESSION_ID" \\
| jq
```

**Example Output (if task was logged as done)**:
```json
{
  "success": true
}
```

**Example Output (if task was NOT logged as done)**:
```json
{
  "success": false
}
```

---

## 3. Design Principles for Synthetic Training Websites

Synthetic websites built for agent training should meet the following core principles:

1.  **Functional Realism**: Mimic real-world web application UI, UX, and core functionalities.
2.  **Controlled Sandboxing & Determinism**: Operate locally within a containerized environment, be fully resettable to a known initial state (optionally with a seed for deterministic behavior).
3.  **Comprehensive Observability**: Meticulously log agent interactions, system events, and state changes.
4.  **Agent Agnostic Design**: Websites should not assume specific agent architectures (e.g., vision vs. DOM-based).
5.  **Modular Mocked Services**: Implement backend functionalities as configurable local services.
6.  **Performance for Training**: Optimize for rapid loading and interaction.

---

## 4. How This Template Implements the Principles

This template provides a foundational implementation for many of the design principles:

### 1. Self-Hosted Deployment
*   **Dockerized Environment**: The `docker-compose.yaml` file orchestrates the frontend and backend services.
    *   Frontend: Built from `./frontend/Dockerfile`, served on port 3000 (configurable).
    *   Backend: Built from `./backend/Dockerfile` (FastAPI), served on port 8000 (configurable).
*   **Single Command Launch**: `docker-compose up --build` builds and starts the environment.

### 2. Complete Application Simulation (Mocked Backend)
*   **Simulated User Authentication & Session Management**:
    *   The backend's `POST /_synthetic/new_session` endpoint initializes a session, returning a `session_id` (also set as a cookie). This `session_id` is crucial for linking logs and state to a specific interaction episode.
    *   The project management platform includes a comprehensive authentication system with role-based access control. You can extend this for more complex user account simulation.
*   **Simulated Transactional Flows**:
    *   The project management platform (`backend/app/routes/projects.py`) demonstrates complex CRUD operations for projects, boards, tasks, and comments. This can be adapted for any transactional flow (e.g., purchases, bookings).
*   **Content & Data Management**:
    *   The `backend/app/state_manager.py` handles in-memory state. It's initialized with comprehensive mock data including users, teams, projects, boards, tasks, and comments.
    *   This can be extended to load data from files or use a simple database like SQLite within the container.
*   **Simulated User-Generated Content**:
    *   The project management platform allows creating, editing, and deleting projects, boards, tasks, and comments. These changes persist in the backend's in-memory state for the current session.
*   **Mocked Third-Party Services**:
    *   The template provides the structure. You can add new FastAPI routers or modules in the backend to mock any required external service.

### 3. Action Logging & Telemetry
*   **Comprehensive Interaction Logging**:
    *   **Backend Endpoint**: `POST /_synthetic/log_event` receives log data from the client. Developers will need to implement client-side mechanisms to gather and send interaction data to this endpoint. The `session_id` for the event should be passed as a query parameter (e.g., `POST /_synthetic/log_event?session_id=your_session_id`).
    *   Client-side implementation is required for gathering specific interaction details (e.g., clicks, form submissions, page views) and sending them to the `/log_event` endpoint.
*   **Structured Log Format (as stored by backend)**:
    *   `timestamp`: Unix timestamp (generated by the backend when the log is received).
    *   `session_id`: The session ID (taken from the `/log_event` request's query parameter).
    *   `action_type`: Descriptor of the action (e.g., "click", "TASK_DONE"). This is taken from the `actionType` field in the JSON payload sent to `/log_event`. Defaults to `\"CUSTOM_EVENT\"` if not provided.
    *   `payload`: Action-specific data. This is taken from the `payload` field in the JSON payload sent to `/log_event`.
        *   If details like `page_url` or `target_element_identifier` are needed, they must be included by the client within this `payload` object. For example: `{\"page_url\": \"http://...\", \"target_element_identifier\": \"#myButton\"}`.
*   **Log Accessibility**:
    *   `GET /_synthetic/logs`: Retrieves all logs or logs filtered by `session_id`.
    *   The `backend/app/logger.py` currently stores logs in memory. This could be modified to write to a mounted volume for persistence.

### 4. State Exposure & Control
*   **Client-Side Storage Accessibility**:
    *   If access to client-side storage (e.g., `localStorage`, `sessionStorage`, `cookies`) is required for observation or debugging, mechanisms for this would need to be implemented within the frontend application by the user.
*   **Backend State Management**:
    *   `GET /_synthetic/state`: Retrieves the entire state from `state_manager.py`.
    *   `POST /_synthetic/set_state`: Overwrites the backend state with the provided JSON payload.
    *   `POST /_synthetic/augment_state`: Merges the provided JSON payload with the existing backend state (can add or update specific parts).

### 5. Task Verification & Episode Management
*   **Session Initialization**:
    *   `POST /_synthetic/new_session?seed=<optional_seed>`: Starts a new session, clears logs, resets state (potentially using the seed), and returns a `session_id`.
*   **Reset & Seeding Mechanism**:
    *   `POST /_synthetic/reset?seed=<optional_seed>`: Resets the environment (logs, state) to a clean initial state. If a `seed` is provided, `state_manager.py` uses it to initialize deterministically.
*   **Verification Hooks/Endpoints**:
    *   `GET /_synthetic/verify_task?task_name=<task_name>&session_id=<session_id>`: A basic implementation that checks if a log entry exists with `action_type: \"TASK_DONE\"` and `payload.taskName` matching the `task_name`. This is a pattern that developers should customize for their specific application's success criteria by modifying `backend/app/routes/synthetic.py`.

### 6. Accessibility & Element Identification
*   **Stable Identifiers**:
    *   The template encourages using `data-testid` attributes on interactive elements in the frontend.
    *   When implementing client-side logging, for the `target_element_identifier` (to be included in the `payload` sent to `/log_event`), it is recommended to prioritize `data-testid` attributes, then `id`, and fall back to other stable selectors like XPath if necessary. This makes agent interaction and log analysis more reliable.

---

## 5. Building Your Own Synthetic Website from this Template

### Overview
This template provides a starting point. You will need to modify and extend it to create a synthetic environment tailored to your specific application and tasks. The general workflow involves customizing the frontend UI, defining backend logic and state, and implementing task-specific verification.

### Step 1: Clone/Copy the Template
Start with the files in this repository.

### Step 2: Define Your Application
*   **Frontend (React/TypeScript in `frontend/src/`)**:
    *   Modify/replace components in `frontend/src/components/` and `frontend/src/pages/` to build your UI.
    *   Update `frontend/src/App.tsx` for your application's routing and overall flow.
    *   Ensure interactive elements have `data-testid` attributes or other stable selectors for reliable interaction and logging.
    *   Implement client-side logic to gather interaction data (e.g., clicks, form submissions, page views) and send it to the `POST /_synthetic/log_event` backend endpoint. Include relevant details like `page_url` and `target_element_identifier` within the `payload` of your log events.
    *   If client-side storage observation is needed, implement functions to access `localStorage`, `sessionStorage`, or `cookies` and potentially log this information or expose it through a custom mechanism.
*   **Backend (Python/FastAPI in `backend/app/`)**:
    *   Modify `backend/app/routes/projects.py` or add new routers (e.g., `your_app_routes.py`) for your application's API endpoints. Register new routers in `backend/app/main.py`.
    *   Update `backend/app/models.py` with your Pydantic data models for request/response bodies.
    *   Modify `backend/app/state_manager.py` to manage your application's specific state structure and initial data. Update the `reset()` method to handle your default state and any seeding logic.

### Step 3: Implement Data Seeding
*   In `backend/app/state_manager.py`, modify the `reset()` method to load your desired default data.
*   If using the `seed` parameter (from `/_synthetic/new_session` or `/_synthetic/reset`), ensure the seed influences data generation or selection deterministically within your `reset()` method.

### Step 4: Define Task Verification
*   Modify the logic in the `GET /_synthetic/verify_task` endpoint (in `backend/app/routes/synthetic.py`) to check for success conditions specific to your application's tasks.
*   This might involve:
    *   Checking the backend state: `state_manager.get_full_state()`.
    *   Analyzing logs more deeply: `logger.get_logs(session_id)`. For example, looking for a sequence of actions or specific log payloads.
*   Ensure your frontend application (or the interacting agent) logs a "TASK_DONE" event (or a similar custom event type) with a relevant `taskName` in its payload when a task is considered completed.

### Step 5: Update Documentation
*   Document your new website's features, common workflows, and any new API endpoints you add beyond the standard `/_synthetic/*` ones.
*   Describe any pre-provisioned user accounts or data.
*   Explain how seeding affects your application's behavior and initial state.

### Step 6: Add Automated Tests
*   Consider adding tests (e.g., using Playwright, Cypress for frontend/E2E, or PyTest for backend) to verify:
    *   Your application's core functionality.
    *   The correct behavior of the `/_synthetic/*` API integrations.
    *   Task verification logic.

---

## 7. Task Hierarchy & Complexity Framework

This template supports a comprehensive task hierarchy designed for AI agent training, from simple interactions to complex multi-step workflows. The hierarchy is structured to provide progressive complexity for agent learning and evaluation.

### Task Complexity Levels

#### 🟢 **Simple Tasks (Level 1)**
**Characteristics:**
- Single API call or basic UI interaction
- Immediate feedback and validation
- No dependencies on other tasks
- Clear success/failure criteria

**Examples:**
- Login with valid credentials
- Create a new task in an existing list
- View project details
- Mark a notification as read

**Training Value:**
- Basic API interaction patterns
- Simple state changes
- Immediate feedback loops

#### 🟡 **Medium Tasks (Level 2)**
**Characteristics:**
- 2-5 API calls or UI interactions
- Sequential dependencies between actions
- Requires navigation between different views
- May involve search or filtering

**Examples:**
- Find a specific task and add a comment
- Create a task and assign it to a mock user
- Move a task between lists and update its status
- Search for tasks and modify one of the results

**Training Value:**
- Multi-step workflows
- State management across actions
- Search and filtering capabilities
- Basic workflow completion

#### 🔴 **Complex Tasks (Level 3)**
**Characteristics:**
- 5+ API calls or extensive UI interactions
- Multiple dependencies and state changes
- Requires understanding of role-based permissions
- Involves multiple entities (projects, boards, tasks, users)

**Examples:**
- Create a complete project workflow (project → board → lists → tasks)
- Manage a full task lifecycle (create → assign → comment → move → complete)
- Set up team collaboration (enroll members → assign tasks → track progress)
- Handle complex permission scenarios across different user roles

**Training Value:**
- End-to-end workflow management
- Complex state coordination
- Role-based access control understanding
- Real-world project management scenarios

### Task Verification Framework

#### Automatic Verification
The system provides built-in verification for common task patterns:

```bash
# Verify task completion by checking logs
GET /_synthetic/verify_task?task_name=login_success&session_id=SESSION_ID

# Verify state changes
GET /_synthetic/state  # Check if expected entities exist

# Verify activity trail
GET /api/tasks/{task_id}/activities  # Check if expected activities were logged
```

#### Custom Verification Patterns
Developers can implement custom verification logic by:

1. **State-based verification**: Check if specific entities exist in the backend state
2. **Log-based verification**: Analyze action logs for expected interaction patterns
3. **Activity-based verification**: Verify that proper activities and notifications were generated
4. **Multi-step verification**: Combine multiple verification methods for complex workflows

### Hierarchical Task Dependencies

#### Foundation Tasks (Prerequisites)
- User authentication and session management
- Basic navigation and UI interaction
- Simple CRUD operations

#### Intermediate Tasks (Building Blocks)
- Multi-entity operations (projects + boards + tasks)
- Role-based permission handling
- Search and filtering workflows

#### Advanced Tasks (Complete Workflows)
- End-to-end project management scenarios
- Complex collaboration workflows
- Multi-user interaction patterns

---

## 8. Comprehensive Testing Infrastructure

The backend includes a robust testing infrastructure designed for both development validation and AI agent training scenarios.

### Modular Test Architecture

The testing system is organized into focused, modular test suites:

```
backend/tests/
├── base_test.py              # Shared testing infrastructure
├── test_synthetic_api.py     # Core synthetic API endpoints
├── test_auth.py             # Authentication and session management
├── test_users.py            # User management and permissions
├── test_projects.py         # Project lifecycle and management
├── test_boards.py           # Board operations and access control
├── test_tasks.py            # Task CRUD and workflow operations
├── test_notifications.py    # Notification system validation
├── test_search.py           # Search functionality across entities
├── run_all_tests.py         # Comprehensive test runner
└── run_smoke_tests.py       # Quick validation suite
```

### Test Suite Categories

#### 🔧 **Synthetic API Tests** (`test_synthetic_api.py`)
- Session initialization and management
- State exposure and manipulation
- Event logging and retrieval
- Environment reset and seeding
- Task verification endpoints

#### 🔐 **Authentication Tests** (`test_auth.py`)
- User login/logout workflows
- Session persistence and validation
- Role-based access control
- Invalid credential handling

#### 👥 **User Management Tests** (`test_users.py`)
- User registration and profile management
- Team membership operations
- Permission validation across roles
- User task assignment and retrieval

#### 📋 **Project Management Tests** (`test_projects.py`)
- Project creation and lifecycle
- Manager assignment and permissions
- Team-based project access
- Project-level search and filtering

#### 📊 **Board Management Tests** (`test_boards.py`)
- Board creation within projects
- Member enrollment and access control
- Board-level permissions and operations
- List management within boards

#### ✅ **Task Management Tests** (`test_tasks.py`)
- Task CRUD operations
- Task movement between lists
- Assignment and status management
- Archive/unarchive functionality
- Activity and notification generation

#### 🔔 **Notification Tests** (`test_notifications.py`)
- Notification creation and delivery
- Read/unread state management
- Notification filtering and counting
- Cross-entity notification triggers

#### 🔍 **Search Tests** (`test_search.py`)
- Board-level task search
- Project-level task search
- Full-text search capabilities
- Search result accuracy and permissions

### Test Execution Options

#### Environment Configuration

The test suite supports flexible deployment environments through environment variables:

```bash
# Local development (default)
cd backend/tests
python run_all_tests.py

# Custom server environment
export API_BASE_URL="http://api.staging.com:8000"
export FRONTEND_BASE_URL="http://frontend.staging.com:3000"
python run_all_tests.py

# Docker environment (automatic configuration)
# API_BASE_URL=http://backend:8000
# FRONTEND_BASE_URL=http://frontend:3000
docker-compose exec backend python tests/run_all_tests.py

# Production testing
export API_BASE_URL="https://api.production.com"
export FRONTEND_BASE_URL="https://app.production.com"
python run_all_tests.py

# Command line override
python run_all_tests.py --url http://custom.server.com:8000
```

#### Comprehensive Testing
```bash
# Run all tests with detailed reporting
cd backend/tests
python run_all_tests.py

# Run specific test suite
python run_all_tests.py --suite auth

# Run with verbose output
python run_all_tests.py --verbose

# Run tests for specific endpoints
python run_all_tests.py --suite tasks --verbose
```

#### Smoke Testing (Quick Validation)
```bash
# Run critical tests only (~15 seconds)
cd backend/tests
python run_smoke_tests.py

# Quick validation of core functionality
# - Session management
# - Authentication
# - Basic CRUD operations
# - Core API endpoints
```

### Test Infrastructure Features

#### 🏗️ **Shared Test Foundation** (`base_test.py`)
- Automatic session setup and teardown
- Pre-configured test users across all roles
- Consistent test data initialization
- Standardized assertion helpers
- Error tracking and reporting

#### 📊 **Comprehensive Reporting**
- Pass/fail statistics with success rates
- Detailed error reporting and categorization
- Performance metrics (execution time)
- Test coverage across all API endpoints
- Color-coded output for quick assessment

#### 🚀 **CI/CD Integration Ready**
- Exit codes for automated pipeline integration
- JSON output format option for parsing
- Configurable test timeouts
- Parallel execution support
- Environment-specific configuration

#### 🎯 **AI Agent Training Support**
- Realistic test scenarios matching training tasks
- Comprehensive state validation
- Activity and notification verification
- Multi-user interaction patterns
- Role-based permission testing

### Testing Best Practices

#### Test Data Management
- Isolated test sessions prevent data contamination
- Deterministic test data for reproducible results
- Realistic mock data reflecting production scenarios
- Comprehensive user roles and permissions

#### Validation Patterns
- State-based assertions for entity verification
- Activity-based validation for audit trails
- Notification verification for user experience
- Permission-based testing for security validation

#### Performance Considerations
- Optimized test execution order
- Efficient session management
- Minimal test data setup/teardown
- Parallel test execution where possible

### Test Coverage Metrics

The test suite provides comprehensive coverage across:

- **51+ API endpoints** - All major functionality tested
- **8 core entity types** - Users, teams, projects, boards, lists, tasks, comments, notifications
- **3 user roles** - Admin, manager, member permission scenarios
- **15+ workflow patterns** - From simple CRUD to complex multi-step operations
- **100+ test scenarios** - Covering success paths, error conditions, and edge cases

This testing infrastructure ensures the platform is robust, reliable, and ready for both development validation and AI agent training scenarios.

---

## 9. Project Management Platform - Enhanced Features

This implementation extends the basic template to create a comprehensive **Project Management / Task Tracking Platform** (similar to Asana, Trello, Jira) with advanced features beyond the core requirements.

### Core User Workflows Implemented

All specified core workflows are fully supported:

1. **✅ User registration, login/logout** - Complete authentication system
2. **✅ Creating new projects or boards** - Role-based project/board creation
3. **✅ Viewing existing projects/boards** - Comprehensive listing and detail views
4. **✅ Creating lists/columns within a board** - Full list management with positioning
5. **✅ Creating tasks/cards within lists** - Rich task creation with automatic activity tracking
6. **✅ Editing task/card details** - Complete task editing with smart notifications
7. **✅ Moving tasks/cards between lists** - Explicit move operations with audit trail
8. **✅ Adding comments to tasks/cards** - Comment system with notifications
9. **✅ Archiving or deleting tasks/cards/lists** - Full lifecycle management
10. **✅ Searching for tasks/cards within a board** - Powerful search capabilities

### Enhanced Features Beyond Core Requirements

#### 🔐 **Enterprise-Grade Role-Based Access Control**
- **3-tier hierarchy**: Admin → Manager → Member
- **Board enrollment system**: Granular access control per board
- **Project assignment system**: Admin assigns projects to managers
- **Resource isolation**: Users only see resources they have access to

#### 📊 **Complete Activity Timeline System**
- **Comprehensive audit trail**: Every action automatically tracked
- **Rich activity types**: Created, updated, moved, assigned, commented, status_changed, priority_changed, archived
- **User attribution**: Who did what when with full context
- **Change tracking**: Old vs new values for all modifications

#### 🔔 **Real-Time Notification System**
- **6 notification types**: Task assigned, updated, commented, moved, board enrolled, project assigned
- **Smart targeting**: Context-aware recipient selection
- **Read/unread management**: Mark individual or all notifications as read
- **Notification count API**: Real-time unread count

#### 🔍 **Advanced Search Capabilities**
- **Multi-scope search**: Board-level and project-level search
- **Full-text search**: Search task titles and descriptions
- **Extensible filters**: Ready for advanced filtering implementation

#### 📋 **Enhanced Task Management**
- **Explicit positioning**: Control exact task positions within lists
- **Archive/unarchive**: Soft delete functionality with restore capability
- **User task views**: Get all tasks assigned to a specific user
- **Full task details**: Single endpoint for task + comments + activities

#### 💬 **Threaded Comment System**
- **Nested replies**: Comments can have threaded replies for better discussion organization
- **Author attribution**: Full user information with each comment and reply
- **Chronological ordering**: Comments and replies sorted by creation time
- **Rich discussion threads**: Support for multi-level conversations on tasks

#### 🏢 **Comprehensive Mock Database**
- **17 realistic users** across 3 specialized teams (Frontend, Backend, Mobile)
- **3 major projects** with different themes and complexity levels
- **14 boards** with varying task loads (including empty boards for testing)
- **56 realistic tasks** distributed across different statuses and priorities
- **39 comments with threaded replies** showing active collaboration
- **60 task activities** demonstrating complete audit trails
- **75 board memberships** showing proper access control
- **Realistic timestamps** spanning weeks/months for authentic feel

### Database Structure

#### Core Entities

**Users**
- `id`, `username`, `password`, `email`, `full_name`, `role`, `created_at`
- Roles: `admin`, `manager`, `member`

**Teams**
- `id`, `name`, `description`, `created_at`
- Users belong to teams via `team_memberships`

**Projects**
- `id`, `name`, `description`, `team_id`, `created_by`, `created_at`
- Belong to teams, created by admin/manager

**Boards**
- `id`, `name`, `description`, `project_id`, `created_by`, `created_at`
- Belong to projects, contain lists

**Lists**
- `id`, `name`, `board_id`, `position`, `created_at`
- Ordered columns within boards

**Tasks**
- `id`, `title`, `description`, `list_id`, `assignee_id`, `priority`, `status`, `due_date`, `position`, `created_by`, `created_at`
- Core work items with rich metadata

**Comments**
- `id`, `content`, `task_id`, `author_id`, `created_at`
- Discussion threads on tasks

**Notifications**
- `id`, `recipient_id`, `type`, `title`, `message`, `related_task_id`, `related_board_id`, `related_project_id`, `read`, `created_at`
- Real-time user notifications

**Task Activities**
- `id`, `task_id`, `user_id`, `activity_type`, `description`, `old_value`, `new_value`, `created_at`
- Complete audit trail for tasks

#### Relationship Management

**Team Memberships**
- `id`, `user_id`, `team_id`, `role`, `joined_at`
- Users belong to teams with roles

**Board Memberships**
- `id`, `user_id`, `board_id`, `enrolled_by`, `enrolled_at`
- Fine-grained board access control

**Project Assignments**
- `id`, `project_id`, `manager_id`, `assigned_by`, `assigned_at`
- Admin assigns projects to managers

### API Endpoints (50+ endpoints)

#### Authentication & User Management
```bash
POST   /api/register                     # Register new user
POST   /api/login                        # User login
GET    /api/users                        # List users (admin/manager)
GET    /api/users/me                     # Get current user info
GET    /api/users/{id}/assigned_tasks    # Get user's assigned tasks
```

#### Team Management
```bash
POST   /api/teams                        # Create team (admin/manager)
GET    /api/teams                        # List user's teams
GET    /api/teams/{id}                   # Get team details with members
```

#### Project Management
```bash
POST   /api/projects                     # Create project (admin/manager)
GET    /api/projects                     # List user's projects
GET    /api/projects/{id}                # Get project details
POST   /api/projects/{id}/assign_manager # Assign manager to project (admin)
GET    /api/projects/{id}/managers       # List project managers
GET    /api/users/me/assigned_projects   # Get manager's assigned projects
```

#### Board Management
```bash
POST   /api/boards                       # Create board (admin/manager)
GET    /api/projects/{id}/boards         # List project boards
GET    /api/boards/{id}                  # Get board with lists and tasks
POST   /api/boards/{id}/enroll_member    # Enroll member in board (manager)
DELETE /api/boards/{id}/members/{user_id} # Remove member from board (manager)
GET    /api/boards/{id}/members          # List board members
GET    /api/users/me/boards              # Get user's enrolled boards
```

#### List Management
```bash
POST   /api/lists                        # Create list within board
```

#### Task Management
```bash
POST   /api/tasks                        # Create task
PUT    /api/tasks/{id}                   # Update task
DELETE /api/tasks/{id}                   # Delete task
PUT    /api/tasks/{id}/move              # Move task to different list
PUT    /api/tasks/{id}/archive           # Archive task
PUT    /api/tasks/{id}/unarchive         # Unarchive task
GET    /api/tasks/{id}/full              # Get task with comments + activities
```

#### Comment Management
```bash
POST   /api/comments                     # Create comment on task
GET    /api/tasks/{id}/comments          # List task comments
```

#### Activity Timeline
```bash
GET    /api/tasks/{id}/activities        # Get task activity timeline
```

#### Notification System
```bash
GET    /api/notifications                # List user notifications
GET    /api/notifications?unread_only=true # Filter unread notifications
PUT    /api/notifications/{id}/mark_read # Mark notification as read
PUT    /api/notifications/mark_all_read  # Mark all notifications as read
GET    /api/notifications/unread_count   # Get unread notification count
```

#### Search Functionality
```bash
GET    /api/boards/{id}/search?q=query   # Search tasks within board
GET    /api/projects/{id}/search?q=query # Search tasks within project
```

### Role-Based Workflow System

#### Admin Capabilities
- Create projects and assign them to managers
- Access all resources across the platform
- Perform all manager and member actions
- User and team management

#### Manager Capabilities
- Create boards under assigned projects only
- Enroll team members into boards they manage
- Remove members from boards
- Perform all member actions within their assigned projects

#### Member Capabilities
- Create tasks in boards they're enrolled in
- Modify ANY task in boards they participate in (not just own tasks)
- Move tasks across lists within enrolled boards
- Add comments and participate in discussions

### Default Users for Testing

The system comes with 17 pre-configured users across 3 teams for comprehensive testing:

#### **Admin User**
| Username | Password | Role | Full Name | Email |
|----------|----------|------|-----------|-------|
| admin_alice | admin123 | admin | Alice Chen | alice@techcorp.com |

#### **Managers (3 total)**
| Username | Password | Role | Full Name | Email |
|----------|----------|------|-----------|-------|
| manager_david | manager123 | manager | David Rodriguez | david@techcorp.com |
| manager_sarah | manager123 | manager | Sarah Johnson | sarah@techcorp.com |
| manager_james | manager123 | manager | James Wilson | james@techcorp.com |

#### **Frontend Team Members (4 total)**
| Username | Password | Role | Full Name | Email |
|----------|----------|------|-----------|-------|
| frontend_emma | dev123 | member | Emma Thompson | emma@techcorp.com |
| frontend_alex | dev123 | member | Alex Kim | alex@techcorp.com |
| frontend_maya | dev123 | member | Maya Patel | maya@techcorp.com |
| frontend_lucas | dev123 | member | Lucas Brown | lucas@techcorp.com |

#### **Backend Team Members (5 total)**
| Username | Password | Role | Full Name | Email |
|----------|----------|------|-----------|-------|
| backend_mike | dev123 | member | Mike Anderson | mike@techcorp.com |
| backend_lisa | dev123 | member | Lisa Garcia | lisa@techcorp.com |
| backend_tom | dev123 | member | Tom Davis | tom@techcorp.com |
| backend_nina | dev123 | member | Nina Kowalski | nina@techcorp.com |
| backend_raj | dev123 | member | Raj Sharma | raj@techcorp.com |

#### **Mobile Team Members (4 total)**
| Username | Password | Role | Full Name | Email |
|----------|----------|------|-----------|-------|
| mobile_carlos | dev123 | member | Carlos Martinez | carlos@techcorp.com |
| mobile_zoe | dev123 | member | Zoe Taylor | zoe@techcorp.com |
| mobile_kevin | dev123 | member | Kevin Lee | kevin@techcorp.com |
| mobile_sofia | dev123 | member | Sofia Rossi | sofia@techcorp.com |

### **Team Structure**

#### **Frontend Development Team** (6 members)
- **Manager**: David Rodriguez
- **Members**: Emma Thompson, Alex Kim, Maya Patel, Lucas Brown
- **Admin**: Alice Chen (cross-team admin)

#### **Backend Development Team** (7 members)  
- **Manager**: Sarah Johnson
- **Members**: Mike Anderson, Lisa Garcia, Tom Davis, Nina Kowalski, Raj Sharma
- **Admin**: Alice Chen (cross-team admin)

#### **Mobile Development Team** (6 members)
- **Manager**: James Wilson  
- **Members**: Carlos Martinez, Zoe Taylor, Kevin Lee, Sofia Rossi
- **Admin**: Alice Chen (cross-team admin)

### **Project Structure**

#### **1. E-Commerce Platform Redesign** (Frontend Team)
- **Manager**: David Rodriguez
- **Boards**: 4 boards with varying task loads
  - UI/UX Design Sprint (6 tasks)
  - Frontend Development (7 tasks) 
  - User Testing & Feedback (3 tasks)
  - Performance Optimization (1 task)

#### **2. API Modernization Initiative** (Backend Team)
- **Manager**: Sarah Johnson
- **Boards**: 5 boards with comprehensive backend tasks
  - Architecture Planning (5 tasks)
  - Core API Development (7 tasks)
  - Database Migration (3 tasks)
  - Security & Testing (4 tasks)
  - Documentation (1 task)

#### **3. Mobile App Development** (Mobile Team)
- **Manager**: James Wilson
- **Boards**: 5 boards covering mobile development
  - iOS Development (7 tasks)
  - Android Development (7 tasks)
  - Cross-Platform Features (4 tasks)
  - App Store Preparation (1 task)
  - Beta Testing (0 tasks - empty board for testing)

### Automatic Activity & Notification Generation

The system automatically creates activities and notifications for all user actions:

#### Task Creation
- ✅ Creates "created" activity
- ✅ Sends notification to assignee (if different from creator)

#### Task Updates
- ✅ Creates activity for each field change (assignee, status, priority, etc.)
- ✅ Sends notification to assignee (if different from updater)

#### Task Comments
- ✅ Creates "commented" activity
- ✅ Sends notification to assignee (if different from commenter)

#### Task Movement
- ✅ Creates "moved" activity with from/to list names
- ✅ Sends notification to assignee (if different from mover)

#### Task Archive/Unarchive
- ✅ Creates "archived"/"unarchived" activity

### API Testing Examples

#### Initialize Session and Login
```bash
# 1. Initialize session
curl -X POST "http://localhost:8000/_synthetic/new_session?seed=test123" | jq

# 2. Login as admin
curl -X POST "http://localhost:8000/api/login?session_id=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin_user",
    "password": "admin123",
    "email": "",
    "full_name": "",
    "role": "member"
  }' | jq
```

#### Complete Workflow Example
```bash
# 1. Create project (as admin)
curl -X POST "http://localhost:8000/api/projects?session_id=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ADMIN_USER_ID" \
  -d '{
    "name": "Mobile App Development",
    "description": "New mobile application project",
    "team_id": "TEAM_ID"
  }' | jq

# 2. Assign project to manager
curl -X POST "http://localhost:8000/api/projects/PROJECT_ID/assign_manager?session_id=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ADMIN_USER_ID" \
  -d '{
    "project_id": "PROJECT_ID",
    "manager_id": "MANAGER_ID"
  }' | jq

# 3. Create board (as manager)
curl -X POST "http://localhost:8000/api/boards?session_id=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -H "x-user-id: MANAGER_USER_ID" \
  -d '{
    "name": "Sprint 1 Board",
    "description": "First sprint development board",
    "project_id": "PROJECT_ID"
  }' | jq

# 4. Enroll member in board
curl -X POST "http://localhost:8000/api/boards/BOARD_ID/enroll_member?session_id=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -H "x-user-id: MANAGER_USER_ID" \
  -d '{
    "board_id": "BOARD_ID",
    "user_id": "MEMBER_ID"
  }' | jq

# 5. Create task (as member)
curl -X POST "http://localhost:8000/api/tasks?session_id=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -H "x-user-id: MEMBER_USER_ID" \
  -d '{
    "title": "Implement user authentication",
    "description": "Add login and registration functionality",
    "list_id": "LIST_ID",
    "assignee_id": "MEMBER_USER_ID",
    "priority": "high",
    "due_date": "2024-02-15T10:00:00Z"
  }' | jq

# 6. Move task between lists
curl -X PUT "http://localhost:8000/api/tasks/TASK_ID/move?session_id=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -H "x-user-id: MEMBER_USER_ID" \
  -d '{
    "list_id": "IN_PROGRESS_LIST_ID",
    "position": 0
  }' | jq

# 7. Add comment to task
curl -X POST "http://localhost:8000/api/comments?session_id=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -H "x-user-id: MEMBER_USER_ID" \
  -d '{
    "content": "Started working on this task",
    "task_id": "TASK_ID"
  }' | jq

# 8. Search for tasks
curl -X GET "http://localhost:8000/api/boards/BOARD_ID/search?q=authentication" \
  -H "x-user-id: MEMBER_USER_ID" | jq

# 9. Get task with full details (comments + activities)
curl -X GET "http://localhost:8000/api/tasks/TASK_ID/full" \
  -H "x-user-id: MEMBER_USER_ID" | jq

# 10. Check notifications
curl -X GET "http://localhost:8000/api/notifications?unread_only=true" \
  -H "x-user-id: MEMBER_USER_ID" | jq

# 11. Test threaded comments - Add a comment
curl -X POST "http://localhost:8000/api/comments?session_id=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -H "x-user-id: MEMBER_USER_ID" \
  -d '{
    "content": "This looks great! Ready for testing.",
    "task_id": "TASK_ID"
  }' | jq

# 12. Reply to the comment (threaded)
curl -X POST "http://localhost:8000/api/comments?session_id=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ANOTHER_USER_ID" \
  -d '{
    "content": "Thanks! I'll start testing now.",
    "task_id": "TASK_ID",
    "parent_comment_id": "COMMENT_ID_FROM_STEP_11"
  }' | jq

# 13. Get threaded comments for task
curl -X GET "http://localhost:8000/api/tasks/TASK_ID/comments" \
  -H "x-user-id: MEMBER_USER_ID" | jq
```

### Task Complexity Examples - All Fully Supported

#### Simple Task
> "In a given project board, create a new task with a specific title in the 'To Do' list."

**API Flow:**
1. `GET /api/boards/{board_id}` - Get board and find "To Do" list
2. `POST /api/tasks` - Create task in "To Do" list

**Automatic Results:** ✅ Activity created, ✅ Assignee notified (if assigned)

#### Medium Task
> "Find a specific task on a board, add a comment to it, assign it to a mock user, and move it from the 'To Do' list to the 'In Progress' list."

**API Flow:**
1. `GET /api/boards/{board_id}/search?q=task_name` - Search for the task
2. `POST /api/comments` - Add comment
3. `PUT /api/tasks/{task_id}` - Assign to user and move to In Progress

**Automatic Results:** ✅ 3 activities created, ✅ Multiple notifications sent

#### Complex Task
> "Create a new project board. Populate it with three lists: 'Backlog,' 'Sprint,' and 'Completed.' Create five tasks in the 'Backlog' list. Move two of those tasks to the 'Sprint' list. Assign one of the tasks in 'Sprint' to yourself and set a mock due date for tomorrow. Add a detailed description to this assigned task."

**API Flow:**
1. `POST /api/projects` - Create project
2. `POST /api/boards` - Create board
3. `POST /api/lists` (3 times) - Create Backlog, Sprint, Completed lists
4. `POST /api/tasks` (5 times) - Create five tasks in Backlog
5. `PUT /api/tasks/{task_id}/move` (2 times) - Move two tasks to Sprint
6. `PUT /api/tasks/{task_id}` - Assign task to self with due date
7. `PUT /api/tasks/{task_id}` - Add detailed description

**Automatic Results:** ✅ 15+ activities created, ✅ Multiple notifications sent, ✅ Complete audit trail

### Comprehensive Logging for AI Agent Training

All actions are logged with detailed payloads including:
- `USER_LOGIN`, `USER_REGISTER`
- `TASK_CREATE`, `TASK_UPDATE`, `TASK_MOVE`, `TASK_ARCHIVE`, `TASK_UNARCHIVE`
- `COMMENT_CREATE`
- `BOARD_CREATE`, `BOARD_ENROLL_MEMBER`, `BOARD_REMOVE_MEMBER`
- `PROJECT_CREATE`, `PROJECT_ASSIGN_MANAGER`
- `NOTIFICATION_READ`, `NOTIFICATIONS_MARK_ALL_READ`
- And more...

Each log entry includes:
- `timestamp` - Unix timestamp
- `session_id` - Session identifier
- `action_type` - Type of action performed
- `payload` - Detailed action data with context

### Summary

This implementation provides a **complete, production-ready project management platform** that:

- ✅ **Fully supports all core user workflows** specified in the requirements
- 🚀 **Adds enterprise-grade features** like role-based access control, notifications, activity tracking
- 📊 **Provides comprehensive API surface** with 50+ endpoints
- 🔍 **Includes advanced capabilities** like search, archive/restore, explicit positioning
- 📝 **Offers complete audit trail** with automatic activity and notification generation
- 🧪 **Ready for AI agent training** with comprehensive logging and state exposure
- 🎯 **Supports complex workflows** from simple task creation to multi-step project management
- 💬 **Features threaded comments** for rich collaboration and discussion
- 🏢 **Includes comprehensive mock data** with 17 users, 3 teams, 14 boards, and 56 tasks

The system is now ready for frontend development and provides all the necessary backend infrastructure for a sophisticated project management application that feels like a real, active workplace.

### Step 6: Add Automated Tests
*   Consider adding tests (e.g., using Playwright, Cypress for frontend/E2E, or PyTest for backend) to verify:
    *   Your application's core functionality.
    *   The correct behavior of the `/_synthetic/*` API integrations.
    *   Task verification logic.

---