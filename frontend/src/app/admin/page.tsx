"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import { AlertCircle, CheckCircle, Clock, Users, Plus, Crown, Building, Shield, ArrowRight, Activity, Key, FileText } from 'lucide-react';
import apiClient from '@/services/apiClient';

interface TeamCreationRequest {
  id: string;
  requester: {
    id: string;
    full_name: string;
    email: string;
    username: string;
  };
  team_name: string;
  team_description: string;
  message?: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: number;
  reviewed_at?: number;
  reviewer?: {
    id: string;
    full_name: string;
  };
  response_message?: string;
}

interface Team {
  id: string;
  name: string;
  description: string;
  created_at: number;
  member_count: number;
  managers: Array<{
    id: string;
    full_name: string;
    role: string;
  }>;
}

interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [teamCreationRequests, setTeamCreationRequests] = useState<TeamCreationRequest[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('requests');

  // Create team dialog state
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState('');

  // Request handling dialog state
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TeamCreationRequest | null>(null);
  const [requestAction, setRequestAction] = useState<'approve' | 'deny'>('approve');
  const [requestResponse, setRequestResponse] = useState('');
  const [assignedManagerId, setAssignedManagerId] = useState('');

  useEffect(() => {
    console.log('Admin page - Auth loading:', authLoading, 'User:', user);
    
    if (authLoading) return;
    
    if (!user) {
      console.log('Admin page - No user found, redirecting to login');
      router.push('/login');
      return;
    }
    
    console.log('Admin page - User role:', user.role);
    if (user.role !== 'admin') {
      console.log('Admin page - User is not admin, redirecting to dashboard');
      router.push('/dashboard');
      return;
    }

    console.log('Admin page - User is admin, fetching data');
    fetchData();
  }, [user, router, authLoading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch team creation requests
      const requestsResponse = await apiClient.get('/api/teams/creation-requests');
      setTeamCreationRequests(requestsResponse.data);

      // Fetch all teams
      const teamsResponse = await apiClient.get('/api/teams');
      setTeams(teamsResponse.data);

      // Fetch all users for manager assignment
      const usersResponse = await apiClient.get('/api/users');
      setUsers(usersResponse.data.filter((u: User) => u.role !== 'admin')); // Exclude admins from manager selection
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async () => {
    if (!selectedRequest) return;

    try {
      await apiClient.put(`/api/teams/creation-requests/${selectedRequest.id}`, {
        action: requestAction,
        assigned_manager_id: requestAction === 'approve' ? (assignedManagerId || selectedRequest.requester.id) : undefined,
        message: requestResponse
      });

      await fetchData();
      setShowRequestDialog(false);
      setSelectedRequest(null);
      setRequestResponse('');
      setAssignedManagerId('');
    } catch (error) {
      console.error('Error handling request:', error);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !selectedManagerId) return;

    try {
      await apiClient.post('/api/teams', {
        name: newTeamName,
        description: newTeamDescription,
        manager_id: selectedManagerId
      });

      await fetchData();
      setNewTeamName('');
      setNewTeamDescription('');
      setSelectedManagerId('');
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'denied':
        return <Badge variant="error"><AlertCircle className="w-3 h-3 mr-1" />Denied</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
            <p className="mt-4 text-muted">Loading admin panel...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const pendingRequests = teamCreationRequests.filter(req => req.status === 'pending');

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Shield className="h-8 w-8 text-accent" />
          Admin Dashboard
        </h1>
        <p className="text-muted mt-2">Manage teams, users, and team creation requests</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted">Total Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{teams.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{pendingRequests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted">Active Managers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {teams.reduce((acc, team) => acc + team.managers.length, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/teams')}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Team Management
              </span>
              <ArrowRight className="h-5 w-5 text-muted" />
            </CardTitle>
            <CardDescription>
              Full control over teams, members, and roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted">Create teams, assign managers, add/remove members, and disband teams</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/permissions')}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Permissions Management
              </span>
              <ArrowRight className="h-5 w-5 text-muted" />
            </CardTitle>
            <CardDescription>
              Manage roles and access controls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted">Configure role-based permissions, manage user access, and define security policies</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/audit')}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Audit & Compliance
              </span>
              <ArrowRight className="h-5 w-5 text-muted" />
            </CardTitle>
            <CardDescription>
              Monitor system activity and compliance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted">View audit logs, track security events, and manage compliance requirements</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Analytics
              </span>
              <Badge variant="secondary">Coming Soon</Badge>
            </CardTitle>
            <CardDescription>
              View system-wide analytics and reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted">Track user activity, team performance, and system usage</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Team Requests
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Teams Management
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Team
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-primary">Team Creation Requests</h2>
          </div>

          {teamCreationRequests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <AlertCircle className="w-12 h-12 text-muted mx-auto mb-4" />
                <p className="text-muted">No team creation requests found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {teamCreationRequests.map((request) => (
                <Card key={request.id} className={request.status === 'pending' ? 'border-warning bg-warning' : ''}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{request.team_name}</CardTitle>
                        <CardDescription className="mt-1">
                          Requested by {request.requester.full_name} ({request.requester.email})
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(request.status)}
                        {request.status === 'pending' && (
                          <Button 
                            size="sm" 
                            onClick={() => {
                              setSelectedRequest(request);
                              setAssignedManagerId(request.requester.id);
                              setShowRequestDialog(true);
                            }}
                          >
                            Review
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-secondary mb-4">{request.team_description}</p>
                    {request.message && (
                      <div className="bg-card-content p-3 rounded-lg mb-4">
                        <p className="text-sm text-muted mb-1">Message from requester:</p>
                        <p className="text-primary">{request.message}</p>
                      </div>
                    )}
                    <div className="text-sm text-muted">
                      <p>Requested: {formatDate(request.created_at)}</p>
                      {request.reviewed_at && (
                        <p>Reviewed: {formatDate(request.reviewed_at)} by {request.reviewer?.full_name}</p>
                      )}
                    </div>
                    {request.response_message && (
                      <div className="mt-3 bg-info/10 p-3 rounded-lg">
                        <p className="text-sm text-info mb-1">Admin response:</p>
                        <p className="text-info">{request.response_message}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-primary">Teams Management</h2>
            <p className="text-muted">{teams.length} teams total</p>
          </div>

          <div className="grid gap-4">
            {teams.map((team) => (
              <Card key={team.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <CardDescription className="mt-1">{team.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <Users className="w-4 h-4" />
                      {team.member_count} members
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {team.managers.map((manager) => (
                      <Badge key={manager.id} variant="secondary" className="flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        {manager.full_name} ({manager.role})
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-4 text-sm text-muted">
                    Created: {formatDate(team.created_at)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Team</CardTitle>
              <CardDescription>Create a team directly without going through the request process</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="teamName">Team Name</Label>
                <Input
                  id="teamName"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Enter team name"
                />
              </div>
              <div>
                <Label htmlFor="teamDescription">Description</Label>
                <Textarea
                  id="teamDescription"
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  placeholder="Enter team description"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="manager">Team Manager</Label>
                <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleCreateTeam} 
                disabled={!newTeamName.trim() || !selectedManagerId}
                className="w-full"
              >
                Create Team
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Request Review Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Review Team Creation Request</DialogTitle>
            <DialogDescription>
              {selectedRequest ? `Request to create "${selectedRequest.team_name}"` : ''}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="action">Action</Label>
              <Select value={requestAction} onValueChange={(value: 'approve' | 'deny') => setRequestAction(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve">Approve</SelectItem>
                  <SelectItem value="deny">Deny</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {requestAction === 'approve' && (
              <div>
                <Label htmlFor="assignedManager">Assigned Manager</Label>
                <Select value={assignedManagerId} onValueChange={setAssignedManagerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedRequest && (
                      <SelectItem value={selectedRequest.requester.id}>
                        {selectedRequest.requester.full_name} (Requester)
                      </SelectItem>
                    )}
                    {users.filter(u => u.id !== selectedRequest?.requester.id).map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="response">Response Message (Optional)</Label>
              <Textarea
                id="response"
                value={requestResponse}
                onChange={(e) => setRequestResponse(e.target.value)}
                placeholder="Add a message to the requester..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequestAction}>
              {requestAction === 'approve' ? 'Approve' : 'Deny'} Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
} 