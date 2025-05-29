
import React, { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import AuthModal from '@/components/AuthModal';
import ModernMap from '@/components/ModernMap';
import ModernEvents from '@/components/ModernEvents';
import EnhancedProximityChat from '@/components/EnhancedProximityChat';
import ModernProfile from '@/components/ModernProfile';
import ModernSettings from '@/components/ModernSettings';
import EnhancedMerchantDashboard from '@/components/EnhancedMerchantDashboard';
import EnhancedAdminDashboard from '@/components/EnhancedAdminDashboard';
import BottomNavigation from '@/components/BottomNavigation';

function App() {
  const { user, loading } = useAuth();
  const { isAdmin, isMerchant } = useRoles();
  const [activeSection, setActiveSection] = useState('map');
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      setShowAuthModal(true);
    } else {
      setShowAuthModal(false);
    }
  }, [user, loading]);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
  };

  const handleNavigate = (section: string) => {
    setActiveSection(section);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'map':
        return <ModernMap />;
      case 'events':
        return <ModernEvents />;
      case 'chat':
        return <EnhancedProximityChat />;
      case 'profile':
        return <ModernProfile onNavigate={handleNavigate} />;
      case 'settings':
        return <ModernSettings />;
      case 'merchant':
        if (isMerchant || isAdmin) {
          return <EnhancedMerchantDashboard />;
        }
        return <div className="p-4 text-center">Access denied - Merchant role required</div>;
      case 'admin':
        if (isAdmin) {
          return <EnhancedAdminDashboard />;
        }
        return <div className="p-4 text-center">Access denied - Admin role required</div>;
      default:
        return <ModernMap />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {renderActiveSection()}
      
      {user && (
        <BottomNavigation 
          activeSection={activeSection} 
          onSectionChange={handleSectionChange} 
        />
      )}
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
      
      <Toaster />
    </div>
  );
}

export default App;
