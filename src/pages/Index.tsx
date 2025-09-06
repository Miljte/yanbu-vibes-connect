import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useJeddahLocationCheck } from '@/hooks/useJeddahLocationCheck';
import { useDeleteMerchants } from '@/hooks/useDeleteMerchants';
import ModernBottomNavigation from '@/components/ModernBottomNavigation';
import RealWorldMap from '@/components/RealWorldMap';
import SimpleTestMap from '@/components/SimpleTestMap';
import UnifiedProfilePage from '@/components/UnifiedProfilePage';
import AuthModal from '@/components/AuthModal';
import OnboardingTutorial from '@/components/OnboardingTutorial';
import ProximityExplainer from '@/components/ProximityExplainer';
import EnhancedProximityChat from '@/components/EnhancedProximityChat';

const Index = () => {
  const [activeSection, setActiveSection] = useState('map');
  const [showAuth, setShowAuth] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showProximityExplainer, setShowProximityExplainer] = useState(false);
  const { user, userRole, loading } = useAuth();
  const { isInJeddah, loading: locationLoading } = useJeddahLocationCheck();
  const { deleteMerchants } = useDeleteMerchants();

  // Set localStorage values to skip onboarding immediately
  useEffect(() => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    localStorage.setItem('hasSeenProximityExplainer', 'true');
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      // Don't require authentication for now - let users access the app
      setShowAuth(false);
    } else if (user && !loading) {
      setShowAuth(false);
      const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
      const hasSeenProximityExplainer = localStorage.getItem('hasSeenProximityExplainer');
      
      // Skip onboarding for now
      localStorage.setItem('hasSeenOnboarding', 'true');
      localStorage.setItem('hasSeenProximityExplainer', 'true');
      
      if (!hasSeenOnboarding) {
        setShowOnboarding(false); // Skip onboarding
      } else if (!hasSeenProximityExplainer) {
        setShowProximityExplainer(false); // Skip explainer
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
    setShowProximityExplainer(true);
  };

  const handleCompleteProximityExplainer = () => {
    localStorage.setItem('hasSeenProximityExplainer', 'true');
    setShowProximityExplainer(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-light/10 via-background to-accent-vibrant/10 flex items-center justify-center relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-light/20 rounded-full blur-3xl animate-float" />
          <div className="absolute top-3/4 right-1/4 w-48 h-48 bg-accent-vibrant/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/4 left-1/2 w-32 h-32 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-2xl animate-pulse" />
        </div>
        
        {/* Loading Content */}
        <div className="text-center space-y-6 z-10 animate-scale-in">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-r-accent-vibrant rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent-vibrant bg-clip-text text-transparent">
              Yanbu Vibes
            </h2>
            <p className="text-muted-foreground text-lg font-medium animate-pulse">Loading your experience...</p>
            <div className="flex justify-center space-x-1 mt-4">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-primary-light rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-accent-vibrant rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
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

  if (showProximityExplainer) {
    return <ProximityExplainer isInYanbu={isInJeddah === true} onDismiss={handleCompleteProximityExplainer} />;
  }

  const renderActiveSection = () => {
    const sectionComponents = {
      'map': <RealWorldMap />,
      'chat': <EnhancedProximityChat />,
      'profile': <UnifiedProfilePage />,
    };

    const Component = sectionComponents[activeSection] || <RealWorldMap />;
    
    return (
      <div className="animate-fade-in-up">
        {Component}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-r from-primary-light/10 to-accent-vibrant/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-gradient-to-r from-accent-vibrant/10 to-primary-light/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-conic from-primary/5 via-accent-vibrant/5 to-primary/5 rounded-full blur-3xl animate-breath" />
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 min-h-screen">
        <div className="pb-28 md:pb-32">
          {renderActiveSection()}
        </div>
      </main>

      {/* Enhanced Bottom Navigation */}
      <ModernBottomNavigation
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        userRole={userRole}
        isInJeddah={isInJeddah}
      />

      {/* Scroll to Top Indicator */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary-light to-accent-vibrant z-50 animate-shimmer" 
           style={{ background: 'linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.3), transparent)' }} />
    </div>
  );
};

export default Index;
