'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import apiClient from '@/services/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { logAuthDebugInfo, testApiAuthentication, validateAuthSetup, getAuthDebugInfo } from '@/utils/authDebug';

export default function TestSessionPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [apiTestResult, setApiTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [authValidation, setAuthValidation] = useState<any>(null);

  useEffect(() => {
    checkSessionInfo();
    validateAuth();
  }, []);

  const checkSessionInfo = () => {
    const debugInfo = getAuthDebugInfo();
    setSessionInfo(debugInfo);
    
    // Log debug info to console
    logAuthDebugInfo('Test Session Page');
  };

  const validateAuth = () => {
    const validation = validateAuthSetup();
    setAuthValidation(validation);
    
    if (!validation.valid) {
      console.warn('❌ Authentication setup issues:', validation.issues);
    } else {
      console.log('✅ Authentication setup is valid');
    }
  };

  const testApiCall = async () => {
    setLoading(true);
    setApiTestResult('');

    const result = await testApiAuthentication();
    
    if (result.success) {
      setApiTestResult(`✅ API call successful! User: ${result.data.username} (${result.data.role})`);
    } else {
      setApiTestResult(`❌ API call failed: ${result.error || 'Unknown error'}`);
    }
    
    setLoading(false);
  };

  const refreshPage = () => {
    window.location.reload();
  };

  const clearSession = () => {
    apiClient.clearSession();
    checkSessionInfo();
    validateAuth();
    setApiTestResult('Session cleared');
  };

  const debugAuth = () => {
    logAuthDebugInfo('Manual Debug Check');
    checkSessionInfo();
    validateAuth();
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Session Persistence Test</h1>
      
      <div className="grid gap-6">
        {/* Authentication Validation */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Validation</h2>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Overall Status:</strong> 
              <span className={`ml-2 px-2 py-1 rounded ${authValidation?.valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {authValidation?.valid ? 'Valid' : 'Issues Found'}
              </span>
            </div>
            {authValidation?.issues && authValidation.issues.length > 0 && (
              <div>
                <strong>Issues:</strong>
                <ul className="list-disc list-inside ml-4 mt-1">
                  {authValidation.issues.map((issue: string, index: number) => (
                    <li key={index} className="text-red-600">{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>

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
            <div>
              <strong>API Client Configured:</strong> 
              <span className={`ml-2 px-2 py-1 rounded ${sessionInfo?.apiClientConfigured ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {sessionInfo?.apiClientConfigured ? 'Yes' : 'No'}
              </span>
            </div>
            <div><strong>Session ID in localStorage:</strong> {sessionInfo?.hasSessionId ? '✅' : '❌'} {sessionInfo?.sessionId || 'None'}</div>
            <div><strong>User data in localStorage:</strong> {sessionInfo?.hasUserData ? '✅' : '❌'} {sessionInfo?.userData?.username || 'None'}</div>
            <div><strong>API client session ID:</strong> {sessionInfo?.sessionId ? '✅' : '❌'} {apiClient.getSessionId() || 'None'}</div>
            <div><strong>API client user ID header:</strong> {sessionInfo?.hasUserIdHeader ? '✅' : '❌'}</div>
            <div><strong>Current User (useAuth):</strong> {user?.username || 'None'} ({user?.role || 'N/A'})</div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button onClick={refreshPage} variant="outline">
              Refresh Page
            </Button>
            <Button onClick={debugAuth} variant="outline">
              Debug Auth
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
            <li>Check that "Authentication Validation" shows "Valid"</li>
            <li>Verify that session information shows all green checkmarks</li>
            <li>Test the API call - it should succeed if session is valid</li>
            <li>Refresh the page - session should persist</li>
            <li>Close and reopen the browser tab - session should still persist</li>
            <li>Use "Debug Auth" to check authentication status in console</li>
            <li>Test logout functionality</li>
          </ol>
        </Card>
      </div>
    </div>
  );
} 