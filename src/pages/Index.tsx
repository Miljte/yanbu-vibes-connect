
import React, { useState } from 'react';
import ModernMap from "@/components/ModernMap";
import EnhancedProximityChat from "@/components/EnhancedProximityChat";
import ModernEvents from "@/components/ModernEvents";
import UserProfile from "@/components/UserProfile";
import ModernProfile from "@/components/ModernProfile";
import EnhancedAdminDashboard from "@/components/EnhancedAdminDashboard";
import FullMerchantDashboard from "@/components/FullMerchantDashboard";
import ModernBottomNavigation from "@/components/ModernBottomNavigation";
import CategoryFilter from "@/components/CategoryFilter";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { useLocalization } from "@/contexts/LocalizationContext";

const Index = () => {
  const [activeSection, setActiveSection] = useState('map');
  const { user, loading } = useAuth();
  const { hasPermission } = useRoles();
  const { t, isRTL } = useLocalization();

  console.log('Index page - user:', user?.id, 'loading:', loading);
  console.log('Index page - activeSection:', activeSection);

  if (loading) {
    return (
      <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="text-gray-900 text-lg font-medium">{t('common.loading')}</div>
      </div>
    );
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'map':
        return <ModernMap />;
      case 'categories':
        return <ModernMap />; // Same as map but with category focus
      case 'events':
        return <ModernEvents />;
      case 'chat':
        return <EnhancedProximityChat />;
      case 'profile':
        return user ? <ModernProfile /> : (
          <div className={`min-h-screen bg-gray-50 p-4 flex items-center justify-center pb-20 ${isRTL ? 'rtl' : 'ltr'}`}>
            <div className="text-gray-900">Please sign in to view profile</div>
          </div>
        );
      case 'more':
        return (
          <div className={`min-h-screen bg-gray-50 p-4 pb-20 ${isRTL ? 'rtl' : 'ltr'}`}>
            <div className="container mx-auto max-w-4xl">
              <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('nav.more')}</h1>
                <p className="text-gray-600">Additional features and settings</p>
              </div>
              
              <div className="space-y-6">
                {hasPermission('merchant_dashboard') && (
                  <div 
                    className="bg-white rounded-2xl p-6 cursor-pointer hover:shadow-lg transition-all border-0 shadow-md"
                    onClick={() => setActiveSection('merchant')}
                  >
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">🏪 Merchant Dashboard</h3>
                    <p className="text-gray-600">Manage your stores, post events, and track analytics</p>
                  </div>
                )}
                
                {hasPermission('admin_dashboard') && (
                  <div 
                    className="bg-white rounded-2xl p-6 cursor-pointer hover:shadow-lg transition-all border-0 shadow-md"
                    onClick={() => setActiveSection('admin')}
                  >
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">🛠 Admin Control Center</h3>
                    <p className="text-gray-600">Full platform management, user moderation, and system oversight</p>
                  </div>
                )}
                
                <div className="bg-white rounded-2xl p-6 border-0 shadow-md">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Live GPS Tracking</span>
                      <div className="w-12 h-6 bg-blue-500 rounded-full relative">
                        <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Chat Notifications</span>
                      <div className="w-12 h-6 bg-blue-500 rounded-full relative">
                        <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Proximity Alerts</span>
                      <div className="w-12 h-6 bg-blue-500 rounded-full relative">
                        <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'merchant':
        return hasPermission('merchant_dashboard') ? <FullMerchantDashboard /> : (
          <div className={`min-h-screen bg-gray-50 p-4 flex items-center justify-center pb-20 ${isRTL ? 'rtl' : 'ltr'}`}>
            <div className="text-gray-900">Access denied</div>
          </div>
        );
      case 'admin':
        return hasPermission('admin_dashboard') ? <EnhancedAdminDashboard /> : (
          <div className={`min-h-screen bg-gray-50 p-4 flex items-center justify-center pb-20 ${isRTL ? 'rtl' : 'ltr'}`}>
            <div className="text-gray-900">Access denied</div>
          </div>
        );
      default:
        return <ModernMap />;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {renderActiveSection()}
      <ModernBottomNavigation 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
    </div>
  );
};

export default Index;
