
import React from 'react';
import { MapPin, Calendar, Settings, Crown, Store, User } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';

interface NavigationItem {
  id: string;
  labelKey: string;
  icon: React.ReactNode;
  show: boolean;
}

interface ModernBottomNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  userRole?: string;
  isInJeddah?: boolean | null;
}

const ModernBottomNavigation: React.FC<ModernBottomNavigationProps> = ({ 
  activeSection, 
  onSectionChange, 
  userRole = 'user',
  isInJeddah = null
}) => {
  const { t, isRTL } = useLocalization();

  const isAdmin = userRole === 'admin';
  const isMerchant = userRole === 'merchant' || isAdmin;

  const navItems: NavigationItem[] = [
    {
      id: 'events',
      labelKey: 'nav.events',
      icon: <Calendar className="w-5 h-5" />,
      show: true
    },
    {
      id: 'map',
      labelKey: 'nav.map',
      icon: <MapPin className="w-5 h-5" />,
      show: true
    },
    {
      id: 'settings',
      labelKey: 'nav.settings',
      icon: <Settings className="w-5 h-5" />,
      show: true
    },
    {
      id: 'merchant',
      labelKey: 'nav.merchant',
      icon: <Store className="w-5 h-5" />,
      show: isMerchant
    },
    {
      id: 'admin',
      labelKey: 'nav.admin',
      icon: <Crown className="w-5 h-5" />,
      show: isAdmin
    }
  ];

  const visibleItems = navItems.filter(item => {
    // Map access restricted to Jeddah users only
    if (item.id === 'map' && isInJeddah === false) {
      return false;
    }
    return item.show;
  });

  const handleItemClick = (itemId: string) => {
    if (itemId === 'map' && isInJeddah === false && !isAdmin) {
      onSectionChange('events');
      return;
    }
    
    onSectionChange(itemId);
  };

  return (
    <nav className={`fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border z-50 ${isRTL ? 'font-arabic' : 'font-sans'}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-xl">
        <div className="flex items-center justify-around py-2 sm:py-3">
          {visibleItems.map((item) => {
            const isActive = activeSection === item.id;
            const isMapRestricted = item.id === 'map' && isInJeddah === false && !isAdmin;
            
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`flex flex-col items-center space-y-1 px-2 py-2 rounded-xl transition-all duration-300 min-w-0 flex-1 max-w-20 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                    : isMapRestricted
                    ? 'text-muted-foreground/50 cursor-not-allowed'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:scale-105'
                }`}
                disabled={isMapRestricted}
              >
                <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
                  {item.icon}
                </div>
                <span className="text-xs font-medium text-center leading-tight">
                  {t(item.labelKey)}
                  {isMapRestricted && ' 🔒'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default ModernBottomNavigation;
