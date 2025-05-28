'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/CustomToast';
import apiClient from '@/services/apiClient';
import { track } from '@/services/analyticsLogger';

interface LoginForm {
  username: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<LoginForm>({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: keyof LoginForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.username || !form.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      // Initialize session first
      const sessionResponse = await apiClient.post('/_synthetic/new_session');
      const sessionId = sessionResponse.data.session_id;
      
      // Store session ID for future requests
      localStorage.setItem('session_id', sessionId);

      // Attempt login
      const loginResponse = await apiClient.post(`/api/login?session_id=${sessionId}`, {
        username: form.username,
        password: form.password,
        email: '', // Required by backend but not used for login
        full_name: '', // Required by backend but not used for login
        role: 'member' // Required by backend but not used for login
      });

      // Set user ID header for future API calls
      const userData = loginResponse.data;
      apiClient.setUserIdHeader(userData.id);
      
      // Store user data
      localStorage.setItem('user', JSON.stringify(userData));

      // Track successful login
      track('USER_LOGIN', {
        username: form.username,
        user_id: userData.id,
        role: userData.role
      });

      toast.success('Login successful! Redirecting...');

      // Redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);

    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
              create a new account
            </Link>
          </p>
        </div>

        <Card className="p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                required
                value={form.username}
                onChange={handleInputChange('username')}
                placeholder="Enter your username"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={form.password}
                onChange={handleInputChange('password')}
                placeholder="Enter your password"
                className="mt-1"
              />
            </div>

            <div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Test Accounts</span>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <div><strong>Admin:</strong> admin_alice / admin123</div>
              <div><strong>Manager:</strong> manager_david / manager123</div>
              <div><strong>Member:</strong> frontend_emma / dev123</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 