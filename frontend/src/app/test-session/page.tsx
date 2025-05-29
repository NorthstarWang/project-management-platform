'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import apiClient from '@/services/apiClient';
import { useAuth } from '@/hooks/useAuth';

export default function TestSessionPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [apiTestResult, setApiTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkSessionInfo();
  }, []);

  const checkSessionInfo = () => {
    const sessionId = apiClient.getSessionId();
    const storedSessionId = localStorage.getItem('session_id');
    const storedUser = localStorage.getItem('user');

    setSessionInfo({
      apiClientSessionId: sessionId,
      localStorageSessionId: storedSessionId,
      localStorageUser: storedUser ? JSON.parse(storedUser) : null,
      isAuthenticated,
      currentUser: user
    });
  };

  const testApiCall = async () => {
    setLoading(true);
    setApiTestResult('');

    try {
      const response = await apiClient.get('/api/users/me');
      setApiTestResult(`✅ API call successful! User: ${response.data.username} (${response.data.role})`);
    } catch (error: any) {
      setApiTestResult(`❌ API call failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshPage = () => {
    window.location.reload();
  };

  const clearSession = () => {
    apiClient.clearSession();
    checkSessionInfo();
    setApiTestResult('Session cleared');
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Session Persistence Test</h1>
      
      <div className="grid gap-6">
        {/* Session Information */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Session Information</h2>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Authentication Status:</strong> 
              <span className={`ml-2 px-2 py-1 rounded ${isAuthenticated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
              </span>
            </div>
            <div><strong>API Client Session ID:</strong> {sessionInfo?.apiClientSessionId || 'None'}</div>
            <div><strong>LocalStorage Session ID:</strong> {sessionInfo?.localStorageSessionId || 'None'}</div>
            <div><strong>Current User:</strong> {sessionInfo?.currentUser?.username || 'None'} ({sessionInfo?.currentUser?.role || 'N/A'})</div>
            <div><strong>Stored User:</strong> {sessionInfo?.localStorageUser?.username || 'None'}</div>
          </div>
        </Card>

        {/* API Test */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">API Test</h2>
          <div className="space-y-4">
            <Button 
              onClick={testApiCall} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Testing API Call...' : 'Test API Call (/api/users/me)'}
            </Button>
            {apiTestResult && (
              <div className="p-3 bg-gray-100 rounded text-sm">
                {apiTestResult}
              </div>
            )}
          </div>
        </Card>

        {/* Actions */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={refreshPage} variant="outline">
              Refresh Page
            </Button>
            <Button onClick={checkSessionInfo} variant="outline">
              Refresh Session Info
            </Button>
            <Button onClick={clearSession} variant="outline">
              Clear Session
            </Button>
            {isAuthenticated && (
              <Button onClick={logout} variant="destructive">
                Logout
              </Button>
            )}
          </div>
        </Card>

        {/* Instructions */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Test Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Login to the application first</li>
            <li>Navigate to this test page</li>
            <li>Verify that session information is displayed correctly</li>
            <li>Test the API call - it should succeed if session is valid</li>
            <li>Refresh the page - session should persist</li>
            <li>Close and reopen the browser tab - session should still persist</li>
            <li>Test logout functionality</li>
          </ol>
        </Card>
      </div>
    </div>
  );
} 