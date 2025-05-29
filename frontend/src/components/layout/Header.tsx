'use client';

import { useState } from 'react';
import { Search, Bell, Settings } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log('Search query:', searchQuery);
  };

  return (
    <header className="bg-card shadow-sm border-b border-card transition-all duration-300 theme-transition">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Search Bar */}
          <div className="flex-1 max-w-lg">
            <form onSubmit={handleSearch} className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-muted transition-colors duration-300" />
              </div>
              <Input
                type="text"
                placeholder="Search by name, label, task or team member..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-input bg-input text-input placeholder-input focus:border-input-focus transition-all duration-300"
              />
            </form>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative transition-all duration-300">
              <Bell className="h-5 w-5 text-muted transition-colors duration-300" />
              {/* Notification badge */}
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-error text-white text-xs rounded-full flex items-center justify-center transition-all duration-300">
                3
              </span>
            </Button>

            {/* Settings */}
            <Button variant="ghost" size="sm" className="transition-all duration-300">
              <Settings className="h-5 w-5 text-muted transition-colors duration-300" />
            </Button>

            {/* User Avatar */}
            <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 transition-all duration-300">
              <Avatar size="sm" name="User Name" className="transition-all duration-300" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
} 