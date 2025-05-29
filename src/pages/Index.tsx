
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { useRealtimeLocation } from '@/hooks/useRealtimeLocation';
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
  
  // Start real-time location tracking for logged-in users
  const { location, error: locationError, isTracking } = useRealtimeLocation();

  // Debug logging
  console.log('Index - userRole:', userRole);
  console.log('Index - isAdmin:', isAdmin);
  console.log('Index - isMerchant:', isMerchant);
  console.log('Index - location tracking:', isTracking, location);

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
      {/* Location error notification */}
      {locationError && (
        <div className="fixed top-4 left-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
          <span className="block sm:inline">{locationError}</span>
        </div>
      )}
      
      {/* Location tracking status for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-16 left-4 bg-blue-100 border border-blue-400 text-blue-700 px-2 py-1 rounded text-xs z-40">
          {isTracking ? '🟢 Tracking ON' : '🔴 Tracking OFF'}
          {location && ` • ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
        </div>
      )}
      
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
