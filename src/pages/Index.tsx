
import React, { useState } from 'react';
import RealYanbuMap from "@/components/RealYanbuMap";
import ProximityChat from "@/components/ProximityChat";
import EventsSection from "@/components/EventsSection";
import UserProfile from "@/components/UserProfile";
import AdminDashboard from "@/components/AdminDashboard";
import MerchantDashboard from "@/components/MerchantDashboard";
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading POP IN...</div>
      </div>
    );
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'map':
        return <RealYanbuMap />;
      case 'events':
        return <EventsSection />;
      case 'chat':
        return <ProximityChat />;
      case 'profile':
        return user ? <UserProfile /> : <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 flex items-center justify-center pb-20"><div className="text-white">Please sign in to view profile</div></div>;
      case 'more':
        return (
          <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pb-20">
            <div className="container mx-auto max-w-4xl">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">More Options</h1>
                <p className="text-slate-300">Additional features and settings</p>
              </div>
              
              <div className="space-y-6">
                {hasPermission('merchant_dashboard') && (
                  <div 
                    className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 cursor-pointer hover:bg-slate-700/50 transition-colors"
                    onClick={() => setActiveSection('merchant')}
                  >
                    <h3 className="text-xl font-semibold text-white mb-2">🏪 Merchant Dashboard</h3>
                    <p className="text-slate-300">Manage your places, view analytics, and interact with customers</p>
                  </div>
                )}
                
                {hasPermission('admin_dashboard') && (
                  <div 
                    className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 cursor-pointer hover:bg-slate-700/50 transition-colors"
                    onClick={() => setActiveSection('admin')}
                  >
                    <h3 className="text-xl font-semibold text-white mb-2">⚙️ Admin Dashboard</h3>
                    <p className="text-slate-300">Manage users, moderate content, and oversee the platform</p>
                  </div>
                )}
                
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Settings</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Notifications</span>
                      <div className="w-12 h-6 bg-cyan-600 rounded-full relative">
                        <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Location Sharing</span>
                      <div className="w-12 h-6 bg-cyan-600 rounded-full relative">
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
        return hasPermission('merchant_dashboard') ? <MerchantDashboard /> : <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 flex items-center justify-center pb-20"><div className="text-white">Access denied</div></div>;
      case 'admin':
        return hasPermission('admin_dashboard') ? <AdminDashboard /> : <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 flex items-center justify-center pb-20"><div className="text-white">Access denied</div></div>;
      default:
        return <RealYanbuMap />;
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
