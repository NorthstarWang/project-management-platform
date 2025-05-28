# Project Management Platform - Frontend

A comprehensive project management platform built with Next.js, TypeScript, Radix UI, and Tailwind CSS.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Radix UI Themes
- **Components**: Radix UI Primitives
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Drag & Drop**: @dnd-kit (for Kanban board functionality)

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Page Architecture & Planning

### 🏠 **Public Pages**

#### 1. Homepage (`/`)
**Purpose**: Landing page for unauthenticated users
**API Dependencies**:
- None (static content)

**Radix UI Components**:
- `Card` - Feature showcase cards
- `Button` - Call-to-action buttons
- `Dialog` - Quick login modal (optional)
- `Accordion` - FAQ sections

**Key Features**:
- Platform overview and features
- Call-to-action to login/register
- Product showcase
- Quick login option
- Responsive design

---

### 🔐 **Authentication Pages**

#### 2. Login Page (`/login`)
**Purpose**: User authentication entry point
**API Dependencies**:
- `POST /api/login` - User authentication
- `POST /_synthetic/new_session` - Initialize session

**Radix UI Components**:
- `Dialog` - Modal login form (optional)
- `Label` - Form field labels
- `Toast` - Success/error notifications
- `Button` - Submit actions

**Key Features**:
- Username/password form
- Role-based redirect after login
- Error handling with toast notifications
- Session management

---

#### 3. Register Page (`/register`)
**Purpose**: New user registration
**API Dependencies**:
- `POST /api/register` - User registration

**Radix UI Components**:
- `Label` - Form field labels
- `Select` - Role selection dropdown
- `Toast` - Registration feedback
- `Button` - Submit actions

**Key Features**:
- User registration form
- Role selection (admin/manager/member)
- Form validation
- Redirect to login after successful registration

---

### 🏠 **Dashboard & Overview Pages**

#### 4. Dashboard (`/dashboard`)
**Purpose**: Main landing page after login with overview
**API Dependencies**:
- `GET /api/users/me` - Current user info
- `GET /api/users/me/boards` - User's enrolled boards
- `GET /api/users/me/assigned_projects` - Manager's assigned projects (if manager)
- `GET /api/users/me/assigned_tasks` - User's assigned tasks
- `GET /api/notifications?unread_only=true` - Recent notifications
- `GET /api/notifications/unread_count` - Notification count

**Radix UI Components**:
- `Tabs` - Switch between different views (My Tasks, My Boards, etc.)
- `Card` - Information cards for stats
- `Avatar` - User profile display
- `Badge` - Status indicators
- `Progress` - Task completion progress
- `Tooltip` - Additional information on hover
- `DropdownMenu` - User menu
- `Bell` icon with notification count

**Key Features**:
- Personal task overview
- Recent activity feed
- Quick access to boards and projects
- Notification center
- User profile menu

---

### 👥 **User & Team Management**

#### 5. Users List (`/users`)
**Purpose**: User management (admin/manager only)
**API Dependencies**:
- `GET /api/users` - List all users
- `GET /api/teams` - List teams

**Radix UI Components**:
- `Table` - User listing
- `Badge` - Role indicators
- `Avatar` - User profile pictures
- `DropdownMenu` - User actions
- `Dialog` - User details modal
- `Tabs` - Filter by role/team

**Key Features**:
- Searchable user list
- Role-based filtering
- User profile viewing
- Team membership display

---

#### 6. Teams Page (`/teams`)
**Purpose**: Team management and overview
**API Dependencies**:
- `GET /api/teams` - List user's teams
- `GET /api/teams/{id}` - Team details with members
- `POST /api/teams` - Create team (admin/manager)

**Radix UI Components**:
- `Card` - Team cards
- `Avatar` - Team member avatars
- `Dialog` - Create/edit team modal
- `Accordion` - Expandable team details
- `Badge` - Member count, role indicators

**Key Features**:
- Team overview cards
- Member management
- Team creation (admin/manager)
- Team statistics

---

### 📋 **Project Management**

#### 7. Projects List (`/projects`)
**Purpose**: Project overview and management
**API Dependencies**:
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create project (admin/manager)
- `POST /api/projects/{id}/assign_manager` - Assign manager (admin)
- `GET /api/projects/{id}/managers` - List project managers

**Radix UI Components**:
- `Card` - Project cards
- `Dialog` - Create/edit project modal
- `DropdownMenu` - Project actions
- `Badge` - Status indicators
- `Avatar` - Manager avatars
- `Progress` - Project completion

**Key Features**:
- Project grid/list view
- Project creation and editing
- Manager assignment (admin)
- Project statistics and progress

---

#### 8. Project Detail (`/projects/[id]`)
**Purpose**: Detailed project view with boards
**API Dependencies**:
- `GET /api/projects/{id}` - Project details
- `GET /api/projects/{id}/boards` - Project boards
- `GET /api/projects/{id}/managers` - Project managers
- `GET /api/projects/{id}/search?q=query` - Project-wide search

**Radix UI Components**:
- `Tabs` - Switch between boards, overview, settings
- `Card` - Board cards
- `Dialog` - Create board modal
- `DropdownMenu` - Board actions
- `Badge` - Board status

**Key Features**:
- Board management within project
- Project-wide task search (via header search)
- Manager assignment interface
- Project settings

---

### 📊 **Board Management**

#### 9. Board Detail (`/boards/[id]`)
**Purpose**: Kanban board interface (main workspace)
**API Dependencies**:
- `GET /api/boards/{id}` - Board with lists and tasks
- `GET /api/boards/{id}/members` - Board members
- `POST /api/lists` - Create list
- `POST /api/tasks` - Create task
- `PUT /api/tasks/{id}/move` - Move task between lists
- `PUT /api/tasks/{id}` - Update task
- `POST /api/boards/{id}/enroll_member` - Add member (manager)
- `DELETE /api/boards/{id}/members/{user_id}` - Remove member (manager)
- `GET /api/boards/{id}/search?q=query` - Search tasks in board

**Radix UI Components**:
- `Card` - Task cards and list containers
- `Dialog` - Task detail modal, create task modal
- `DropdownMenu` - Task actions, list actions
- `Avatar` - Assignee avatars
- `Badge` - Priority, status indicators
- `Tooltip` - Quick task info
- `ContextMenu` - Right-click actions
- `Popover` - Quick actions

**Drag & Drop Components (@dnd-kit)**:
- `DndContext` - Main drag-and-drop context provider
- `DragOverlay` - Visual feedback during drag
- `Droppable` - List containers that accept drops
- `Draggable` - Individual task cards
- `SortableContext` - Sortable lists and tasks
- `useSortable` - Hook for sortable task items
- `useDraggable` - Hook for draggable elements
- `useDroppable` - Hook for droppable containers

**Key Features**:
- **Professional drag-and-drop** with @dnd-kit (accessible, touch-friendly, keyboard navigation)
- **Multi-directional dragging** - tasks between lists and within lists for reordering
- **Visual feedback** - drag overlays and drop indicators
- **Accessibility** - keyboard navigation and screen reader support
- **Touch support** - mobile-friendly drag interactions
- **Auto-scrolling** - automatic scrolling during drag operations
- Real-time task updates
- Member management (manager)
- Task search and filtering (via header search)
- List management
- Task creation and editing

---

### ✅ **Task Management**

#### 10. Task Detail Modal/Page (`/tasks/[id]` or Modal)
**Purpose**: Detailed task view and editing
**API Dependencies**:
- `GET /api/tasks/{id}/full` - Task with comments and activities
- `PUT /api/tasks/{id}` - Update task
- `POST /api/comments` - Add comment
- `GET /api/tasks/{id}/comments` - Get task comments
- `GET /api/tasks/{id}/activities` - Get task activities
- `PUT /api/tasks/{id}/archive` - Archive task
- `PUT /api/tasks/{id}/unarchive` - Unarchive task

**Radix UI Components**:
- `Dialog` - Task detail modal
- `Tabs` - Switch between details, comments, activity
- `Textarea` - Task description, comments
- `Select` - Assignee, priority, status selection
- `DatePicker` - Due date selection
- `Avatar` - Comment authors, assignee
- `Badge` - Priority, status
- `Accordion` - Activity timeline
- `Tooltip` - Activity details

**Key Features**:
- Rich task editing
- Comment system with threading
- Activity timeline
- File attachments (future)
- Task archiving

---

### 📊 **Activity & Tracking**

#### 11. Activity Log (`/activity`)
**Purpose**: Comprehensive activity and notification tracking for audit purposes
**API Dependencies**:
- `GET /api/notifications` - List all notifications/activities
- `GET /api/notifications?unread_only=true` - Filter unread items
- `PUT /api/notifications/{id}/mark_read` - Mark as read
- `PUT /api/notifications/mark_all_read` - Mark all as read
- `GET /api/notifications/unread_count` - Unread count

**Radix UI Components**:
- `Card` - Activity/notification cards
- `Badge` - Unread indicators, activity types
- `Button` - Mark as read actions
- `Tabs` - Filter activities (all, unread, by type)
- `Avatar` - Activity actors
- `Tooltip` - Activity details
- `Accordion` - Grouped activities by date
- `Select` - Filter by date range, activity type

**Key Features**:
- Complete activity audit trail
- Notification management
- Activity filtering and search
- Date-based grouping
- Export capabilities (future)
- Activity analytics (future)

---

### ⚙️ **Settings & Profile**

#### 12. Profile Settings (`/profile`)
**Purpose**: User profile management
**API Dependencies**:
- `GET /api/users/me` - Current user info
- `PUT /api/users/me` - Update profile (future endpoint)

**Radix UI Components**:
- `Tabs` - Profile sections (general, preferences, security)
- `Avatar` - Profile picture
- `Label` - Form labels
- `Switch` - Preference toggles
- `Button` - Save actions

**Key Features**:
- Profile editing
- Preference management
- Password change (future)
- Notification preferences

---

## Shared Components

### Navigation Components
- **Header**: Global navigation with user menu, notifications bell, and **search bar**
- **Sidebar**: Main navigation menu
- **Breadcrumbs**: Page navigation context

### Search Components (No Dedicated Page)
- **GlobalSearchBar**: Header search component with dropdown results
- **SearchResults**: Dropdown component showing search results
- **SearchFilters**: Quick filter options in search dropdown

**Search API Dependencies**:
- `GET /api/boards/{id}/search?q=query` - Board search
- `GET /api/projects/{id}/search?q=query` - Project search
- Context-aware search based on current page

**Search Radix UI Components**:
- `Popover` - Search results dropdown
- `Card` - Search result items
- `Badge` - Result type indicators
- `Separator` - Group separators in results

### Notification Components (No Dedicated Page)
- **NotificationBell**: Header notification icon with count
- **NotificationDropdown**: Quick notification preview
- **NotificationItem**: Individual notification component

**Notification Radix UI Components**:
- `Popover` - Notification dropdown
- `Badge` - Unread count indicator
- `Card` - Notification items
- `Button` - Quick actions (mark as read)

### Common UI Components
- **TaskCard**: Reusable task display component
- **UserAvatar**: User profile display
- **StatusBadge**: Status indicators
- **PriorityBadge**: Priority indicators
- **LoadingSpinner**: Loading states
- **EmptyState**: Empty data states

### Layout Components
- **DashboardLayout**: Main app layout
- **AuthLayout**: Authentication page layout
- **BoardLayout**: Board-specific layout
- **PublicLayout**: Homepage and public pages layout

## State Management Strategy

### Global State (Context/Zustand)
- User authentication state
- Current user information
- Notification count
- Theme preferences
- Search state and history

### Local State (React State)
- Form data
- Modal open/close states
- Loading states
- Search queries and filters

### Server State (React Query/SWR)
- API data caching
- Background refetching
- Optimistic updates
- Error handling

## Routing Structure

```
/
├── (public homepage)
├── login
├── register
├── dashboard
├── users
├── teams
├── projects/
│   └── [id]/
│       └── boards/
│           └── [boardId]
├── boards/
│   └── [id]
├── tasks/
│   └── [id]
├── activity (renamed from notifications)
└── profile
```

## Development Priorities - Focused 5-Page Implementation

### Phase 1: Foundation & Authentication (8-12 hours)
**Goal**: Get users authenticated and basic navigation working

#### 1.1 Core Infrastructure (3-4 hours)
- [ ] **Project setup & dependencies**
  - Install @dnd-kit packages: `@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
  - Install state management: `zustand @tanstack/react-query axios`
  - Configure API client with session management
- [ ] **Layout foundation**
  - Create `AuthLayout` component for login/register pages
  - Create `DashboardLayout` component with header and sidebar
  - Set up basic routing structure
- [ ] **Theme & styling setup**
  - Configure Radix UI themes (dark/light mode)
  - Set up global CSS variables and utility classes
  - Create reusable component library structure

#### 1.2 Authentication Pages (3-4 hours)
- [ ] **Homepage (`/`)**
  - Simple landing page with platform overview
  - Call-to-action buttons to login/register
  - Basic responsive design
  - **Components**: `Card`, `Button`
- [ ] **Login Page (`/login`)**
  - Username/password form with validation
  - Session initialization on successful login
  - Error handling with toast notifications
  - Redirect to dashboard after login
  - **API**: `POST /_synthetic/new_session`, `POST /api/login`
  - **Components**: `Label`, `Button`, `Toast`
- [ ] **Register Page (`/register`)**
  - User registration form with role selection
  - Form validation and error handling
  - Redirect to login after successful registration
  - **API**: `POST /api/register`
  - **Components**: `Label`, `Select`, `Button`, `Toast`

#### 1.3 Navigation & State (2-4 hours)
- [ ] **Global state management**
  - User authentication state (Zustand)
  - Session management
  - Basic error handling
- [ ] **Navigation components**
  - Header with user menu and logout
  - Sidebar with main navigation links
  - Breadcrumb component
  - **Components**: `DropdownMenu`, `Avatar`, `Button`

**Phase 1 Deliverables**: Users can register, login, and see basic navigation

---

### Phase 2: Core Dashboard & Projects (12-16 hours)
**Goal**: Display user data and project management interface

#### 2.1 Dashboard Page (4-6 hours)
- [ ] **Dashboard (`/dashboard`)**
  - Welcome message with current user info
  - Quick stats cards (assigned tasks, projects, notifications)
  - Recent activity feed (simplified)
  - Quick access to user's boards and projects
  - **API**: `GET /api/users/me`, `GET /api/users/me/boards`, `GET /api/users/me/assigned_tasks`
  - **Components**: `Card`, `Avatar`, `Badge`, `Tabs`

#### 2.2 Projects Management (6-8 hours)
- [ ] **Projects List (`/projects`)**
  - Grid/card view of user's accessible projects
  - Project creation modal (admin/manager only)
  - Basic project information display
  - Navigation to project detail view
  - **API**: `GET /api/projects`, `POST /api/projects`
  - **Components**: `Card`, `Dialog`, `Badge`, `DropdownMenu`
- [ ] **Project Detail (`/projects/[id]`)**
  - Project information and description
  - List of project boards in card format
  - Board creation modal (manager only)
  - Navigation to individual boards
  - **API**: `GET /api/projects/{id}`, `GET /api/projects/{id}/boards`, `POST /api/boards`
  - **Components**: `Card`, `Dialog`, `Tabs`, `Badge`

#### 2.3 Shared Components (2-4 hours)
- [ ] **Reusable components**
  - `ProjectCard` - Project display component
  - `BoardCard` - Board display component
  - `UserAvatar` - User profile display
  - `StatusBadge` - Status indicators
  - `LoadingSpinner` - Loading states
  - `EmptyState` - Empty data states

**Phase 2 Deliverables**: Users can view dashboard, browse projects, and navigate to boards

---

### Phase 3: Board Interface & Task Management (16-20 hours)
**Goal**: Complete Kanban board with drag-and-drop functionality

#### 3.1 Basic Board Layout (6-8 hours)
- [ ] **Board Detail (`/boards/[id]`) - Static Version**
  - Board header with title and member avatars
  - List columns display (To Do, In Progress, Done)
  - Task cards in static layout (no drag-drop yet)
  - Task creation modal
  - **API**: `GET /api/boards/{id}`, `POST /api/tasks`
  - **Components**: `Card`, `Dialog`, `Avatar`, `Badge`

#### 3.2 Task Management (4-6 hours)
- [ ] **Task components**
  - `TaskCard` - Individual task display
  - Task detail modal with editing capabilities
  - Task creation and editing forms
  - Priority and status indicators
  - **API**: `GET /api/tasks/{id}/full`, `PUT /api/tasks/{id}`, `POST /api/comments`
  - **Components**: `Dialog`, `Textarea`, `Select`, `Badge`

#### 3.3 Drag & Drop Implementation (6-8 hours)
- [ ] **@dnd-kit integration**
  - Set up `DndContext` for the board
  - Make task cards draggable with `useDraggable`
  - Make lists droppable with `useDroppable`
  - Implement task reordering within lists
  - Implement task movement between lists
  - Visual feedback with `DragOverlay`
  - **API**: `PUT /api/tasks/{id}/move`
  - **Components**: `DndContext`, `DragOverlay`, `Draggable`, `Droppable`

#### 3.4 Board Management (2-4 hours)
- [ ] **Board features**
  - List creation and management
  - Member management (manager only)
  - Basic board settings
  - **API**: `POST /api/lists`, `POST /api/boards/{id}/enroll_member`
  - **Components**: `Dialog`, `DropdownMenu`, `Avatar`

**Phase 3 Deliverables**: Fully functional Kanban board with drag-and-drop task management

---

## Implementation Timeline

### **Realistic Weekend Timeline** (48-60 hours total)
- **Friday Evening**: Phase 1 setup and authentication (8-12 hours)
- **Saturday**: Phase 2 dashboard and projects (12-16 hours)  
- **Sunday**: Phase 3 board interface and drag-drop (16-20 hours)
- **Monday**: Testing, bug fixes, and polish (8-12 hours)

### **Success Metrics**
- [ ] Users can register and login
- [ ] Dashboard shows personalized user data
- [ ] Projects can be viewed and boards accessed
- [ ] Tasks can be created, edited, and moved via drag-and-drop
- [ ] Basic responsive design works on desktop and mobile
- [ ] All API integrations work correctly
- [ ] Error handling provides user feedback

### **Deferred Features** (Post-Phase 3)
- Global search functionality
- Notification system and activity log
- User and team management pages
- Advanced role-based UI features
- Comment threading and activity timeline
- Advanced animations and polish
- Mobile optimization
- Accessibility improvements

### **Technical Debt to Address Later**
- Comprehensive error boundary implementation
- Performance optimization (React.memo, useMemo)
- Advanced state management patterns
- Comprehensive testing suite
- Advanced TypeScript patterns
- SEO and meta tag optimization

## Required Dependencies

### Core Dependencies (Already Installed)
```bash
# Radix UI Components & Themes
@radix-ui/react-* (all components)
@radix-ui/themes

# Icons & Animation
lucide-react
framer-motion
```

### Additional Dependencies Needed
```bash
# Install dnd-kit for drag-and-drop functionality
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Install additional utilities for state management and API calls
npm install zustand @tanstack/react-query axios
```

## API Integration Notes

- All API calls should include session management
- Error handling with toast notifications
- Loading states for all async operations
- Optimistic updates where appropriate
- Real-time updates for collaborative features (future WebSocket integration)
- Search is context-aware (searches within current board/project when applicable)
- Notifications are primarily accessed via header dropdown, with full activity log for audit purposes