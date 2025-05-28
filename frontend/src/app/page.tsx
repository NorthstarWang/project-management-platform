import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Project Management Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            A comprehensive project management and task tracking platform for teams
          </p>
        </div>

        <Card className="p-8">
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Get Started
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto">
                  Sign In
                </Button>
              </Link>
              
              <Link href="/register">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Create Account
                </Button>
              </Link>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Test Accounts
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-semibold text-blue-600">Admin</div>
                  <div className="text-gray-600">admin_alice</div>
                  <div className="text-gray-600">admin123</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-semibold text-green-600">Manager</div>
                  <div className="text-gray-600">manager_david</div>
                  <div className="text-gray-600">manager123</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-semibold text-purple-600">Member</div>
                  <div className="text-gray-600">frontend_emma</div>
                  <div className="text-gray-600">dev123</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
