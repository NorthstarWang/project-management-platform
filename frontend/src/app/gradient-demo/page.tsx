'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { 
  Activity, 
  Users, 
  TrendingUp, 
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

export default function GradientDemoPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">Gradient Background Demo</h1>
          <p className="text-muted mt-2">
            This page demonstrates the subtle animated gradient background in dashboard pages.
            The gradient is extremely subtle with low opacity and heavy blur to maintain focus on content.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glassmorphism-dashboard">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$45,231.89</div>
              <p className="text-xs text-muted">
                +20.1% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="glassmorphism-dashboard">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2,350</div>
              <p className="text-xs text-muted">
                +180 new users this week
              </p>
            </CardContent>
          </Card>

          <Card className="glassmorphism-dashboard">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <Activity className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">124</div>
              <p className="text-xs text-muted">
                12 completed this month
              </p>
            </CardContent>
          </Card>

          <Card className="glassmorphism-dashboard">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
              <Calendar className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted">
                3 events today
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tasks Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glassmorphism-dashboard">
            <CardHeader>
              <CardTitle>Recent Tasks</CardTitle>
              <CardDescription>Your most recent task updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { title: "Update project documentation", status: "completed", time: "2 hours ago" },
                { title: "Review pull request #142", status: "in-progress", time: "4 hours ago" },
                { title: "Fix responsive design issues", status: "pending", time: "Yesterday" },
              ].map((task, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-card-content/50">
                  <div className="flex items-center gap-3">
                    {task.status === 'completed' && <CheckCircle className="h-5 w-5 text-success" />}
                    {task.status === 'in-progress' && <Clock className="h-5 w-5 text-warning" />}
                    {task.status === 'pending' && <AlertCircle className="h-5 w-5 text-muted" />}
                    <div>
                      <p className="font-medium text-primary">{task.title}</p>
                      <p className="text-sm text-muted">{task.time}</p>
                    </div>
                  </div>
                  <Badge variant={
                    task.status === 'completed' ? 'success' : 
                    task.status === 'in-progress' ? 'warning' : 
                    'secondary'
                  }>
                    {task.status.replace('-', ' ')}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glassmorphism-dashboard">
            <CardHeader>
              <CardTitle>Project Progress</CardTitle>
              <CardDescription>Overall progress across all projects</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { name: "Website Redesign", progress: 75, color: "bg-success" },
                { name: "Mobile App Development", progress: 45, color: "bg-info" },
                { name: "Database Migration", progress: 90, color: "bg-warning" },
                { name: "API Integration", progress: 30, color: "bg-accent" },
              ].map((project, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-primary">{project.name}</span>
                    <span className="text-sm text-muted">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Notice Card */}
        <Card className="glassmorphism-dashboard border-accent/20">
          <CardHeader>
            <CardTitle className="text-accent">About the Gradient Background</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-secondary">
              The animated gradient background in dashboard pages is designed to be extremely subtle. 
              It uses a combination of:
            </p>
            <ul className="mt-3 space-y-2 text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-accent">•</span>
                Very low opacity (3% in dark mode, 2% in light mode)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent">•</span>
                Heavy blur effect (backdrop-blur-3xl) to create a soft texture
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent">•</span>
                Slow, smooth animations that don't distract from content
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent">•</span>
                Enhanced glassmorphism on cards with increased backdrop blur
              </li>
            </ul>
            <div className="mt-4 flex gap-2">
              <Button size="sm">Learn More</Button>
              <Button size="sm" variant="outline">View Source</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}