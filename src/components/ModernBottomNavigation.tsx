
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
  isInYanbu?: boolean | null;
}

const ModernBottomNavigation: React.FC<ModernBottomNavigationProps> = ({ 
  activeSection, 
  onSectionChange, 
  userRole = 'user',
  isInYanbu = null
}) => {
  const { t, isRTL } = useLocalization();
  console.log('ModernBottomNavigation - userRole:', userRole);

  const isAdmin = userRole === 'admin';
  const isMerchant = userRole === 'merchant' || isAdmin;

  const navigationItems: NavigationItem[] = [
    {
      id: 'map',
      labelKey: 'nav.map',
      icon: <MapPin className="w-5 h-5" />,
      show: true
    },
    {
      id: 'events',
      labelKey: 'nav.events',
      icon: <Calendar className="w-5 h-5" />,
      show: true
    },
    {
      id: 'profile',
      labelKey: 'nav.profile',
      icon: <User className="w-5 h-5" />,
      show: true
    },
    {
      id: 'admin',
      labelKey: 'nav.admin',
      icon: <Crown className="w-5 h-5" />,
      show: isAdmin
    },
    {
      id: 'merchant',
      labelKey: 'nav.merchant',
      icon: <Store className="w-5 h-5" />,
      show: isMerchant
    },
    {
      id: 'settings',
      labelKey: 'nav.settings',
      icon: <Settings className="w-5 h-5" />,
      show: true
    }
  ];

  const visibleItems = navigationItems.filter(item => {
    console.log(`Item ${item.id} - show: ${item.show}, userRole: ${userRole}`);
    return item.show;
  });

  console.log('Visible nav items:', visibleItems.map(item => item.id));

  const handleItemClick = (itemId: string) => {
    if (itemId === 'map' && isInYanbu === false && !isAdmin) {
      onSectionChange('events');
      return;
    }
    
    onSectionChange(itemId);
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border z-50 ${isRTL ? 'font-arabic' : 'font-streetwear'}`}>
      <div className="container mx-auto max-w-md">
        <div className="flex items-center justify-around px-2 py-3">
          {visibleItems.map((item) => {
            const isActive = activeSection === item.id;
            const isMapRestricted = item.id === 'map' && isInYanbu === false && !isAdmin;
            
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`flex flex-col items-center space-y-1 px-2 py-2 rounded-lg transition-all duration-200 min-w-0 ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isMapRestricted
                    ? 'text-muted-foreground/50 cursor-not-allowed'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                disabled={isMapRestricted}
              >
                <div className={`${isActive ? 'scale-110' : ''} transition-transform`}>
                  {item.icon}
                </div>
                <span className="text-xs font-medium">
                  {t(item.labelKey)}
                  {isMapRestricted && ' 🔒'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ModernBottomNavigation;
