
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import AuthModal from '@/components/AuthModal';
import ModernBottomNavigation from '@/components/ModernBottomNavigation';
import RealYanbuMap from '@/components/RealYanbuMap';
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
    return <AuthModal />;
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'map':
        return <RealYanbuMap />;
      case 'events':
        return <ModernEvents />;
      case 'profile':
        return <ModernProfile />;
      case 'merchant':
        return isMerchant ? <EnhancedMerchantDashboard /> : <RealYanbuMap />;
      case 'admin':
        return isAdmin ? <AdvancedAdminPanel /> : <RealYanbuMap />;
      case 'super-admin':
        return userRole === 'admin' ? <SuperAdminDashboard /> : <RealYanbuMap />;
      default:
        return <RealYanbuMap />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {renderCurrentView()}
      <ModernBottomNavigation 
        currentView={currentView} 
        onViewChange={setCurrentView}
        userRole={userRole}
      />
    </div>
  );
};

export default Index;
