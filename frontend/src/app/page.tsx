import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold text-primary mb-4">
            Project Management Platform
          </h1>
          <p className="text-xl text-secondary mb-8">
            A comprehensive project management and task tracking platform for teams
          </p>
        </div>

        <Card className="p-8">
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-primary">
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

            <div className="mt-8 pt-6 border-t border-secondary">
              <h3 className="text-lg font-medium text-primary mb-4">
                Test Accounts
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-card-content p-4 rounded-lg border border-secondary">
                  <div className="font-semibold text-accent">Admin</div>
                  <div className="text-secondary">admin_alice</div>
                  <div className="text-secondary">admin123</div>
                </div>
                <div className="bg-card-content p-4 rounded-lg border border-secondary">
                  <div className="font-semibold text-success">Manager</div>
                  <div className="text-secondary">manager_david</div>
                  <div className="text-secondary">manager123</div>
                </div>
                <div className="bg-card-content p-4 rounded-lg border border-secondary">
                  <div className="font-semibold text-info">Member</div>
                  <div className="text-secondary">frontend_emma</div>
                  <div className="text-secondary">dev123</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
