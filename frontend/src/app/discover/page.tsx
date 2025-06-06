'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { 
  Search,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  UserPlus,
  Mail,
  Plus,
  LogOut,
  Crown,
  Settings
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import { toast } from '@/components/ui/CustomToast';
import { track } from '@/services/analyticsLogger';
import { useAuth } from '@/contexts/AuthContext';

interface Team {
  id: string;
  name: string;
  description: string;
  member_count: number;
  managers: Array<{
    id: string;
    full_name: string;
    role: string;
  }>;
  has_pending_request: boolean;
  has_pending_invitation: boolean;
}

interface TeamRequest {
  id: string;
  team_id: string;
  message?: string;
  status: string;
  created_at: string;
  team: {
    id: string;
    name: string;
    description: string;
  };
}

interface TeamInvitation {
  id: string;
  team_id: string;
  message?: string;
  status: string;
  created_at: string;
  team: {
    id: string;
    name: string;
    description: string;
  };
  inviter: {
    id: string;
    full_name: string;
  };
}

interface UserTeam {
  id: string;
  name: string;
  description: string;
  user_role: string;
  member_count: number;
  created_at: number;
}

interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
}

export default function DiscoverPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [myTeams, setMyTeams] = useState<UserTeam[]>([]);
  const [myRequests, setMyRequests] = useState<TeamRequest[]>([]);
  const [myInvitations, setMyInvitations] = useState<TeamInvitation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'discover' | 'requests' | 'invitations' | 'create' | 'manage'>('discover');

  // Team creation dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [newTeamMessage, setNewTeamMessage] = useState('');

  // Team quit dialog state
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<UserTeam | null>(null);
  const [quitAction, setQuitAction] = useState<'reassign' | 'disband'>('reassign');
  const [newManagerId, setNewManagerId] = useState('');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const loadData = useCallback(async () => {
    if (!user || !isAuthenticated) {
      console.log('❌ Cannot load data - user not authenticated');
      return;
    }

    try {
      setLoading(true);
      
      track('DATA_LOAD_START', {
        text: 'Starting to load discover page data',
        page: 'discover',
        data_types: ['teams', 'requests', 'invitations', 'user_teams']
      });

      console.log('🔄 Loading discover data...');

      // Load discoverable teams, user requests, invitations, and user's teams in parallel
      const [teamsResponse, requestsResponse, invitationsResponse, userTeamsResponse, usersResponse] = await Promise.all([
        apiClient.get('/api/teams/discover'),
        apiClient.get('/api/users/me/team-requests'),
        apiClient.get('/api/users/me/team-invitations'),
        apiClient.get('/api/teams'),
        apiClient.get('/api/users')
      ]);

      setTeams(teamsResponse.data);
      setMyRequests(requestsResponse.data);
      setMyInvitations(invitationsResponse.data);
      setMyTeams(userTeamsResponse.data);
      setUsers(usersResponse.data.filter((u: User) => u.id !== user.id)); // Exclude current user

      console.log('✅ Discover data loaded successfully');

      track('DATA_LOAD_SUCCESS', {
        text: 'Successfully loaded discover page data',
        page: 'discover',
        teams_count: teamsResponse.data.length,
        requests_count: requestsResponse.data.length,
        invitations_count: invitationsResponse.data.length,
        user_teams_count: userTeamsResponse.data.length
      });

    } catch (error: any) {
      console.error('Failed to load discover data:', error);
      toast.error('Failed to load teams and requests');
      
      track('DATA_LOAD_ERROR', {
        text: 'Failed to load discover page data',
        page: 'discover',
        error: error.message || 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated]);

  // Load data when user is authenticated
  useEffect(() => {
    if (user && isAuthenticated) {
      // Log page view
      track('PAGE_VIEW', {
        text: 'User viewed discover teams page',
        page_name: 'discover',
        page_url: '/discover',
        user_id: user.id,
        user_role: user.role
      });
      
      // Load data
      loadData();
    }
  }, [user, isAuthenticated, loadData]);

  const handleJoinRequest = async (teamId: string, message?: string) => {
    try {
      await apiClient.post(`/api/teams/${teamId}/join-requests`, {
        team_id: teamId,
        message: message
      });

      track('TEAM_JOIN_REQUEST', {
        text: 'User sent team join request',
        team_id: teamId,
        message_provided: !!message
      });

      toast.success('Join request sent successfully!');
      
      // Reload data to update the UI
      await loadData();
      
    } catch (error: any) {
      console.error('Failed to send join request:', error);
      toast.error(error.response?.data?.detail || 'Failed to send join request');
    }
  };

  const handleCreateTeamRequest = async () => {
    if (!newTeamName.trim()) return;

    try {
      await apiClient.post('/api/teams/request-creation', {
        name: newTeamName,
        description: newTeamDescription,
        message: newTeamMessage
      });

      track('TEAM_CREATION_REQUEST', {
        text: 'User requested new team creation',
        team_name: newTeamName,
        message_provided: !!newTeamMessage
      });

      toast.success('Team creation request sent successfully!');
      
      setShowCreateDialog(false);
      setNewTeamName('');
      setNewTeamDescription('');
      setNewTeamMessage('');
      
      // Reload data to update the UI
      await loadData();
      
    } catch (error: any) {
      console.error('Failed to send team creation request:', error);
      toast.error(error.response?.data?.detail || 'Failed to send team creation request');
    }
  };

  const handleQuitTeam = async () => {
    if (!selectedTeam) return;

    try {
      await apiClient.post(`/api/teams/${selectedTeam.id}/quit`, {
        reassignment: {
          new_manager_id: quitAction === 'reassign' ? newManagerId : null,
          message: quitAction === 'disband' ? 'Team disbanded by manager' : 'Manager reassigned'
        }
      });

      track('TEAM_QUIT', {
        text: `Manager quit team with ${quitAction} action`,
        team_id: selectedTeam.id,
        action: quitAction,
        new_manager_id: quitAction === 'reassign' ? newManagerId : null
      });

      toast.success(quitAction === 'reassign' ? 'Manager reassigned successfully!' : 'Team disbanded successfully!');
      
      setShowQuitDialog(false);
      setSelectedTeam(null);
      setQuitAction('reassign');
      setNewManagerId('');
      
      // Reload data to update the UI
      await loadData();
      
    } catch (error: any) {
      console.error('Failed to quit team:', error);
      toast.error(error.response?.data?.detail || 'Failed to quit team');
    }
  };

  const handleInvitationResponse = async (invitationId: string, action: 'accept' | 'decline') => {
    try {
      await apiClient.put(`/api/team-invitations/${invitationId}`, {
        action: action,
        message: null
      });

      track('TEAM_INVITATION_RESPONSE', {
        text: `User ${action}ed team invitation`,
        invitation_id: invitationId,
        action: action
      });

      toast.success(`Invitation ${action}ed successfully!`);
      
      // Reload data to update the UI
      await loadData();
      
    } catch (error: any) {
      console.error('Failed to respond to invitation:', error);
      toast.error(error.response?.data?.detail || 'Failed to respond to invitation');
    }
  };

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays === 0) {
      if (diffHours === 0) return 'Just now';
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const filteredTeams = teams.filter(team => 
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const managedTeams = myTeams.filter(team => team.user_role === 'manager');

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-card rounded-lg shadow-card p-6 border border-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Search className="h-8 w-8 text-accent" />
              <div>
                <h1 className="text-2xl font-bold text-primary">Discover Teams</h1>
                <p className="text-secondary mt-1">
                  Find teams to join, manage your teams, or request to create new ones
                </p>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex items-center space-x-1 bg-surface rounded-lg p-1">
              <Button
                variant={activeTab === 'discover' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('discover')}
                data-testid="discover-tab"
              >
                <Search className="h-4 w-4 mr-2" />
                Discover
              </Button>
              <Button
                variant={activeTab === 'requests' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('requests')}
                data-testid="requests-tab"
              >
                <Clock className="h-4 w-4 mr-2" />
                My Requests
                {myRequests.length > 0 && (
                  <Badge variant="secondary" size="sm" className="ml-2">
                    {myRequests.length}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeTab === 'invitations' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('invitations')}
                data-testid="invitations-tab"
              >
                <Mail className="h-4 w-4 mr-2" />
                Invitations
                {myInvitations.length > 0 && (
                  <Badge variant="secondary" size="sm" className="ml-2">
                    {myInvitations.length}
                  </Badge>
                )}
              </Button>
              {user.role !== 'admin' && (
                <Button
                  variant={activeTab === 'create' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('create')}
                  data-testid="create-tab"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Request Team
                </Button>
              )}
              {managedTeams.length > 0 && (
                <Button
                  variant={activeTab === 'manage' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('manage')}
                  data-testid="manage-tab"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Teams
                  <Badge variant="secondary" size="sm" className="ml-2">
                    {managedTeams.length}
                  </Badge>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar (only for discover tab) */}
        {activeTab === 'discover' && (
          <Card className="p-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Search teams by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                  leftIcon={<Search className="h-4 w-4" />}
                />
              </div>
              <div className="text-sm text-secondary">
                {filteredTeams.length} team{filteredTeams.length !== 1 ? 's' : ''} found
              </div>
            </div>
          </Card>
        )}

        {/* Content based on active tab */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-48 bg-surface rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Discover Teams Tab */}
            {activeTab === 'discover' && (
              <div className="space-y-6">
                {filteredTeams.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTeams.map((team) => (
                      <Card
                        key={team.id}
                        className="p-6 hover:shadow-md transition-shadow"
                        data-testid={`team-card-${team.id}`}
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-primary text-lg">
                                {team.name}
                              </h3>
                              <p className="text-secondary text-sm mt-1 line-clamp-2">
                                {team.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-sm text-muted">
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4" />
                              <span>{team.member_count} member{team.member_count !== 1 ? 's' : ''}</span>
                            </div>
                          </div>

                          {/* Managers */}
                          {team.managers.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted uppercase tracking-wide">
                                Managers
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {team.managers.map((manager) => (
                                  <div key={manager.id} className="flex items-center space-x-2">
                                    <Avatar size="xs" name={manager.full_name} />
                                    <span className="text-xs text-secondary">
                                      {manager.full_name}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action Button */}
                          <div className="pt-2">
                            {team.has_pending_request ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                disabled
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                Request Pending
                              </Button>
                            ) : team.has_pending_invitation ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-accent"
                                disabled
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                Invitation Pending
                              </Button>
                            ) : (
                              <Button
                                variant="primary"
                                size="sm"
                                className="w-full"
                                onClick={() => handleJoinRequest(team.id)}
                              >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Request to Join
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-12">
                    <div className="text-center">
                      <Search className="mx-auto h-12 w-12 text-muted" />
                      <h3 className="mt-2 text-sm font-medium text-primary">
                        {searchQuery ? 'No teams found' : 'No teams available'}
                      </h3>
                      <p className="mt-1 text-sm text-muted">
                        {searchQuery 
                          ? 'Try adjusting your search terms.'
                          : 'There are no teams available for you to join at the moment.'
                        }
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Request Team Creation Tab */}
            {activeTab === 'create' && user.role !== 'admin' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-primary">Request Team Creation</h3>
                      <p className="text-secondary text-sm mt-1">
                        Submit a request to create a new team. An admin will review your request.
                      </p>
                    </div>
                    
                    <Button
                      variant="primary"
                      onClick={() => setShowCreateDialog(true)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Team Request
                    </Button>
                  </div>
                </Card>

                {/* Current Teams */}
                {myTeams.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary">Your Teams</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myTeams.map((team) => (
                        <Card key={team.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-primary">{team.name}</h4>
                              <p className="text-secondary text-sm">{team.description}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                                <span>{team.member_count} members</span>
                                <span>Created: {formatDate(team.created_at)}</span>
                              </div>
                            </div>
                            <Badge 
                              variant={team.user_role === 'manager' ? 'default' : 'secondary'}
                              className="flex items-center gap-1"
                            >
                              {team.user_role === 'manager' && <Crown className="h-3 w-3" />}
                              {team.user_role.charAt(0).toUpperCase() + team.user_role.slice(1)}
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Manage Teams Tab */}
            {activeTab === 'manage' && managedTeams.length > 0 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-primary">Teams You Manage</h3>
                  <p className="text-secondary text-sm mt-1">
                    Manage teams where you are the manager. You can reassign management or disband teams.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {managedTeams.map((team) => (
                    <Card key={team.id} className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-primary flex items-center gap-2">
                              <Crown className="h-4 w-4 text-warning" />
                              {team.name}
                            </h4>
                            <p className="text-secondary text-sm mt-1">{team.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                              <span>{team.member_count} members</span>
                              <span>Created: {formatDate(team.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-error border-error hover:bg-error-disabled"
                            onClick={() => {
                              setSelectedTeam(team);
                              setShowQuitDialog(true);
                            }}
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            Quit as Manager
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* My Requests Tab */}
            {activeTab === 'requests' && (
              <div className="space-y-4">
                {myRequests.length > 0 ? (
                  myRequests.map((request) => (
                    <Card
                      key={request.id}
                      className="p-6"
                      data-testid={`request-card-${request.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-primary">
                            {request.team.name}
                          </h3>
                          <p className="text-secondary text-sm mt-1">
                            {request.team.description}
                          </p>
                          {request.message && (
                            <div className="mt-3 p-3 bg-surface rounded-md">
                              <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">
                                Your Message
                              </p>
                              <p className="text-sm text-secondary">
                                {request.message}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="ml-4 text-right">
                          <Badge 
                            variant={request.status === 'pending' ? 'warning' : 
                                   request.status === 'approved' ? 'success' : 'destructive'}
                            size="sm"
                          >
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                          <p className="text-xs text-muted mt-1">
                            {formatRelativeDate(request.created_at)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <Card className="p-12">
                    <div className="text-center">
                      <Clock className="mx-auto h-12 w-12 text-muted" />
                      <h3 className="mt-2 text-sm font-medium text-primary">No join requests</h3>
                      <p className="mt-1 text-sm text-muted">
                        You haven&apos;t sent any team join requests yet.
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Invitations Tab */}
            {activeTab === 'invitations' && (
              <div className="space-y-4">
                {myInvitations.length > 0 ? (
                  myInvitations.map((invitation) => (
                    <Card
                      key={invitation.id}
                      className="p-6 border-accent"
                      data-testid={`invitation-card-${invitation.id}`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-primary">
                              {invitation.team.name}
                            </h3>
                            <p className="text-secondary text-sm mt-1">
                              {invitation.team.description}
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Avatar size="xs" name={invitation.inviter.full_name} />
                              <span className="text-sm text-secondary">
                                Invited by {invitation.inviter.full_name}
                              </span>
                            </div>
                            {invitation.message && (
                              <div className="mt-3 p-3 bg-surface rounded-md">
                                <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">
                                  Message
                                </p>
                                <p className="text-sm text-secondary">
                                  {invitation.message}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="ml-4 text-right">
                            <p className="text-xs text-muted">
                              {formatRelativeDate(invitation.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <Button
                            variant="primary"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleInvitationResponse(invitation.id, 'accept')}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleInvitationResponse(invitation.id, 'decline')}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <Card className="p-12">
                    <div className="text-center">
                      <Mail className="mx-auto h-12 w-12 text-muted" />
                      <h3 className="mt-2 text-sm font-medium text-primary">No invitations</h3>
                      <p className="mt-1 text-sm text-muted">
                        You don&apos;t have any pending team invitations.
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </>
        )}

        {/* Team Creation Request Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Request Team Creation</DialogTitle>
              <DialogDescription>
                Submit a request to create a new team. An admin will review and approve your request.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
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
                <textarea
                  id="teamDescription"
                  value={newTeamDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewTeamDescription(e.target.value)}
                  placeholder="Describe the purpose and goals of this team"
                  rows={3}
                  className="w-full p-2 border border-input rounded-md focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                />
              </div>
              
              <div>
                <Label htmlFor="teamMessage">Message to Admin (Optional)</Label>
                <textarea
                  id="teamMessage"
                  value={newTeamMessage}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewTeamMessage(e.target.value)}
                  placeholder="Explain why this team should be created..."
                  rows={3}
                  className="w-full p-2 border border-input rounded-md focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTeamRequest} disabled={!newTeamName.trim()}>
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Team Quit Dialog */}
        <Dialog open={showQuitDialog} onOpenChange={setShowQuitDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Quit Team Management</DialogTitle>
              <DialogDescription>
                {selectedTeam ? `What would you like to do with "${selectedTeam.name}"?` : ''}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="quitAction">Action</Label>
                <Select value={quitAction} onValueChange={(value: 'reassign' | 'disband') => setQuitAction(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reassign">Reassign to another member</SelectItem>
                    <SelectItem value="disband">Disband the team</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {quitAction === 'reassign' && (
                <div>
                  <Label htmlFor="newManager">New Manager</Label>
                  <Select value={newManagerId} onValueChange={setNewManagerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a new manager" />
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
              )}

              {quitAction === 'disband' && (
                <div className="p-4 bg-error-disabled border border-error rounded-md">
                  <p className="text-sm text-error">
                    <strong>Warning:</strong> Disbanding the team will remove all members and archive associated projects. This action cannot be undone.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQuitDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleQuitTeam} 
                disabled={quitAction === 'reassign' && !newManagerId}
                variant={quitAction === 'disband' ? 'destructive' : 'primary'}
              >
                {quitAction === 'reassign' ? 'Reassign Manager' : 'Disband Team'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
} 