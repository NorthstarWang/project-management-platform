'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/CustomToast';
import authService from '@/services/authService';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';

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

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      await authService.waitForInitialization();
      if (authService.isAuthenticated()) {
        console.log('✅ User already authenticated, redirecting to dashboard');
        router.push('/dashboard');
      }
    };
    checkAuth();
  }, [router]);

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
      const result = await authService.login({
        username: form.username,
        password: form.password
      });

      if (result.success && result.user) {
        toast.success('Login successful! Redirecting...');
        
        // Immediate redirect to dashboard
        router.push('/dashboard');
      } else {
        toast.error(result.error || 'Login failed. Please try again.');
      }

    } catch (error: any) {
      console.error('❌ Login process failed:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BackgroundWrapper>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-primary">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-secondary">
            Or{' '}
            <Link href="/register" className="font-medium text-accent hover:text-accent">
              create a new account
            </Link>
          </p>
        </div>

        <Card className="p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="username" className="text-primary">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={form.username}
                onChange={handleInputChange('username')}
                placeholder="Enter your username"
                className="mt-1 w-full bg-input border-input text-input placeholder-input focus:border-input-focus"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-primary">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={handleInputChange('password')}
                placeholder="Enter your password"
                className="mt-1 w-full bg-input border-input text-input placeholder-input focus:border-input-focus"
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
                <div className="w-full border-t border-secondary" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 py-1 bg-white/60 dark:bg-black/60 backdrop-blur-md rounded-full text-muted gradient-border">Test Accounts</span>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm text-secondary">
              <div><strong className="text-primary">Admin:</strong> admin_alice / admin123</div>
              <div><strong className="text-primary">Team Manager:</strong> david_rodriguez / member123</div>
              <div><strong className="text-primary">Team Manager:</strong> sarah_johnson / member123</div>
              <div><strong className="text-primary">Member:</strong> frontend_emma / dev123</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
    </BackgroundWrapper>
  );
} 