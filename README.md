# Synthetic Website Template

This repository provides a template for creating self-hosted, synthetic websites designed for training, evaluating, and demonstrating browser-based AI agents. It aims to accelerate development by providing a pre-configured starting point that adheres to a set of general requirements for such environments.


The template includes a React/TypeScript frontend and a Python/FastAPI backend, orchestrated via Docker Compose.

## Website type

This website is a **Project Management / Task Tracking Platform**.

For detailed project requirements and specifications (including necessary features for the website type), please refer to the [Operative Tortoise Instructions](https://docs.google.com/document/d/e/2PACX-1vSFPpbC8RZRSPzhg2Kygz9SEQqpNBMT5rYKcA-UZq0rBSGQjYWUrF1ZHBrNi_i0PmImGK70ooqtA05m/pub).

## Table of Contents

1.  [Getting Started](#getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Installation & Launch](#installation--launch)
2.  [How to Use: Core `/_synthetic/*` API](#how-to-use-core-_synthetic-api)
    *   [API Interaction Prerequisites](#api-interaction-prerequisites)
    *   [Key API Endpoints](#key-api-endpoints)
        *   [1. Initialize a New Session](#1-initialize-a-new-session)
        *   [2. Log a Custom Event](#2-log-a-custom-event)
        *   [3. Get Logs for a Session](#3-get-logs-for-a-session)
        *   [4. Get Full Backend State](#4-get-full-backend-state)
        *   [5. Reset Environment](#5-reset-environment)
        *   [6. Augment Backend State](#6-augment-backend-state)
        *   [7. Set (Overwrite) Backend State](#7-set-overwrite-backend-state)
        *   [8. Verify a Custom Task](#8-verify-a-custom-task)
3.  [Design Principles for Synthetic Training Websites](#design-principles-for-synthetic-training-websites)
    *   [Functional Realism](#functional-realism)
    *   [Controlled Sandboxing & Determinism](#controlled-sandboxing--determinism)
    *   [Comprehensive Observability](#comprehensive-observability)
    *   [Agent Agnostic Design](#agent-agnostic-design)
    *   [Modular Mocked Services](#modular-mocked-services)
    *   [Performance for Training](#performance-for-training)
4.  [How This Template Implements the Principles](#how-this-template-implements-the-principles)
    *   [1. Self-Hosted Deployment](#1-self-hosted-deployment)
    *   [2. Complete Application Simulation (Mocked Backend)](#2-complete-application-simulation-mocked-backend)
    *   [3. Action Logging & Telemetry](#3-action-logging--telemetry)
    *   [4. State Exposure & Control](#4-state-exposure--control)
    *   [5. Task Verification & Episode Management](#5-task-verification--episode-management)
    *   [6. Accessibility & Element Identification](#6-accessibility--element-identification)
5.  [Building Your Own Synthetic Website from this Template](#building-your-own-synthetic-website-from-this-template)
    *   [Overview](#overview)
    *   [Step 1: Clone/Copy the Template](#step-1-clonecopy-the-template)
    *   [Step 2: Define Your Application](#step-2-define-your-application)
    *   [Step 3: Implement Data Seeding](#step-3-implement-data-seeding)
    *   [Step 4: Define Task Verification](#step-4-define-task-verification)
    *   [Step 5: Update Documentation](#step-5-update-documentation)
    *   [Step 6: Add Automated Tests](#step-6-add-automated-tests)

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
curl -s -X POST \\
  "http://localhost:8000/_synthetic/log_event?session_id=$SESSION_ID" \\
  -H "Content-Type: application/json" \\
  -d '{
    "actionType": "user_click",
    "payload": {
      "page_url": "http://localhost:3000/notes",
      "target_element_identifier": "[data-testid=\\'create-note-btn\\']",
      "custom_property": "custom_value"
    }
  }' \\
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
      "page_url": "http://localhost:3000/notes",
      "target_element_identifier": "[data-testid=\\'create-note-btn\\']",
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

**Example Output (for the Notes app)**:
```json
{
  "users": [
    {
      "id": "u1",
      "username": "testuser"
    }
  ],
  "notes": [
    {
      "id": "n1",
      "owner_id": "u1",
      "title": "Sample Note",
      "content": "This is a default note.",
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
curl -s -X POST \\
  "http://localhost:8000/_synthetic/augment_state" \\
  -H "Cookie: session_id=$SESSION_ID" \\
  -H "Content-Type: application/json" \\
  -d '{
    "notes": [
      {
        "id": "n_cli_augmented",
        "owner_id": "u1",
        "title": "CLI Augmented Note",
        "content": "This note was added via augment_state.",
        "created_at": 1678886500
      }
    ],
    "new_custom_property": "augmented_value"
  }' \\
| jq
```

**Example Output**:
```json
{
  "status": "ok",
  "message": "State augmented with provided data."
}
```
*(After this, `GET /_synthetic/state` would show the new note and property merged into the existing state.)*

#### 7. Set (Overwrite) Backend State

Replace the entire backend state with the provided payload.

```bash
# Ensure SESSION_ID is set if mutations should be session-aware
curl -s -X POST \\
  "http://localhost:8000/_synthetic/set_state" \\
  -H "Cookie: session_id=$SESSION_ID" \\
  -H "Content-Type: application/json" \\
  -d '{
    "users": [{"id": "new_user", "username": "overwritten_user"}],
    "notes": [],
    "logged_in_user_id": null,
    "custom_message": "State completely overwritten"
  }' \\
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
    *   The example `NotesApp` includes a basic login flow. You can extend this for more complex user account simulation.
*   **Simulated Transactional Flows**:
    *   The example `NotesApp` (`backend/app/routes/notes.py`) demonstrates CRUD operations. This can be adapted for any transactional flow (e.g., purchases, bookings).
*   **Content & Data Management**:
    *   The `backend/app/state_manager.py` handles in-memory state. It's initialized with default data (e.g., sample notes and users).
    *   This can be extended to load data from files or use a simple database like SQLite within the container.
*   **Simulated User-Generated Content**:
    *   The example Notes app allows creating, editing, and deleting notes. These changes persist in the backend's in-memory state for the current session.
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
    *   Modify `backend/app/routes/notes.py` or add new routers (e.g., `your_app_routes.py`) for your application's API endpoints. Register new routers in `backend/app/main.py`.
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
