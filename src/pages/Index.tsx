
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useYanbuLocationCheck } from '@/hooks/useYanbuLocationCheck';
import ModernBottomNavigation from '@/components/ModernBottomNavigation';
import ModernMap from '@/components/ModernMap';
import ModernEvents from '@/components/ModernEvents';
import ModernSettings from '@/components/ModernSettings';
import UserProfile from '@/components/UserProfile';
import AuthModal from '@/components/AuthModal';
import OnboardingTutorial from '@/components/OnboardingTutorial';
import LocationRestrictionScreen from '@/components/LocationRestrictionScreen';
import FullMerchantDashboard from '@/components/FullMerchantDashboard';
import EnhancedAdminPanel from '@/components/EnhancedAdminPanel';

const Index = () => {
  const [activeSection, setActiveSection] = useState('events');
  const [showAuth, setShowAuth] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user, userRole, loading } = useAuth();
  const { isInYanbu, loading: locationLoading } = useYanbuLocationCheck();

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

  useEffect(() => {
    if (isInYanbu === false && userRole !== 'admin' && activeSection === 'map') {
      setActiveSection('events');
    }
  }, [isInYanbu, userRole, activeSection]);

  const handleCompleteOnboarding = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

  if (loading || locationLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (showAuth) {
    return <AuthModal isOpen={true} onClose={() => setShowAuth(false)} />;
  }

  if (showOnboarding) {
    return <OnboardingTutorial onComplete={handleCompleteOnboarding} />;
  }

  if (isInYanbu === false && userRole !== 'admin') {
    return <LocationRestrictionScreen />;
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'map':
        return <ModernMap />;
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
        isInYanbu={isInYanbu}
      />
    </div>
  );
};

export default Index;
