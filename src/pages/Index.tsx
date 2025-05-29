
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
import SuperAdminDashboard from '@/components/SuperAdminDashboard';
import LocationRestrictionScreen from '@/components/LocationRestrictionScreen';
import { useState } from 'react';

const Index = () => {
  const { user, loading } = useAuth();
  const { userRole, isAdmin, isMerchant } = useRoles();
  const [currentView, setCurrentView] = useState('map');
  
  // Start real-time location tracking for logged-in users
  const { location, error: locationError, isTracking, isInYanbu } = useRealtimeLocation();

  // Debug logging
  console.log('Index - userRole:', userRole);
  console.log('Index - isAdmin:', isAdmin);
  console.log('Index - isMerchant:', isMerchant);
  console.log('Index - location tracking:', isTracking, location);
  console.log('Index - isInYanbu:', isInYanbu);

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

  // Handle location-based restrictions
  const handleLocationRetry = () => {
    window.location.reload(); // Force location recheck
  };

  // If user is outside Yanbu and trying to access map, show restriction screen
  if (isInYanbu === false && currentView === 'map') {
    return (
      <LocationRestrictionScreen
        onRetry={handleLocationRetry}
        isChecking={isInYanbu === null}
        onNavigateToEvents={() => setCurrentView('events')}
        onNavigateToProfile={() => setCurrentView('profile')}
      />
    );
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'map':
        // Only render map if user is in Yanbu or admin override
        if (isInYanbu === true || isAdmin) {
          return <ModernMap />;
        }
        // Fallback to events if map not accessible
        return <ModernEvents />;
      case 'events':
        return <ModernEvents />;
      case 'profile':
        return <ModernProfile />;
      case 'settings':
        return <ModernSettings />;
      case 'merchant':
        return isMerchant ? <EnhancedMerchantDashboard /> : <ModernEvents />;
      case 'admin':
        return isAdmin ? <SuperAdminDashboard /> : <ModernEvents />;
      case 'super-admin':
        return isAdmin ? <SuperAdminDashboard /> : <ModernEvents />;
      default:
        return <ModernEvents />; // Default to events instead of map
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Location error notification */}
      {locationError && isInYanbu !== false && (
        <div className="fixed top-4 left-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
          <span className="block sm:inline">{locationError}</span>
        </div>
      )}
      
      {/* Removed the debug tracking status display */}
      
      {renderCurrentView()}
      <ModernBottomNavigation 
        activeSection={currentView} 
        onSectionChange={setCurrentView}
        userRole={userRole}
        isInYanbu={isInYanbu}
      />
    </div>
  );
};

export default Index;
