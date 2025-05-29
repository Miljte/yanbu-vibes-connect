
import React from 'react';
import { Home, Calendar, MessageSquare, User, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocalization } from '@/contexts/LocalizationContext';

interface ModernBottomNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const ModernBottomNavigation = ({ activeSection, onSectionChange }: ModernBottomNavigationProps) => {
  const { t, isRTL } = useLocalization();

  const navItems = [
    { id: 'map', icon: Home, label: t('nav.home') },
    { id: 'events', icon: Calendar, label: t('nav.events') },
    { id: 'chat', icon: MessageSquare, label: t('nav.chat') },
    { id: 'profile', icon: User, label: t('nav.profile') },
    { id: 'more', icon: MoreHorizontal, label: t('nav.more') }
  ];

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border z-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="safe-area-pb">
        <div className="flex justify-around items-center py-2 px-4 max-w-md mx-auto">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              onClick={() => onSectionChange(item.id)}
              className={`flex flex-col items-center space-y-1 px-3 py-3 min-w-0 transition-all duration-200 ${
                activeSection === item.id 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeSection === item.id ? 'scale-110' : ''} transition-transform`} />
              <span className="text-xs font-medium">{item.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ModernBottomNavigation;
