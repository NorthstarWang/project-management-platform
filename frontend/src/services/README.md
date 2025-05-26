# Simple Analytics Logging System

This directory contains a simplified analytics logging system that tracks user interactions and application events according to the project documentation requirements.

## 🎯 **Quick Reference**

### When to Add Analytics

| Component Type | Required Analytics | Implementation |
|---|---|---|
| **Page Components** | Page views | `useAnalytics({ trackPageViews: true })` |
| **Form Components** | Form submissions | `useFormAnalytics('form_name')` |
| **Button/Link Components** | Click tracking | `useClickAnalytics()` |
| **Task Completion** | Task verification | `analytics.taskDone('task_name')` |

### Essential data-testid Attributes

```typescript
// Always add to interactive elements for stable identification
<button data-testid="submit-form">Submit</button>
<input data-testid="email-input" type="email" />
<div data-testid="project-card" onClick={...}>Project</div>
<form data-testid="login-form">...</form>
```

## 📁 **Services Overview**

| Service | Purpose | Key Features |
|---------|---------|-------------|
| `analyticsLogger.ts` | Core analytics engine | Session management, automatic event tracking |
| `apiClient.ts` | Simple API wrapper | Basic request logging |

## 🚀 **Basic Implementation**

### 1. Page Components

```typescript
// pages/dashboard.tsx
import { useAnalytics } from '../hooks/useAnalytics';

export default function Dashboard() {
  const analytics = useAnalytics({
    trackPageViews: true,
    componentName: 'Dashboard'
  });

  const handleProjectCreate = () => {
    analytics.track('project_create_clicked', {
      source: 'dashboard'
    });
  };

  return (
    <div data-testid="dashboard-page">
      <button data-testid="create-project-btn" onClick={handleProjectCreate}>
        Create Project
      </button>
    </div>
  );
}
```

### 2. Form Components

```typescript
// components/LoginForm.tsx
import { useFormAnalytics } from '../hooks/useAnalytics';

export default function LoginForm() {
  const formAnalytics = useFormAnalytics('login_form');

  const handleSubmit = async (data) => {
    formAnalytics.trackFormSubmit({ login_method: 'email' });
    
    try {
      const response = await apiClient.post('/api/login', data);
      // Task completion for verification
      analytics.taskDone('login_success', { user_id: response.data.user.id });
    } catch (error) {
      analytics.track('login_failed', { error: error.message });
    }
  };

  return (
    <form data-testid="login-form" onSubmit={handleSubmit}>
      <input 
        data-testid="email-input"
        type="email"
        onChange={(e) => formAnalytics.trackFieldChange('email', e.target.value)}
      />
      <button data-testid="login-submit" type="submit">Login</button>
    </form>
  );
}
```

### 3. Button/Link Components

```typescript
// components/TaskCard.tsx
import { useClickAnalytics } from '../hooks/useAnalytics';

export default function TaskCard({ task }) {
  const clickAnalytics = useClickAnalytics();

  const handleTaskClick = () => {
    clickAnalytics.trackButtonClick(`task-${task.id}`, {
      task_status: task.status
    });
  };

  return (
    <div 
      data-testid={`task-card-${task.id}`}
      onClick={handleTaskClick}
    >
      {task.title}
    </div>
  );
}
```

## 📊 **Event Tracking**

### Required Event Types (per documentation)

```typescript
// User actions
analytics.track('click', { target_element_identifier: '[data-testid="submit-btn"]' });
analytics.track('keydown', { key: 'Enter', target_element_identifier: '#search-input' });
analytics.track('form_submit', { form_action: '/api/login' });
analytics.track('scroll', { scroll_x: 0, scroll_y: 100 });
analytics.track('focus', { target_element_identifier: '[data-testid="email-input"]' });

// Application events  
analytics.track('page_load', { load_time: 1234 });
analytics.track('navigate', { type: 'popstate' });

// Task completion (for verification)
analytics.taskDone('login_success');
analytics.taskDone('task_created', { task_id: 'task_123' });
```

### Log Structure (automatically handled)

Each event sent to `/_synthetic/log_event` includes:
- `timestamp` (added by backend)
- `session_id` (managed automatically)
- `page_url` (current URL)
- `action_type` (your event name)
- `target_element_identifier` (for UI events)
- `action_payload` (your event data)

## 🔧 **API Integration**

### Simple API Client Usage

```typescript
import apiClient from '../services/apiClient';

// All requests automatically logged
const projects = await apiClient.get('/api/projects');
const newProject = await apiClient.post('/api/projects', projectData);
const updated = await apiClient.put(`/api/projects/${id}`, updates);
await apiClient.delete(`/api/projects/${id}`);
```

## 📈 **Session Management**

### Automatic Session Handling

```typescript
// Session automatically created on page load via /_synthetic/new_session
// Session ID stored and used for all events
// Get current session ID
const sessionId = getSessionId();
```

### Manual Session Reset

```bash
# Reset environment (creates new session)
curl -X POST "http://localhost:8000/_synthetic/reset"
```

## 🎯 **Task Verification**

### For AI Agent Training

```typescript
// Mark task completion for verification
analytics.taskDone('login_success');
analytics.taskDone('project_created', { project_id: 'proj_123' });
analytics.taskDone('task_moved', { from_list: 'todo', to_list: 'done' });

// Backend verification endpoint
// GET /_synthetic/verify_task?task_name=login_success&session_id=SESSION_ID
```

## 🔍 **Element Identification Priority**

1. `data-testid` attributes (highest priority)
2. `id` attributes  
3. `aria-label` attributes
4. CSS selectors (tag + classes)

```typescript
// Best practice - always use data-testid
<button data-testid="create-task-btn">Create Task</button>
<input data-testid="task-title-input" />
<form data-testid="project-form">...</form>
```

## 📋 **Implementation Checklist**

### For Each Component

- [ ] Add `data-testid` to interactive elements
- [ ] Import appropriate analytics hooks
- [ ] Track key user actions
- [ ] Use `taskDone()` for completion events
- [ ] Test events in browser console

### Required Events to Track

- [ ] Clicks on buttons/links
- [ ] Form submissions  
- [ ] Page loads and navigation
- [ ] Key user workflows
- [ ] Task completions

## 🚨 **Common Mistakes**

### ❌ Don't Do This

```typescript
// Missing data-testid
<button onClick={handleClick}>Submit</button>

// Direct fetch instead of apiClient  
const response = await fetch('/api/projects');

// No task completion tracking
// (Missing verification events)
```

### ✅ Do This

```typescript
// Proper data-testid
<button data-testid="submit-btn" onClick={handleClick}>Submit</button>

// Use apiClient for automatic logging
const response = await apiClient.get('/api/projects');

// Track task completion
analytics.taskDone('form_submitted');
```

## 🔄 **Testing & Debugging**

### View Logged Events

```bash
# Get all events for current session
curl "http://localhost:8000/_synthetic/logs?session_id=SESSION_ID" | jq

# Check current backend state
curl "http://localhost:8000/_synthetic/state" | jq
```

### Browser Console

```javascript
// Check session ID
console.log(getSessionId());

// Manual event tracking
track('custom_event', { test: true });
```

## 📖 **Documentation Requirements**

This implementation follows the project documentation requirements:

1. ✅ **Event Logging**: All significant actions logged
2. ✅ **Structured Format**: JSON with required fields
3. ✅ **Session Management**: Via `/_synthetic/new_session`
4. ✅ **Element Identification**: Prioritizes `data-testid`
5. ✅ **Task Verification**: `TASK_DONE` events for verification
6. ✅ **Backend Integration**: Uses `/_synthetic/log_event` endpoint

The system is designed to be simple, focused, and compliant with the actual project requirements rather than over-engineered with unnecessary features. 