# Session Persistence Implementation

This document explains how session persistence is implemented in the frontend to maintain user authentication across browser refreshes and tab closures.

## Overview

The session persistence system ensures that users remain logged in even after:
- Browser page refresh
- Closing and reopening browser tabs
- Browser restart (until localStorage is cleared)

## How It Works

### 1. Session Storage
When a user logs in:
- A session is initialized with the backend via `POST /_synthetic/new_session`
- The `session_id` is stored in `localStorage`
- User data is stored in `localStorage` under the key `user`
- The API client is configured with both the session ID and user ID

### 2. Automatic Session Restoration
The API client automatically restores sessions on initialization:
- Reads `session_id` and `user` from localStorage
- Configures itself with the stored session and user data
- Automatically includes `session_id` in all API requests

### 3. Session Validation
The `ProtectedRoute` component validates sessions by:
- Checking for stored session and user data
- Making a test API call to `/api/users/me`
- Redirecting to login if validation fails

## Key Components

### API Client (`src/services/apiClient.ts`)
- **Session Management**: Automatically handles session ID in requests
- **Auto-Restoration**: Restores session from localStorage on initialization
- **Session Methods**: `setSessionId()`, `getSessionId()`, `clearSession()`

### Protected Route (`src/components/auth/ProtectedRoute.tsx`)
- **Session Validation**: Validates stored sessions on route access
- **Error Handling**: Handles network errors vs authentication errors
- **Automatic Redirect**: Redirects to login when session is invalid

### Auth Hook (`src/hooks/useAuth.ts`)
- **User State**: Provides current user and authentication status
- **Session Management**: Easy access to logout and session refresh
- **Loading States**: Handles loading states during initialization

### Login Page (`src/app/login/page.tsx`)
- **Session Creation**: Creates new session on login
- **Data Storage**: Stores session and user data in localStorage
- **API Configuration**: Configures API client with session and user data

## Storage Keys

The following localStorage keys are used:
- `session_id`: The synthetic backend session identifier
- `user`: JSON-serialized user object with id, username, role, etc.

## API Integration

### Automatic Session Inclusion
All API requests automatically include the session_id parameter:
```typescript
// This request automatically includes ?session_id=xxx
const response = await apiClient.get('/api/users/me');
```

### Session Lifecycle
1. **Login**: `POST /_synthetic/new_session` → `POST /api/login`
2. **API Calls**: All requests include `session_id` parameter
3. **Validation**: `GET /api/users/me` to verify session validity
4. **Logout**: Clear localStorage and redirect to login

## Error Handling

### Authentication Errors (401/403)
- Clear stored session data
- Redirect to login page
- User must re-authenticate

### Network Errors
- Allow continued access (backend might be temporarily down)
- Show warning about connectivity issues
- Retry on next request

### Invalid Data
- Clear corrupted localStorage data
- Redirect to login page
- Log errors for debugging

## Testing

A test page is available at `/test-session` to verify session persistence:
- Shows current session information
- Tests API calls with stored session
- Provides actions to test session management
- Includes instructions for manual testing

## Usage Examples

### Using the Auth Hook
```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }
  
  return (
    <div>
      Welcome, {user.full_name}!
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Direct API Client Usage
```typescript
import apiClient from '@/services/apiClient';

// Session ID is automatically included
const response = await apiClient.get('/api/projects');

// Check current session
const sessionId = apiClient.getSessionId();

// Clear session
apiClient.clearSession();
```

## Security Considerations

### localStorage Security
- Data persists until explicitly cleared
- Vulnerable to XSS attacks (mitigated by CSP)
- Not accessible from other domains

### Session Validation
- Sessions are validated on each protected route access
- Invalid sessions are immediately cleared
- Backend session expiration is respected

### Data Minimization
- Only essential user data is stored locally
- Sensitive data remains on the backend
- Session tokens are opaque identifiers

## Troubleshooting

### Session Not Persisting
1. Check browser localStorage support
2. Verify localStorage is not disabled
3. Check for localStorage quota limits
4. Ensure no browser extensions are clearing data

### API Calls Failing
1. Verify session_id is being included in requests
2. Check backend session validity
3. Verify user ID header is set correctly
4. Check network connectivity

### Logout Not Working
1. Verify `clearSession()` is being called
2. Check localStorage is being cleared
3. Ensure redirect to login is happening
4. Verify backend logout endpoint (if used)

## Future Enhancements

### Potential Improvements
- Session refresh/renewal mechanism
- Encrypted localStorage storage
- Session timeout warnings
- Multiple session management
- Cross-tab session synchronization 