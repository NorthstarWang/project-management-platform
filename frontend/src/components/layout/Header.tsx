'use client';

import { useState, useRef } from 'react';
import { Search, Settings, Menu } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { SearchResults } from '@/components/ui/SearchResults';
import { NotificationDropdown } from '@/components/ui/NotificationDropdown';

interface User {
  id: string;
  username: string;
  full_name: string;
  role: string;
  email: string;
}

interface HeaderProps {
  currentUser?: User | null;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function Header({ currentUser, onMenuClick, showMenuButton = false }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchInputRef = useRef<HTMLDivElement>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Show results if query has at least 1 character
    if (query.length >= 1) {
      setShowSearchResults(true);
    } else {
      setShowSearchResults(false);
    }
  };

  const handleSearchFocus = () => {
    if (searchQuery.length >= 1) {
      setShowSearchResults(true);
    }
  };

  const handleCloseSearch = () => {
    setShowSearchResults(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Prevent form submission - search is handled by SearchResults component
  };

  return (
    <header className="bg-card shadow-sm border-b border-card transition-all duration-300 theme-transition">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Mobile menu button */}
          {showMenuButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="lg:hidden mr-2"
            >
              <Menu className="h-5 w-5 text-muted" />
            </Button>
          )}

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mr-8" ref={searchInputRef}>
            <form onSubmit={handleSearch} className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-muted transition-colors duration-300" />
              </div>
              <Input
                type="text"
                placeholder="Search projects, boards, tasks, comments..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
                className="block w-full pl-10 pr-3 py-2 border border-input bg-input text-input placeholder-input focus:border-input-focus transition-all duration-300"
                data-testid="global-search-input"
              />
            </form>
            
            {/* Search Results Dropdown */}
            <SearchResults
              query={searchQuery}
              isOpen={showSearchResults}
              onClose={handleCloseSearch}
              anchorRef={searchInputRef as React.RefObject<HTMLElement>}
            />
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <NotificationDropdown />

            {/* Settings */}
            <Button variant="ghost" size="sm" className="transition-all duration-300">
              <Settings className="h-5 w-5 text-muted transition-colors duration-300" />
            </Button>

            {/* User Avatar */}
            <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 transition-all duration-300">
              <Avatar 
                size="sm" 
                name={currentUser?.full_name || "User"} 
                className="transition-all duration-300" 
              />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
} 