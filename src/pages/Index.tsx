
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useJeddahLocationCheck } from '@/hooks/useJeddahLocationCheck';
import { useDeleteMerchants } from '@/hooks/useDeleteMerchants';
import ModernBottomNavigation from '@/components/ModernBottomNavigation';
import EnhancedJeddahMap from '@/components/EnhancedJeddahMap';
import ModernEvents from '@/components/ModernEvents';
import ModernSettings from '@/components/ModernSettings';
import UserProfile from '@/components/UserProfile';
import AuthModal from '@/components/AuthModal';
import OnboardingTutorial from '@/components/OnboardingTutorial';
import FullMerchantDashboard from '@/components/FullMerchantDashboard';
import EnhancedAdminPanel from '@/components/EnhancedAdminPanel';

const Index = () => {
  const [activeSection, setActiveSection] = useState('events');
  const [showAuth, setShowAuth] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user, userRole, loading } = useAuth();
  const { isInJeddah, loading: locationLoading } = useJeddahLocationCheck();
  const { deleteMerchants } = useDeleteMerchants();

  useEffect(() => {
    if (!loading && !user) {
      setShowAuth(true);
    } else if (user && !loading) {
      setShowAuth(false);
      const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
    }
  }, [user, loading]);

  // Auto-delete merchants on app load for admin users
  useEffect(() => {
    if (user && userRole === 'admin') {
      const hasDeletedMerchants = localStorage.getItem('merchantsDeleted');
      if (!hasDeletedMerchants) {
        deleteMerchants();
        localStorage.setItem('merchantsDeleted', 'true');
      }
    }
  }, [user, userRole, deleteMerchants]);

  const handleCompleteOnboarding = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-blue-900 dark:text-blue-100 text-lg font-medium">Loading Jeddah Vibes...</p>
        </div>
      </div>
    );
  }

  if (showAuth) {
    return <AuthModal isOpen={true} onClose={() => setShowAuth(false)} />;
  }

  if (showOnboarding) {
    return <OnboardingTutorial onComplete={handleCompleteOnboarding} isOpen={true} />;
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'map':
        return <EnhancedJeddahMap />;
      case 'events':
        return <ModernEvents />;
      case 'profile':
        return <UserProfile />;
      case 'settings':
        return <ModernSettings />;
      case 'merchant':
        return <FullMerchantDashboard />;
      case 'admin':
        return <EnhancedAdminPanel />;
      default:
        return <ModernEvents />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {renderActiveSection()}
      <ModernBottomNavigation
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        userRole={userRole}
        isInJeddah={isInJeddah}
      />
    </div>
  );
};

export default Index;
