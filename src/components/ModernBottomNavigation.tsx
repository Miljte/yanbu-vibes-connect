
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
        id: 'map',
        icon: MapPin,
        label: 'Discover',
        badge: null,
        disabled: false
      },
      {
        id: 'chat',
        icon: MessageSquare,
        label: 'Connect',
        badge: isInJeddah === false ? '!' : null,
        disabled: isInJeddah === false
      },
      {
        id: 'profile',
        icon: Settings,
        label: 'Profile',
        badge: null,
        disabled: false
      }
    ];

    return baseItems;
  };

  const navigationItems = getNavigationItems();

  return (
    <>
      {/* Clean Bottom Navigation */}
      <nav className="fixed inset-x-4 bottom-4 md:inset-x-6 md:bottom-6 z-50">
        <div className="floating-card bg-background/95 backdrop-blur-sm rounded-2xl px-3 py-2 shadow-lg border border-border/50">
          <ul className="flex justify-around items-center">
            {navigationItems.map((item) => (
              <li key={item.id} className="flex-1">
                <button
                  onClick={() => !item.disabled && onSectionChange(item.id)}
                  className={`
                    relative flex flex-col items-center justify-center
                    w-full h-14 md:h-16 rounded-xl
                    transition-all duration-200 group
                    ${activeSection === item.id 
                      ? 'text-primary bg-primary/10' 
                      : item.disabled 
                      ? 'text-muted-foreground/40 cursor-not-allowed' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                    }
                  `}
                  disabled={item.disabled}
                >
                  {/* Badge */}
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center font-medium">
                      {item.badge}
                    </span>
                  )}
                  
                  {/* Icon */}
                  <item.icon className={`
                    w-5 h-5 md:w-6 md:h-6 mb-1 transition-all duration-200
                    ${activeSection === item.id ? 'scale-110' : 'group-hover:scale-105'}
                  `} />
                  
                  {/* Label */}
                  <span className="text-xs md:text-sm font-medium">
                    {item.label}
                  </span>
                  
                  {/* Active Indicator */}
                  {activeSection === item.id && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                  )}
                  
                  {/* Disabled State Indicator */}
                  {item.disabled && item.id === 'chat' && (
                    <span className="text-[10px] text-destructive mt-0.5">
                      Move to Yanbu
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      
      {/* Safe Area for Bottom Navigation */}
      <div className="h-20 md:h-24" />
    </>
  );
};

export default ModernBottomNavigation;
