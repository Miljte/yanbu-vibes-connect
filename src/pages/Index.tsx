
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { useRealtimeLocation } from '@/hooks/useRealtimeLocation';
import { useState, useEffect } from 'react';
import AuthModal from '@/components/AuthModal';
import ModernBottomNavigation from '@/components/ModernBottomNavigation';
import ModernMap from '@/components/ModernMap';
import ModernProfile from '@/components/ModernProfile';
import ModernEvents from '@/components/ModernEvents';
import EnhancedSettings from '@/components/EnhancedSettings';
import EnhancedMerchantDashboard from '@/components/EnhancedMerchantDashboard';
import SuperAdminDashboard from '@/components/SuperAdminDashboard';
import LocationRestrictionScreen from '@/components/LocationRestrictionScreen';
import OnboardingTutorial from '@/components/OnboardingTutorial';
import { proximityNotifications } from '@/services/ProximityNotifications';

const Index = () => {
  const { user, loading } = useAuth();
  const { userRole, isAdmin, isMerchant } = useRoles();
  const [currentView, setCurrentView] = useState('map');
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Start real-time location tracking for logged-in users
  const { location, error: locationError, isTracking, isInYanbu } = useRealtimeLocation();

  // Check if user needs onboarding
  useEffect(() => {
    if (user) {
      const hasSeenOnboarding = localStorage.getItem(`onboarding_${user.id}`);
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
      
      // Initialize proximity notifications
      proximityNotifications.requestPermissions();
    }
  }, [user]);

  const handleOnboardingComplete = () => {
    if (user) {
      localStorage.setItem(`onboarding_${user.id}`, 'true');
    }
    setShowOnboarding(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground animate-pulse">Loading...</div>
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
        return <EnhancedSettings />;
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
      {/* Location error notification - only show if not a restriction issue */}
      {locationError && isInYanbu !== false && (
        <div className="fixed top-4 left-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 animate-slide-in-right">
          <span className="block sm:inline">{locationError}</span>
        </div>
      )}
      
      {/* Onboarding Tutorial */}
      <OnboardingTutorial 
        isOpen={showOnboarding} 
        onComplete={handleOnboardingComplete} 
      />
      
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
