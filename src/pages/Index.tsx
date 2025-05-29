
import React, { useState } from 'react';
import CleanMap from "@/components/CleanMap";
import EnhancedProximityChat from "@/components/EnhancedProximityChat";
import EventsSection from "@/components/EventsSection";
import UserProfile from "@/components/UserProfile";
import EnhancedAdminDashboard from "@/components/EnhancedAdminDashboard";
import FullMerchantDashboard from "@/components/FullMerchantDashboard";
import BottomNavigation from "@/components/BottomNavigation";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";

const Index = () => {
  const [activeSection, setActiveSection] = useState('map');
  const { user, loading } = useAuth();
  const { hasPermission } = useRoles();

  console.log('Index page - user:', user?.id, 'loading:', loading);
  console.log('Index page - activeSection:', activeSection);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-lg">Loading POP IN...</div>
      </div>
    );
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'map':
        return <CleanMap />;
      case 'events':
        return <EventsSection />;
      case 'chat':
        return <EnhancedProximityChat />;
      case 'profile':
        return user ? <UserProfile /> : <div className="min-h-screen bg-background p-4 flex items-center justify-center pb-20"><div className="text-foreground">Please sign in to view profile</div></div>;
      case 'more':
        return (
          <div className="min-h-screen bg-background p-4 pb-20">
            <div className="container mx-auto max-w-4xl">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">More Options</h1>
                <p className="text-muted-foreground">Additional features and settings</p>
              </div>
              
              <div className="space-y-6">
                {hasPermission('merchant_dashboard') && (
                  <div 
                    className="bg-card border rounded-lg p-6 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setActiveSection('merchant')}
                  >
                    <h3 className="text-xl font-semibold text-foreground mb-2">🏪 Merchant Dashboard</h3>
                    <p className="text-muted-foreground">Manage your stores, post events, and track analytics</p>
                  </div>
                )}
                
                {hasPermission('admin_dashboard') && (
                  <div 
                    className="bg-card border rounded-lg p-6 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setActiveSection('admin')}
                  >
                    <h3 className="text-xl font-semibold text-foreground mb-2">🛠 Admin Control Center</h3>
                    <p className="text-muted-foreground">Full platform management, user moderation, and system oversight</p>
                  </div>
                )}
                
                <div className="bg-card border rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-foreground mb-4">Settings</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Live GPS Tracking</span>
                      <div className="w-12 h-6 bg-primary rounded-full relative">
                        <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Chat Notifications</span>
                      <div className="w-12 h-6 bg-primary rounded-full relative">
                        <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Proximity Alerts</span>
                      <div className="w-12 h-6 bg-primary rounded-full relative">
                        <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'merchant':
        return hasPermission('merchant_dashboard') ? <FullMerchantDashboard /> : <div className="min-h-screen bg-background p-4 flex items-center justify-center pb-20"><div className="text-foreground">Access denied</div></div>;
      case 'admin':
        return hasPermission('admin_dashboard') ? <EnhancedAdminDashboard /> : <div className="min-h-screen bg-background p-4 flex items-center justify-center pb-20"><div className="text-foreground">Access denied</div></div>;
      default:
        return <CleanMap />;
    }
  };

  return (
    <div className="min-h-screen">
      {renderActiveSection()}
      <BottomNavigation 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
    </div>
  );
};

export default Index;
