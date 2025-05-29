
import React from 'react';
import { MapPin, Calendar, User, ShoppingBag, Shield, Settings } from 'lucide-react';

interface ModernBottomNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  userRole?: string;
}

const ModernBottomNavigation: React.FC<ModernBottomNavigationProps> = ({ 
  activeSection,
  onSectionChange,
  userRole = 'user' 
}) => {
  
  // Debug logging
  console.log('ModernBottomNavigation - userRole:', userRole);
  
  // Navigation items with conditional admin/merchant sections
  const navItems = [
    {
      id: 'map',
      label: 'Map',
      icon: <MapPin className="h-5 w-5" />,
      show: true
    },
    {
      id: 'events',
      label: 'Events',
      icon: <Calendar className="h-5 w-5" />,
      show: true
    },
    {
      id: 'admin',
      label: 'Admin',
      icon: <Shield className="h-5 w-5" />,
      show: userRole === 'admin'
    },
    {
      id: 'merchant',
      label: 'Merchant',
      icon: <ShoppingBag className="h-5 w-5" />,
      show: userRole === 'merchant' || userRole === 'admin'
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: <User className="h-5 w-5" />,
      show: true
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="h-5 w-5" />,
      show: true
    },
  ];

  // Filter items based on user role and allow up to 6 items for admin users
  const maxItems = userRole === 'admin' ? 6 : 5;
  const visibleNavItems = navItems.filter(item => {
    console.log(`Item ${item.id} - show: ${item.show}, userRole: ${userRole}`);
    return item.show;
  }).slice(0, maxItems);

  console.log('Visible nav items:', visibleNavItems.map(item => item.id));

  const handleSectionChange = (section: string) => {
    if (onSectionChange && typeof onSectionChange === 'function') {
      onSectionChange(section);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10">
      <div className="bg-background border-t border-border px-2 py-2 flex justify-between">
        {visibleNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleSectionChange(item.id)}
            className={`flex flex-1 flex-col items-center justify-center p-2 rounded-md transition-colors
              ${activeSection === item.id 
                ? 'text-primary bg-primary/10' 
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            {item.icon}
            <span className="text-xs mt-1">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ModernBottomNavigation;
