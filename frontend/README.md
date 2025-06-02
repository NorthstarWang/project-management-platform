# Project Management Platform - Frontend

A modern React/TypeScript frontend for the project management platform, designed for AI agent training and browser automation.

## 🎯 Current Status

**✅ Analytics System**: Complete event logging and synthetic API integration  
**✅ API Client**: Ready for backend communication  
**🔧 UI Components**: In development (analytics infrastructure ready)  
**✅ Development Setup**: Docker environment with hot reload  

## 🚀 Quick Start

### Development
```bash
# Start development server
npm run dev
# Opens at http://localhost:3000
```

### Docker (Recommended)
```bash
# From project root
docker-compose up --build
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
```

## 🏗️ Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Radix UI Themes
- **Components**: Radix UI Primitives
- **Icons**: Lucide React
- **Analytics**: Custom event logging system
- **API Client**: Axios-based wrapper

## ✅ Implemented Features

### Analytics & Logging System
- **Event Logging**: Comprehensive tracking for AI agent training
- **Session Management**: Automatic session initialization
- **Element Identification**: `data-testid` attribute prioritization
- **Task Verification**: `TASK_DONE` event support
- **React Integration**: Custom hooks for easy component integration

### API Integration
- **Authentication**: Login/logout with session management
- **CRUD Operations**: Full API wrapper for all backend endpoints
- **Error Handling**: Comprehensive error handling and validation
- **State Management**: Integrated with analytics logging

### Development Tools
- **TypeScript**: Full type safety throughout
- **ESLint**: Code quality and consistency
- **Hot Reload**: Development environment with instant updates
- **Docker Support**: Containerized development and deployment

## 📊 Analytics System

The frontend includes a complete analytics system for AI agent training:

### Event Tracking
```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function MyComponent() {
  const analytics = useAnalytics();
  
  const handleClick = () => {
    analytics.logEvent('user_click', {
      page_url: window.location.href,
      target_element_identifier: '[data-testid="my-button"]',
      custom_data: 'additional info'
    });
  };
}
```

### Session Management
```typescript
// Automatic session initialization
const sessionId = await analytics.initializeSession();

// Task completion tracking
analytics.logTaskCompletion('login_success');
```

### Element Identification
All interactive elements should use `data-testid` attributes:
```jsx
<button data-testid="create-task-btn">
  Create Task
</button>
```

## 🔧 API Client

Simple wrapper for backend communication:

```typescript
import { apiClient } from '@/services/apiClient';

// Authenticated requests
const user = await apiClient.getCurrentUser();
const projects = await apiClient.getProjects();

// Task operations
const task = await apiClient.createTask({
  title: 'New Task',
  description: 'Task description',
  listId: 'list-id'
});
```

## 📂 Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── auth/              # Authentication components
│   │   ├── projects/          # Project management components
│   │   ├── boards/            # Board and task components
│   │   └── common/            # Shared components
│   ├── hooks/                 # Custom React hooks
│   │   ├── useAnalytics.ts    # ✅ Analytics integration
│   │   ├── useAuth.ts         # ✅ Authentication state
│   │   └── useApi.ts          # ✅ API integration
│   ├── services/              # External service integrations
│   │   ├── analyticsLogger.ts # ✅ Event logging system
│   │   ├── apiClient.ts       # ✅ Backend API wrapper
│   │   ├── authService.ts     # ✅ Authentication service
│   │   └── README.md          # Service documentation
│   ├── lib/                   # Utility functions
│   ├── contexts/              # React contexts
│   └── utils/                 # Helper utilities
├── public/                    # Static assets
├── package.json              # Dependencies and scripts
├── tailwind.config.js        # Tailwind CSS configuration
├── next.config.ts            # Next.js configuration
└── Dockerfile               # Container configuration
```

## 📋 Planned UI Components

### Core Pages (Pending Implementation)
1. **Authentication** (`/login`, `/register`)
   - Login/register forms with validation
   - Role-based redirection

2. **Dashboard** (`/dashboard`)
   - User overview with quick stats
   - Recent activity feed
   - Quick access to projects and boards

3. **Projects** (`/projects`, `/projects/[id]`)
   - Project list and detail views
   - Project creation and management
   - Board management within projects

4. **Boards** (`/boards/[id]`)
   - Kanban board interface
   - Drag-and-drop task management
   - Real-time collaboration features

5. **Tasks** (Modal/Page)
   - Task detail views
   - Comment threads
   - Activity timeline

### Shared Components (Pending Implementation)
- **Navigation**: Header, sidebar, breadcrumbs
- **Task Management**: Task cards, lists, drag-and-drop
- **User Interface**: Avatars, badges, notifications
- **Forms**: Task creation, project setup, user management

## 🧪 Testing

### Current Testing Setup
```bash
# Lint code
npm run lint

# Type checking
npm run type-check

# Build verification
npm run build
```

### Analytics Testing
The analytics system is fully testable:
```bash
# Test event logging
curl -X POST "http://localhost:8000/_synthetic/log_event?session_id=SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"actionType": "test_event", "payload": {"test": true}}'
```

## 📖 Development Guidelines

### Adding New Components
1. **Use TypeScript**: All components should be fully typed
2. **Add Analytics**: Include event tracking for user interactions
3. **Element IDs**: Use `data-testid` attributes for testing
4. **Error Handling**: Implement proper error boundaries and validation

### Analytics Integration
```typescript
// Component with analytics
function TaskCard({ task }: TaskCardProps) {
  const analytics = useAnalytics();
  
  const handleClick = () => {
    analytics.logEvent('task_click', {
      task_id: task.id,
      page_url: window.location.href,
      target_element_identifier: `[data-testid="task-${task.id}"]`
    });
  };
  
  return (
    <div data-testid={`task-${task.id}`} onClick={handleClick}>
      {/* Task content */}
    </div>
  );
}
```

## 🔗 Related Documentation

- **Analytics Integration**: `src/services/README.md`
- **Backend API**: `../backend/README.md`
- **Main Project**: `../README.md`

## 🎯 Next Steps

### High Priority
1. **Authentication Pages** - Login/register forms with analytics
2. **Dashboard Layout** - Main navigation and user overview
3. **Project Management** - Project listing and detail pages
4. **Board Interface** - Kanban board with drag-and-drop

### Medium Priority
1. **Task Management** - Task creation, editing, and details
2. **User Management** - Profile settings and team management
3. **Search & Filters** - Advanced search and filtering capabilities
4. **Real-time Updates** - WebSocket integration for live updates

---

**Status**: Analytics and API integration complete, UI implementation in progress  
**Ready For**: Component development with full backend and analytics support