'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Settings, UserCircle } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface ProfileDropdownProps {
  currentUser?: {
    id: string;
    username: string;
    full_name: string;
    email: string;
    role: string;
  } | null;
}

export function ProfileDropdown({ currentUser }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { logout } = useAuth();
  const router = useRouter();

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleViewProfile = () => {
    handleClose();
    router.push('/profile');
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Avatar Button */}
      <Button 
        variant="ghost" 
        className="relative h-8 w-8 rounded-full p-0 transition-all duration-300 hover:ring-2 hover:ring-primary/20"
        onClick={handleToggle}
        data-testid="profile-dropdown-trigger"
      >
        <Avatar 
          size="sm" 
          name={currentUser?.full_name || "User"} 
          className="transition-all duration-300" 
        />
      </Button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 rounded-lg bg-card border border-border shadow-lg z-50"
            data-testid="profile-dropdown-menu"
          >
            {/* User Info Section */}
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center space-x-3">
                <Avatar 
                  size="default" 
                  name={currentUser?.full_name || "User"} 
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary truncate">
                    {currentUser?.full_name || "User Name"}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {currentUser?.email || "user@example.com"}
                  </p>
                  <p className="text-xs text-muted capitalize">
                    {currentUser?.role || "member"}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <button
                onClick={handleViewProfile}
                className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-surface transition-colors duration-200 flex items-center space-x-3"
                data-testid="view-profile-button"
              >
                <UserCircle className="h-4 w-4 text-muted" />
                <span>View Profile</span>
              </button>

              <button
                onClick={handleViewProfile}
                className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-surface transition-colors duration-200 flex items-center space-x-3"
                data-testid="edit-profile-button"
              >
                <Settings className="h-4 w-4 text-muted" />
                <span>Edit Profile</span>
              </button>
            </div>

            {/* Logout Section */}
            <div className="border-t border-border">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors duration-200 flex items-center space-x-3 disabled:opacity-50"
                data-testid="logout-button"
              >
                <LogOut className="h-4 w-4" />
                <span>{isLoggingOut ? 'Signing out...' : 'Sign out'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 