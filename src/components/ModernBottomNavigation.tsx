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
        badge: null
      },
      {
        id: 'map',
        icon: MapPin,
        label: 'Map',
        badge: null
      },
      {
        id: 'chat',
        icon: MessageSquare,
        label: 'Chat',
        badge: isInJeddah === false ? '❌' : null,
        disabled: isInJeddah === false
      },
      {
        id: 'settings',
        icon: Settings,
        label: 'Settings',
        badge: null
      }
    ];

    // Add role-specific items
    if (hasPermission('merchant_dashboard')) {
      baseItems.splice(-1, 0, {
        id: 'merchant',
        icon: Crown,
        label: 'Business',
        badge: null
      });
    }

    if (hasPermission('admin_dashboard')) {
      baseItems.splice(-1, 0, {
        id: 'admin',
        icon: Shield,
        label: 'Admin',
        badge: '🛠'
      });
    }

    return baseItems;
  };

  const navigationItems = getNavigationItems();

  return (
    <nav className="fixed inset-x-0 bottom-0 bg-secondary border-t border-border z-50">
      <ul className="flex justify-around p-2 md:p-3">
        {navigationItems.map((item) => (
          <li key={item.id} className="flex-1">
            <button
              onClick={() => onSectionChange(item.id)}
              className={`
                flex flex-col items-center justify-center
                w-full h-14 md:h-16
                text-muted-foreground
                ${activeSection === item.id ? 'text-foreground' : ''}
                ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              disabled={item.disabled}
            >
              {item.badge && (
                <span className="absolute top-1 right-1 text-xs text-red-500">{item.badge}</span>
              )}
              <item.icon className="w-5 h-5 md:w-6 md:h-6 mb-1" />
              <span className="text-xs md:text-sm">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default ModernBottomNavigation;
