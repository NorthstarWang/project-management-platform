'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/Select';
import { toast } from '@/components/ui/CustomToast';
import apiClient from '@/services/apiClient';

interface RegisterForm {
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  fullName: string;
  role: 'admin' | 'manager' | 'member';
}

// Helper function for analytics tracking
const trackEvent = async (actionType: string, payload: any) => {
  if (typeof window !== 'undefined') {
    try {
      const { track } = await import('@/services/analyticsLogger');
      track(actionType, payload);
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterForm>({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    fullName: '',
    role: 'member'
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: keyof RegisterForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleRoleChange = (value: string) => {
    setForm(prev => ({
      ...prev,
      role: value as 'admin' | 'manager' | 'member'
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!form.username || !form.password || !form.email || !form.fullName) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      // Register user
      await apiClient.post('/api/register', {
        username: form.username,
        password: form.password,
        email: form.email,
        full_name: form.fullName,
        role: form.role
      });

      // Track successful registration
      await trackEvent('USER_REGISTER', {
        username: form.username,
        email: form.email,
        role: form.role
      });

      toast.success('Registration successful! Please login with your new account.');

      // Redirect to login
      setTimeout(() => {
        router.push('/login');
      }, 1500);

    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-primary">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-secondary">
            Or{' '}
            <Link href="/login" className="font-medium text-accent hover:text-accent">
              sign in to your existing account
            </Link>
          </p>
        </div>

        <Card className="p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="fullName" className="text-primary">Full Name *</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={form.fullName}
                onChange={handleInputChange('fullName')}
                placeholder="Enter your full name"
                className="mt-1 w-full bg-input border-input text-input placeholder-input focus:border-input-focus"
              />
            </div>

            <div>
              <Label htmlFor="username" className="text-primary">Username *</Label>
              <Input
                id="username"
                name="username"
                type="text"
                required
                value={form.username}
                onChange={handleInputChange('username')}
                placeholder="Choose a username"
                className="mt-1 w-full bg-input border-input text-input placeholder-input focus:border-input-focus"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-primary">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleInputChange('email')}
                placeholder="Enter your email"
                className="mt-1 w-full bg-input border-input text-input placeholder-input focus:border-input-focus"
              />
            </div>

            <div>
              <Label htmlFor="role" className="text-primary">Role</Label>
              <Select
                value={form.role}
                onValueChange={handleRoleChange}
              >
                <SelectTrigger className="mt-1 w-full bg-input border-input text-input focus:border-input-focus">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="bg-dropdown border-dropdown shadow-dropdown">
                  <SelectItem value="member" className="text-dropdown-item hover:bg-dropdown-item-hover">Member</SelectItem>
                  <SelectItem value="manager" className="text-dropdown-item hover:bg-dropdown-item-hover">Manager</SelectItem>
                  <SelectItem value="admin" className="text-dropdown-item hover:bg-dropdown-item-hover">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="password" className="text-primary">Password *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={form.password}
                onChange={handleInputChange('password')}
                placeholder="Create a password"
                className="mt-1 w-full bg-input border-input text-input placeholder-input focus:border-input-focus"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-primary">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={form.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                placeholder="Confirm your password"
                className="mt-1 w-full bg-input border-input text-input placeholder-input focus:border-input-focus"
              />
            </div>

            <div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
} 