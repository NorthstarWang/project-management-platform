'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { toast } from '@/components/ui/CustomToast';
import { Save, Edit, Camera, User, Mail, Shield, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'member';
  created_at?: string;
  last_login?: string;
  bio?: string;
  department?: string;
  location?: string;
  phone?: string;
}

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [profileData, setProfileData] = useState<UserProfile>({
    id: '',
    username: '',
    email: '',
    full_name: '',
    role: 'member',
    bio: '',
    department: '',
    location: '',
    phone: '',
  });

  const [originalData, setOriginalData] = useState<UserProfile>({
    id: '',
    username: '',
    email: '',
    full_name: '',
    role: 'member',
    bio: '',
    department: '',
    location: '',
    phone: '',
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      const userData = {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role as 'admin' | 'manager' | 'member',
        bio: '',
        department: '',
        location: '',
        phone: '',
      };
      setProfileData(userData);
      setOriginalData(userData);
    }
  }, [user]);

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setProfileData(originalData);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: API call to update profile
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call
      
      setOriginalData(profileData);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'manager':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'member':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">User Profile</h1>
            <p className="text-muted mt-1">Manage your account information and preferences</p>
          </div>
          <div className="flex space-x-2">
            {!isEditing ? (
              <Button onClick={handleEdit} className="flex items-center space-x-2">
                <Edit className="h-4 w-4" />
                <span>Edit Profile</span>
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Profile Card */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar 
                  size="2xl" 
                  name={profileData.full_name} 
                  className="border-4 border-primary/20"
                />
                {isEditing && (
                  <Button
                    size="sm"
                    className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 p-0"
                    variant="primary"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Badge className={getRoleColor(profileData.role)}>
                <Shield className="h-3 w-3 mr-1" />
                {profileData.role.charAt(0).toUpperCase() + profileData.role.slice(1)}
              </Badge>
            </div>

            {/* Profile Information */}
            <div className="flex-1 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>Full Name</span>
                  </Label>
                  {isEditing ? (
                    <Input
                      id="full_name"
                      value={profileData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <p className="text-primary py-2">{profileData.full_name || 'Not specified'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="flex items-center space-x-2">
                    <Activity className="h-4 w-4" />
                    <span>Username</span>
                  </Label>
                  <p className="text-muted py-2">@{profileData.username}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter your email"
                    />
                  ) : (
                    <p className="text-primary py-2">{profileData.email || 'Not specified'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center space-x-2">
                    <span>Phone</span>
                  </Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      value={profileData.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <p className="text-primary py-2">{profileData.phone || 'Not specified'}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Additional Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  {isEditing ? (
                    <Input
                      id="department"
                      value={profileData.department || ''}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      placeholder="Enter your department"
                    />
                  ) : (
                    <p className="text-primary py-2">{profileData.department || 'Not specified'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  {isEditing ? (
                    <Input
                      id="location"
                      value={profileData.location || ''}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="Enter your location"
                    />
                  ) : (
                    <p className="text-primary py-2">{profileData.location || 'Not specified'}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                {isEditing ? (
                  <textarea
                    id="bio"
                    value={profileData.bio || ''}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    placeholder="Tell us about yourself..."
                    className="w-full min-h-[80px] px-3 py-2 border border-input bg-input text-input placeholder-input rounded-md focus:border-input-focus transition-all duration-300 resize-vertical"
                  />
                ) : (
                  <p className="text-primary py-2 min-h-[40px]">{profileData.bio || 'No bio provided'}</p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Account Statistics */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-primary mb-4 flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Account Activity</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">0</p>
              <p className="text-muted">Projects Created</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">0</p>
              <p className="text-muted">Tasks Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">0</p>
              <p className="text-muted">Comments Made</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 