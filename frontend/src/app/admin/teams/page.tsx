'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Avatar } from '@/components/ui/Avatar';
import { toast } from '@/components/ui/CustomToast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { 
  Users, Plus, Crown, UserPlus, UserMinus, Edit, Trash2, 
  Search, Shield, Building, ChevronRight, AlertTriangle
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
  team_ids?: string[];
}

interface Team {
  id: string;
  name: string;
  description: string;
  created_at: number;
  icon?: string;
}

interface TeamMember {
  user_id: string;
  team_id: string;
  role: 'manager' | 'member';
  joined_at: number;
  user?: User;
}

interface TeamDetails extends Team {
  members: TeamMember[];
  managers: User[];
  member_count: number;
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<TeamDetails[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamDetails | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Create team dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState('');
  
  // User search states
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Add member dialog
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [addMemberSearchQuery, setAddMemberSearchQuery] = useState('');
  const [addMemberSearchResults, setAddMemberSearchResults] = useState<User[]>([]);
  
  // Switch manager dialog
  const [showSwitchManagerDialog, setShowSwitchManagerDialog] = useState(false);
  const [currentManagerId, setCurrentManagerId] = useState('');
  const [newManagerId, setNewManagerId] = useState('');
  
  // Disband confirmation
  const [showDisbandConfirm, setShowDisbandConfirm] = useState(false);
  const [teamToDisband, setTeamToDisband] = useState<TeamDetails | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.role !== 'admin') {
        window.location.href = '/dashboard';
        return;
      }
    } else {
      window.location.href = '/login';
      return;
    }
    
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all teams - for admin, get all teams not just user's teams
      const teamsResponse = await apiClient.get('/api/teams');
      const teamsData = teamsResponse.data;
      
      // Fetch detailed info for each team
      const detailedTeams = await Promise.all(
        teamsData.map(async (team: Team) => {
          try {
            const membersResponse = await apiClient.get(`/api/teams/${team.id}/members`);
            const members = membersResponse.data;
            const managers = members
              .filter((m: TeamMember) => m.role === 'manager')
              .map((m: TeamMember) => m.user)
              .filter(Boolean);
            
            return {
              ...team,
              members,
              managers,
              member_count: members.length
            };
          } catch (error) {
            console.error(`Failed to fetch members for team ${team.id}:`, error);
            return {
              ...team,
              members: [],
              managers: [],
              member_count: 0
            };
          }
        })
      );
      
      setTeams(detailedTeams);
      
      // Fetch all users
      const usersResponse = await apiClient.get('/api/users');
      setUsers(usersResponse.data.filter((u: User) => u.role !== 'admin'));
      
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load teams data');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string, forAddMember: boolean = false) => {
    if (!query.trim()) {
      if (forAddMember) {
        setAddMemberSearchResults([]);
      } else {
        setUserSearchResults([]);
      }
      return;
    }

    try {
      setIsSearching(true);
      const response = await apiClient.get(`/api/users/search?q=${encodeURIComponent(query)}`);
      const results = response.data.filter((u: User) => u.role !== 'admin');
      
      if (forAddMember) {
        // Filter out users already in the team
        const existingMemberIds = selectedTeam?.members.map(m => m.user_id) || [];
        setAddMemberSearchResults(results.filter((u: User) => !existingMemberIds.includes(u.id)));
      } else {
        setUserSearchResults(results);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const createTeam = async () => {
    if (!newTeamName.trim() || !selectedManagerId) return;

    try {
      const response = await apiClient.post('/api/teams', {
        name: newTeamName,
        description: newTeamDescription
      });
      
      const newTeam = response.data;
      
      // Add the manager
      await apiClient.post(`/api/teams/${newTeam.id}/members`, {
        user_id: selectedManagerId,
        role: 'manager'
      });
      
      await fetchData();
      setShowCreateDialog(false);
      setNewTeamName('');
      setNewTeamDescription('');
      setSelectedManagerId('');
      setUserSearchQuery('');
      toast.success('Team created successfully');
    } catch (error) {
      console.error('Failed to create team:', error);
      toast.error('Failed to create team');
    }
  };

  const addMemberToTeam = async (userId: string, role: 'member' | 'manager' = 'member') => {
    if (!selectedTeam) return;

    try {
      await apiClient.post(`/api/teams/${selectedTeam.id}/members`, {
        user_id: userId,
        role
      });
      
      await fetchData();
      setShowAddMemberDialog(false);
      setAddMemberSearchQuery('');
      toast.success(`${role === 'manager' ? 'Manager' : 'Member'} added successfully`);
    } catch (error) {
      console.error('Failed to add member:', error);
      toast.error('Failed to add member');
    }
  };

  const removeMemberFromTeam = async (teamId: string, userId: string) => {
    try {
      await apiClient.delete(`/api/teams/${teamId}/members/${userId}`);
      await fetchData();
      toast.success('Member removed successfully');
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Failed to remove member');
    }
  };

  const updateMemberRole = async (teamId: string, userId: string, newRole: 'member' | 'manager') => {
    try {
      await apiClient.put(`/api/teams/${teamId}/members/${userId}`, {
        role: newRole
      });
      
      await fetchData();
      toast.success(`Role updated to ${newRole}`);
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Failed to update role');
    }
  };

  const switchManager = async () => {
    if (!selectedTeam || !currentManagerId || !newManagerId) return;

    try {
      // Update old manager to member
      await apiClient.put(`/api/teams/${selectedTeam.id}/members/${currentManagerId}`, {
        role: 'member'
      });
      
      // Update new manager
      await apiClient.put(`/api/teams/${selectedTeam.id}/members/${newManagerId}`, {
        role: 'manager'
      });
      
      await fetchData();
      setShowSwitchManagerDialog(false);
      setCurrentManagerId('');
      setNewManagerId('');
      toast.success('Manager switched successfully');
    } catch (error) {
      console.error('Failed to switch manager:', error);
      toast.error('Failed to switch manager');
    }
  };

  const disbandTeam = async () => {
    if (!teamToDisband) return;

    try {
      await apiClient.delete(`/api/teams/${teamToDisband.id}`);
      await fetchData();
      setShowDisbandConfirm(false);
      setTeamToDisband(null);
      setSelectedTeam(null);
      toast.success('Team disbanded successfully');
    } catch (error) {
      console.error('Failed to disband team:', error);
      toast.error('Failed to disband team');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
            <p className="mt-4 text-muted">Loading teams...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <Shield className="h-8 w-8 text-accent" />
              Team Management
            </h1>
            <p className="text-muted mt-2">Manage all teams, members, and roles</p>
          </div>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            leftIcon={<Plus className="h-4 w-4" />}
            data-testid="create-team-button"
          >
            Create Team
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Teams List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Teams</span>
                  <Badge variant="secondary">{teams.length}</Badge>
                </CardTitle>
                <CardDescription>Select a team to manage</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  {teams.length === 0 ? (
                    <div className="p-6 text-center text-muted">
                      <Building className="h-12 w-12 mx-auto mb-2 text-muted/50" />
                      <p>No teams created yet</p>
                    </div>
                  ) : (
                    <div className="space-y-1 p-2">
                      {teams.map(team => (
                        <button
                          key={team.id}
                          onClick={() => setSelectedTeam(team)}
                          className={cn(
                            "w-full text-left p-3 rounded-lg transition-colors",
                            selectedTeam?.id === team.id
                              ? "bg-accent-10 border border-accent-30"
                              : "hover:bg-interactive-secondary-hover"
                          )}
                          data-testid={`team-${team.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-muted" />
                              <span className="font-medium text-primary">{team.name}</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted" />
                          </div>
                          <div className="mt-1 flex items-center gap-4 text-xs text-muted">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {team.member_count} members
                            </span>
                            <span className="flex items-center gap-1">
                              <Crown className="h-3 w-3" />
                              {team.managers.length} manager{team.managers.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Team Details */}
          <div className="lg:col-span-2">
            {selectedTeam ? (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl">{selectedTeam.name}</CardTitle>
                      <CardDescription className="mt-1">{selectedTeam.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddMemberDialog(true)}
                        leftIcon={<UserPlus className="h-4 w-4" />}
                      >
                        Add Member
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setTeamToDisband(selectedTeam);
                          setShowDisbandConfirm(true);
                        }}
                        leftIcon={<Trash2 className="h-4 w-4" />}
                      >
                        Disband
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Managers Section */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <Crown className="h-5 w-5 text-accent" />
                      Managers
                    </h3>
                    <div className="space-y-2">
                      {selectedTeam.members
                        .filter(m => m.role === 'manager')
                        .map(member => (
                          <div
                            key={member.user_id}
                            className="flex items-center justify-between p-3 bg-accent-5 rounded-lg border border-accent-20"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar
                                fallback={member.user?.username?.charAt(0).toUpperCase() || '?'}
                                size="sm"
                              />
                              <div>
                                <p className="font-medium text-primary">{member.user?.full_name}</p>
                                <p className="text-sm text-muted">@{member.user?.username}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setCurrentManagerId(member.user_id);
                                  setShowSwitchManagerDialog(true);
                                }}
                              >
                                Switch Manager
                              </Button>
                              {selectedTeam.managers.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateMemberRole(selectedTeam.id, member.user_id, 'member')}
                                >
                                  Make Member
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Members Section */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <Users className="h-5 w-5 text-secondary" />
                      Members
                    </h3>
                    <div className="space-y-2">
                      {selectedTeam.members
                        .filter(m => m.role === 'member')
                        .map(member => (
                          <div
                            key={member.user_id}
                            className="flex items-center justify-between p-3 bg-card-content rounded-lg border border-card-content"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar
                                fallback={member.user?.username?.charAt(0).toUpperCase() || '?'}
                                size="sm"
                              />
                              <div>
                                <p className="font-medium text-primary">{member.user?.full_name}</p>
                                <p className="text-sm text-muted">@{member.user?.username}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateMemberRole(selectedTeam.id, member.user_id, 'manager')}
                                leftIcon={<Crown className="h-3 w-3" />}
                              >
                                Make Manager
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeMemberFromTeam(selectedTeam.id, member.user_id)}
                                leftIcon={<UserMinus className="h-3 w-3" />}
                                className="text-error hover:text-error"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      {selectedTeam.members.filter(m => m.role === 'member').length === 0 && (
                        <p className="text-center py-6 text-muted">No members yet</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent>
                  <div className="text-center">
                    <Building className="h-12 w-12 text-muted mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-primary mb-2">No team selected</h3>
                    <p className="text-sm text-muted">
                      Select a team from the list to view and manage its details
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Create Team Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Create a new team and assign a manager
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
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  placeholder="Enter team description"
                  rows={3}
                  className="w-full p-2 border border-input rounded-md bg-input text-input resize-none"
                />
              </div>
              
              <div>
                <Label htmlFor="managerSearch">Team Manager</Label>
                <div className="relative">
                  <Input
                    id="managerSearch"
                    type="text"
                    placeholder="Search for a user..."
                    value={userSearchQuery}
                    onChange={(e) => {
                      setUserSearchQuery(e.target.value);
                      searchUsers(e.target.value);
                    }}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
                </div>
                
                {selectedManagerId && (
                  <div className="mt-2 p-2 bg-accent-5 rounded-md">
                    <p className="text-sm">
                      Selected: <span className="font-medium">
                        {users.find(u => u.id === selectedManagerId)?.full_name}
                      </span>
                    </p>
                  </div>
                )}
                
                {userSearchQuery && userSearchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-dropdown border border-dropdown rounded-md shadow-dropdown max-h-48 overflow-y-auto">
                    {userSearchResults.map(user => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setSelectedManagerId(user.id);
                          setUserSearchQuery('');
                          setUserSearchResults([]);
                        }}
                        className="w-full px-4 py-2 flex items-center space-x-3 hover:bg-dropdown-item-hover transition-colors text-left"
                      >
                        <Avatar
                          fallback={user.username.charAt(0).toUpperCase()}
                          size="sm"
                        />
                        <div>
                          <div className="text-sm font-medium text-primary">{user.full_name}</div>
                          <div className="text-xs text-muted">@{user.username}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowCreateDialog(false);
                setNewTeamName('');
                setNewTeamDescription('');
                setSelectedManagerId('');
                setUserSearchQuery('');
              }}>
                Cancel
              </Button>
              <Button 
                onClick={createTeam}
                disabled={!newTeamName.trim() || !selectedManagerId}
              >
                Create Team
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Member Dialog */}
        <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Search and add members to {selectedTeam?.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search for users..."
                  value={addMemberSearchQuery}
                  onChange={(e) => {
                    setAddMemberSearchQuery(e.target.value);
                    searchUsers(e.target.value, true);
                  }}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
              </div>
              
              {addMemberSearchQuery && addMemberSearchResults.length > 0 && (
                <ScrollArea className="h-64 border border-secondary rounded-md">
                  <div className="p-2 space-y-1">
                    {addMemberSearchResults.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2 hover:bg-interactive-secondary-hover rounded-md"
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar
                            fallback={user.username.charAt(0).toUpperCase()}
                            size="sm"
                          />
                          <div>
                            <div className="text-sm font-medium text-primary">{user.full_name}</div>
                            <div className="text-xs text-muted">@{user.username}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addMemberToTeam(user.id, 'member')}
                          >
                            Add as Member
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => addMemberToTeam(user.id, 'manager')}
                            leftIcon={<Crown className="h-3 w-3" />}
                          >
                            Add as Manager
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
              
              {addMemberSearchQuery && addMemberSearchResults.length === 0 && !isSearching && (
                <p className="text-center py-4 text-muted">No users found</p>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowAddMemberDialog(false);
                setAddMemberSearchQuery('');
                setAddMemberSearchResults([]);
              }}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Switch Manager Dialog */}
        <Dialog open={showSwitchManagerDialog} onOpenChange={setShowSwitchManagerDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Switch Team Manager</DialogTitle>
              <DialogDescription>
                Select a new manager from the current team members
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Select New Manager</Label>
                <Select value={newManagerId} onValueChange={setNewManagerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedTeam?.members
                      .filter(m => m.role === 'member')
                      .map(member => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {member.user?.full_name} (@{member.user?.username})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowSwitchManagerDialog(false);
                setCurrentManagerId('');
                setNewManagerId('');
              }}>
                Cancel
              </Button>
              <Button 
                onClick={switchManager}
                disabled={!newManagerId}
              >
                Switch Manager
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Disband Confirmation */}
        <ConfirmDialog
          open={showDisbandConfirm}
          onOpenChange={setShowDisbandConfirm}
          title="Disband Team"
          description={`Are you sure you want to disband "${teamToDisband?.name}"? This action cannot be undone.`}
          confirmText="Disband Team"
          confirmVariant="destructive"
          onConfirm={disbandTeam}
          icon={<AlertTriangle className="h-6 w-6 text-error" />}
        />
      </div>
    </DashboardLayout>
  );
}