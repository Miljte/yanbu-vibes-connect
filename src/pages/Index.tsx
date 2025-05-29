
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import AuthModal from '@/components/AuthModal';
import ModernBottomNavigation from '@/components/ModernBottomNavigation';
import ModernMap from '@/components/ModernMap';
import ModernProfile from '@/components/ModernProfile';
import ModernEvents from '@/components/ModernEvents';
import EnhancedMerchantDashboard from '@/components/EnhancedMerchantDashboard';
import AdvancedAdminPanel from '@/components/AdvancedAdminPanel';
import SuperAdminDashboard from '@/components/SuperAdminDashboard';
import { useState } from 'react';

const Index = () => {
  const { user } = useAuth();
  const { userRole, isAdmin, isMerchant } = useRoles();
  const [currentView, setCurrentView] = useState('map');

  if (!user) {
    return <AuthModal isOpen={true} onClose={() => {}} />;
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'map':
        return <ModernMap />;
      case 'events':
        return <ModernEvents />;
      case 'profile':
        return <ModernProfile />;
      case 'merchant':
        return isMerchant ? <EnhancedMerchantDashboard /> : <ModernMap />;
      case 'admin':
        return isAdmin ? <AdvancedAdminPanel /> : <ModernMap />;
      case 'super-admin':
        return userRole === 'admin' ? <SuperAdminDashboard /> : <ModernMap />;
      default:
        return <ModernMap />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {renderCurrentView()}
      <ModernBottomNavigation 
        activeSection={currentView} 
        onSectionChange={setCurrentView}
        userRole={userRole}
      />
    </div>
  );
};

export default Index;
