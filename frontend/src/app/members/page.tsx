'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { 
  Users, 
  Search, 
  Mail, 
  Shield, 
  UserCheck,
  Filter,
  MoreVertical
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import { toast } from '@/components/ui/CustomToast';
import { track } from '@/services/analyticsLogger';
import { Skeleton, SkeletonAvatar } from '@/components/ui/Skeleton';

interface User {
  id: string;
  username: string;
  full_name: string;
  role: string;
  email: string;
  team_id?: string;
  created_at: string;
}

interface Team {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export default function MembersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');

  useEffect(() => {
    // Check if user is logged in and has permission
    const userData = localStorage.getItem('user');
    const sessionId = localStorage.getItem('session_id');
    
    if (!userData || !sessionId) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setCurrentUser(parsedUser);
    
    // Check if user has permission to view members
    if (parsedUser.role !== 'admin' && parsedUser.role !== 'manager') {
      toast.error('You do not have permission to view this page');
      router.push('/dashboard');
      return;
    }
    
    // Set user ID header for API calls
    apiClient.setUserIdHeader(parsedUser.id);
    
    // Log members page view
    track('PAGE_VIEW', {
      text: 'User viewed members page',
      page_name: 'members',
      page_url: '/members',
      user_id: parsedUser.id,
      user_role: parsedUser.role
    });
    
    // Load members data
    loadMembersData();
  }, [router]);

  const loadMembersData = async () => {
    try {
      setLoading(true);
      
      // Log data loading start
      track('DATA_LOAD_START', {
        text: 'User started loading members data',
        page: 'members',
        data_types: ['users', 'teams', 'team_memberships']
      });
      
      // Load users, teams, and team memberships
      const [usersRes, teamsRes] = await Promise.all([
        apiClient.get('/api/users'),
        apiClient.get('/api/teams')
      ]);

      setUsers(usersRes.data);
      setTeams(teamsRes.data);

      // Log successful data load
      track('DATA_LOAD_SUCCESS', {
        text: 'User successfully loaded members data',
        page: 'members',
        users_count: usersRes.data.length,
        teams_count: teamsRes.data.length
      });

    } catch (error: any) {
      console.error('Failed to load members data:', error);
      toast.error('Failed to load members data');
      
      // Log data loading error
      track('DATA_LOAD_ERROR', {
        text: 'User failed to load members data',
        page: 'members',
        error: error.message || 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    // Log search action
    track('SEARCH', {
      text: `User searched for members with query: ${query}`,
      page: 'members',
      query,
      filters: {
        team: selectedTeam,
        role: selectedRole
      }
    });

    // Add enhanced search tracking
    track('MEMBERS_SEARCH_INTERACTION', { 
      text: `User searched for members with query: ${query}`,
      interaction_type: 'search_input',
      search_query: query,
      search_query_length: query.length,
      active_filters: {
        team_filter: selectedTeam,
        role_filter: selectedRole
      },
      total_members_count: users.length,
      timestamp: new Date().toISOString()
    });
  };

  const handleFilterChange = (filterType: string, value: string) => {
    if (filterType === 'team') {
      setSelectedTeam(value);
    } else if (filterType === 'role') {
      setSelectedRole(value);
    }
    
    // Log filter change
    track('FILTER_CHANGE', {
      text: `User changed filter to ${filterType} with value: ${value}`,
      page: 'members',
      filter_type: filterType,
      filter_value: value
    });

    // Add enhanced filter tracking
    track('MEMBERS_FILTER_INTERACTION', {
      text: `User changed filter to ${filterType} with value: ${value}`,
      interaction_type: 'filter_change',
      filter_type: filterType,
      filter_value: value,
      previous_value: filterType === 'team' ? selectedTeam : selectedRole,
      current_search_query: searchQuery,
      timestamp: new Date().toISOString(),
      resulting_filter_state: {
        team: filterType === 'team' ? value : selectedTeam,
        role: filterType === 'role' ? value : selectedRole
      }
    });
  };

  const handleUserAction = (action: string, userId: string) => {
    // Log user action
    track('USER_ACTION', {
      text: `User performed action ${action} on user ${userId}`,
      page: 'members',
      action,
      target_user_id: userId
    });

    switch (action) {
      case 'view_profile':
        toast.info('User profile view coming soon');
        break;
      case 'send_message':
        toast.info('Messaging functionality coming soon');
        break;
      case 'manage_permissions':
        toast.info('Permission management coming soon');
        break;
      default:
        break;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'admin';
      case 'manager': return 'manager';
      case 'member': return 'member';
      default: return 'secondary';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return Shield;
      case 'manager': return UserCheck;
      case 'member': return Users;
      default: return Users;
    }
  };

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'No Team';
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTeam = selectedTeam === 'all' || user.team_id === selectedTeam;
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    
    return matchesSearch && matchesTeam && matchesRole;
  });

  const formatDate = (dateString: string | number) => {
    // Handle Unix timestamp (convert from seconds to milliseconds)
    const timestamp = typeof dateString === 'string' ? parseFloat(dateString) : dateString;
    const date = new Date(timestamp * 1000); // Convert from seconds to milliseconds
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!currentUser) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-card rounded-lg shadow-card p-6 border border-card">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">Team Members</h1>
              <p className="text-secondary mt-1">
                Manage and view team members across all projects
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-accent" />
              <div>
                <p className="text-sm font-medium text-primary">Total Members</p>
                <p className="text-2xl font-semibold text-primary">{users.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Search members by name, username, or email..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                  data-testid="members-search"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={selectedTeam}
                  onChange={(e) => handleFilterChange('team', e.target.value)}
                  className="border border-secondary rounded-md px-3 py-2 text-sm bg-input text-input focus:border-input-focus"
                  data-testid="team-filter"
                  aria-label="Team filter"
                >
                  <option value="all">All Teams</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={selectedRole}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                  className="border border-secondary rounded-md px-3 py-2 text-sm bg-input text-input focus:border-input-focus"
                  data-testid="role-filter"
                  aria-label="Role filter"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="member">Member</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Members Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <SkeletonAvatar size="lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton width="75%" />
                    <Skeleton width="50%" size="sm" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton width="100%" />
                  <Skeleton width="67%" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user) => {
              const RoleIcon = getRoleIcon(user.role);
              return (
                <Card key={user.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Avatar size="lg" name={user.full_name} />
                      <div>
                        <h3 className="font-semibold text-primary">{user.full_name}</h3>
                        <p className="text-sm text-secondary">@{user.username}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUserAction('view_profile', user.id)}
                      data-testid={`user-menu-${user.id}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant={getRoleColor(user.role)} className="flex items-center space-x-1">
                        <RoleIcon className="h-3 w-3" />
                        <span className="capitalize">{user.role}</span>
                      </Badge>
                      <span className="text-xs text-muted">
                        {getTeamName(user.team_id || '')}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-secondary">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{user.email}</span>
                    </div>

                    <div className="text-xs text-muted">
                      Joined {formatDate(user.created_at)}
                    </div>

                    <div className="flex space-x-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleUserAction('send_message', user.id)}
                        data-testid={`message-user-${user.id}`}
                      >
                        Message
                      </Button>
                      {currentUser.role === 'admin' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleUserAction('manage_permissions', user.id)}
                          data-testid={`manage-user-${user.id}`}
                        >
                          Manage
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-muted" />
              <h3 className="mt-2 text-sm font-medium text-primary">No members found</h3>
              <p className="mt-1 text-sm text-muted">
                {searchQuery || selectedTeam !== 'all' || selectedRole !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No team members available'}
              </p>
            </div>
          </Card>
        )}

        {/* Team Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Shield className="h-8 w-8 text-info" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted">Admins</p>
                <p className="text-2xl font-semibold text-primary">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserCheck className="h-8 w-8 text-accent" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted">Managers</p>
                <p className="text-2xl font-semibold text-primary">
                  {users.filter(u => u.role === 'manager').length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-success" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted">Members</p>
                <p className="text-2xl font-semibold text-primary">
                  {users.filter(u => u.role === 'member').length}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}