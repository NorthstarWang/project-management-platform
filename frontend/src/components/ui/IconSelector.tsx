'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderOpen, 
  Users,
  Calendar,
  Target,
  Zap,
  Layers,
  Code,
  Palette,
  Server,
  Database,
  Shield,
  Book,
  Apple,
  Smartphone,
  Store,
  TestTube,
  Layout,
  ShoppingCart,
  Briefcase,
  Settings,
  Globe,
  Camera,
  Heart,
  Star,
  Flag,
  Trophy,
  Lightbulb,
  Search,
  Mail,
  Phone,
  MessageSquare,
  Play,
  Music,
  Image,
  FileText,
  Archive,
  Clock,
  CheckCircle,
  Home,
  Cpu,
  Wifi,
  Battery,
  Volume2,
  Monitor,
  Tablet,
  Watch
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Define available icons with categories
const ICON_CATEGORIES = {
  general: [
    { name: 'folder', icon: FolderOpen, label: 'Folder' },
    { name: 'briefcase', icon: Briefcase, label: 'Business' },
    { name: 'target', icon: Target, label: 'Target' },
    { name: 'star', icon: Star, label: 'Star' },
    { name: 'flag', icon: Flag, label: 'Flag' },
    { name: 'trophy', icon: Trophy, label: 'Trophy' },
    { name: 'lightbulb', icon: Lightbulb, label: 'Idea' },
    { name: 'heart', icon: Heart, label: 'Heart' },
    { name: 'home', icon: Home, label: 'Home' },
  ],
  development: [
    { name: 'code', icon: Code, label: 'Code' },
    { name: 'server', icon: Server, label: 'Server' },
    { name: 'database', icon: Database, label: 'Database' },
    { name: 'shield', icon: Shield, label: 'Security' },
    { name: 'cpu', icon: Cpu, label: 'Processor' },
    { name: 'monitor', icon: Monitor, label: 'Monitor' },
    { name: 'wifi', icon: Wifi, label: 'Network' },
    { name: 'layers', icon: Layers, label: 'Layers' },
    { name: 'layout', icon: Layout, label: 'Layout' },
  ],
  design: [
    { name: 'palette', icon: Palette, label: 'Design' },
    { name: 'image', icon: Image, label: 'Image' },
    { name: 'camera', icon: Camera, label: 'Camera' },
    { name: 'zap', icon: Zap, label: 'Flash' },
    { name: 'play', icon: Play, label: 'Play' },
    { name: 'music', icon: Music, label: 'Music' },
    { name: 'volume2', icon: Volume2, label: 'Audio' },
  ],
  mobile: [
    { name: 'smartphone', icon: Smartphone, label: 'Mobile' },
    { name: 'tablet', icon: Tablet, label: 'Tablet' },
    { name: 'watch', icon: Watch, label: 'Watch' },
    { name: 'apple', icon: Apple, label: 'Apple' },
    { name: 'battery', icon: Battery, label: 'Battery' },
  ],
  business: [
    { name: 'shopping-cart', icon: ShoppingCart, label: 'E-commerce' },
    { name: 'store', icon: Store, label: 'Store' },
    { name: 'users', icon: Users, label: 'Team' },
    { name: 'calendar', icon: Calendar, label: 'Calendar' },
    { name: 'mail', icon: Mail, label: 'Email' },
    { name: 'phone', icon: Phone, label: 'Phone' },
    { name: 'message-square', icon: MessageSquare, label: 'Chat' },
    { name: 'globe', icon: Globe, label: 'Global' },
  ],
  productivity: [
    { name: 'book', icon: Book, label: 'Documentation' },
    { name: 'file-text', icon: FileText, label: 'Document' },
    { name: 'archive', icon: Archive, label: 'Archive' },
    { name: 'search', icon: Search, label: 'Search' },
    { name: 'settings', icon: Settings, label: 'Settings' },
    { name: 'clock', icon: Clock, label: 'Time' },
    { name: 'check-circle', icon: CheckCircle, label: 'Success' },
    { name: 'test-tube', icon: TestTube, label: 'Testing' },
  ]
};

interface IconSelectorProps {
  selectedIcon: string;
  onIconSelect: (icon: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function IconSelector({ selectedIcon, onIconSelect, className, size = 'md' }: IconSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('general');
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Calculate position when opening
  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX
      });
    }
    setIsOpen(!isOpen);
  };

  // Get the selected icon component
  const getSelectedIconComponent = () => {
    for (const category of Object.values(ICON_CATEGORIES)) {
      const found = category.find(item => item.name === selectedIcon);
      if (found) return found.icon;
    }
    return FolderOpen; // Default fallback
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const buttonSizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  const SelectedIcon = getSelectedIconComponent();

  return (
    <div className={cn('relative', className)}>
      {/* Selected Icon Button */}
      <motion.button
        type="button"
        onClick={handleToggle}
        className={cn(
          'flex items-center justify-center rounded-lg border border-input bg-background text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          buttonSizes[size]
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        data-testid="icon-selector-button"
        ref={buttonRef}
      >
        <SelectedIcon className={iconSizes[size]} />
      </motion.button>

      {/* Icon Picker Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[60]"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="fixed z-[70] mt-2 w-80 rounded-lg border border-secondary bg-card shadow-lg"
              style={{
                top: position.top,
                left: position.left
              }}
              onClick={(e) => e.stopPropagation()} // Prevent modal dismissal
              data-testid="icon-selector-dropdown"
              data-dropdown-portal
            >
              <div className="p-4">
                <h4 className="text-sm font-medium text-primary mb-3">Choose an icon</h4>
                
                {/* Category Tabs */}
                <div className="flex flex-wrap gap-1 mb-4 border-b border-secondary pb-2">
                  {Object.keys(ICON_CATEGORIES).map((category) => (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={cn(
                        'px-2 py-1 text-xs rounded-md transition-colors duration-200',
                        activeCategory === category
                          ? 'bg-accent-2 text-accent'
                          : 'text-muted hover:text-primary hover:bg-interactive-secondary-hover'
                      )}
                      data-testid={`icon-category-${category}`}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Icon Grid */}
                <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                  {ICON_CATEGORIES[activeCategory as keyof typeof ICON_CATEGORIES]?.map((item) => {
                    const IconComponent = item.icon;
                    const isSelected = selectedIcon === item.name;
                    
                    return (
                      <motion.button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          onIconSelect(item.name);
                          setIsOpen(false);
                        }}
                        className={cn(
                          'flex items-center justify-center h-10 w-10 rounded-lg border transition-all duration-200',
                          isSelected
                            ? 'border-accent bg-accent-2 text-accent'
                            : 'border-secondary bg-card hover:bg-interactive-secondary-hover hover:text-primary text-muted'
                        )}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title={item.label}
                        data-testid={`icon-option-${item.name}`}
                      >
                        <IconComponent className="h-5 w-5" />
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Export icon utilities for other components
export const getIconComponent = (iconName: string) => {
  // Handle aliases
  const iconAliases: Record<string, string> = {
    'kanban': 'layers',
    'api': 'server',
    'android': 'smartphone'
  };
  
  const searchName = iconAliases[iconName] || iconName;
  
  for (const category of Object.values(ICON_CATEGORIES)) {
    const found = category.find(item => item.name === searchName);
    if (found) return found.icon;
  }
  return FolderOpen; // Default fallback
};

export const getAllIcons = () => {
  const allIcons: Array<{name: string, icon: any, label: string, category: string}> = [];
  
  Object.entries(ICON_CATEGORIES).forEach(([category, icons]) => {
    icons.forEach(icon => {
      allIcons.push({ ...icon, category });
    });
  });
  
  return allIcons;
}; 