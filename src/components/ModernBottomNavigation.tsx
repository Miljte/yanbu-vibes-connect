
import React from 'react';
import { Calendar, MapPin, MessageSquare, Settings, Crown, Shield } from 'lucide-react';
import { useRoles } from '@/hooks/useRoles';

interface ModernBottomNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  userRole: string | null;
  isInJeddah?: boolean | null;
}

const ModernBottomNavigation: React.FC<ModernBottomNavigationProps> = ({
  activeSection,
  onSectionChange,
  userRole,
  isInJeddah
}) => {
  const { hasPermission } = useRoles();
  
  const getNavigationItems = () => {
    const baseItems = [
      {
        id: 'events',
        icon: Calendar,
        label: 'Events',
        badge: null,
        disabled: false
      },
      {
        id: 'map',
        icon: MapPin,
        label: 'Map',
        badge: null,
        disabled: false
      },
      {
        id: 'chat',
        icon: MessageSquare,
        label: 'Chat',
        badge: isInJeddah === false ? '🚫' : null,
        disabled: isInJeddah === false
      },
      {
        id: 'settings',
        icon: Settings,
        label: 'Settings',
        badge: null,
        disabled: false
      }
    ];

    // Add role-specific items
    if (hasPermission('merchant_dashboard')) {
      baseItems.splice(-1, 0, {
        id: 'merchant',
        icon: Crown,
        label: 'Business',
        badge: null,
        disabled: false
      });
    }

    if (hasPermission('admin_dashboard')) {
      baseItems.splice(-1, 0, {
        id: 'admin',
        icon: Shield,
        label: 'Admin',
        badge: '🛠',
        disabled: false
      });
    }

    return baseItems;
  };

  const navigationItems = getNavigationItems();

  return (
    <nav className="fixed inset-x-0 bottom-0 bg-secondary/95 backdrop-blur-md border-t border-border z-50 shadow-lg">
      <ul className="flex justify-around p-2 md:p-3">
        {navigationItems.map((item) => (
          <li key={item.id} className="flex-1">
            <button
              onClick={() => !item.disabled && onSectionChange(item.id)}
              className={`
                relative flex flex-col items-center justify-center
                w-full h-14 md:h-16 rounded-lg
                transition-all duration-200
                ${activeSection === item.id 
                  ? 'text-primary bg-primary/10 scale-105' 
                  : item.disabled 
                  ? 'text-muted-foreground/50 cursor-not-allowed' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              `}
              disabled={item.disabled}
            >
              {item.badge && (
                <span className="absolute -top-1 -right-1 text-xs bg-red-500 text-white rounded-full px-1 min-w-[18px] h-[18px] flex items-center justify-center">
                  {item.badge}
                </span>
              )}
              <item.icon className={`w-5 h-5 md:w-6 md:h-6 mb-1 ${
                activeSection === item.id ? 'animate-pulse' : ''
              }`} />
              <span className="text-xs md:text-sm font-medium">{item.label}</span>
              {item.disabled && item.id === 'chat' && (
                <span className="text-[10px] text-red-500 mt-0.5">Locked</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default ModernBottomNavigation;
