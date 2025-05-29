
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import AuthModal from '@/components/AuthModal';
import ModernBottomNavigation from '@/components/ModernBottomNavigation';
import ModernMap from '@/components/ModernMap';
import ModernProfile from '@/components/ModernProfile';
import ModernEvents from '@/components/ModernEvents';
import ModernSettings from '@/components/ModernSettings';
import EnhancedMerchantDashboard from '@/components/EnhancedMerchantDashboard';
import AdvancedAdminPanel from '@/components/AdvancedAdminPanel';
import SuperAdminDashboard from '@/components/SuperAdminDashboard';
import { useState } from 'react';

const Index = () => {
  const { user, loading } = useAuth();
  const { userRole, isAdmin, isMerchant } = useRoles();
  const [currentView, setCurrentView] = useState('map');

  // Debug logging
  console.log('Index - userRole:', userRole);
  console.log('Index - isAdmin:', isAdmin);
  console.log('Index - isMerchant:', isMerchant);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

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
      case 'settings':
        return <ModernSettings />;
      case 'merchant':
        return isMerchant ? <EnhancedMerchantDashboard /> : <ModernMap />;
      case 'admin':
        return isAdmin ? <SuperAdminDashboard /> : <ModernMap />;
      case 'super-admin':
        return isAdmin ? <SuperAdminDashboard /> : <ModernMap />;
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
