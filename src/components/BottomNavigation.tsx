
import React from 'react';
import { Home, Calendar, MessageSquare, User, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BottomNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const BottomNavigation = ({ activeSection, onSectionChange }: BottomNavigationProps) => {
  const navItems = [
    { id: 'map', icon: Home, label: 'Map' },
    { id: 'events', icon: Calendar, label: 'Events' },
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'more', icon: MoreHorizontal, label: 'More' }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 z-50">
      <div className="flex justify-around items-center py-2 px-4 max-w-md mx-auto">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            size="sm"
            onClick={() => onSectionChange(item.id)}
            className={`flex flex-col items-center space-y-1 px-2 py-2 min-w-0 ${
              activeSection === item.id 
                ? 'text-cyan-400' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default BottomNavigation;
