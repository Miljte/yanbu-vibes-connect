
import React, { useState } from 'react';
import ModernMap from "@/components/ModernMap";
import EnhancedProximityChat from "@/components/EnhancedProximityChat";
import ModernEvents from "@/components/ModernEvents";
import ModernProfile from "@/components/ModernProfile";
import EnhancedAdminDashboard from "@/components/EnhancedAdminDashboard";
import FullMerchantDashboard from "@/components/FullMerchantDashboard";
import ModernBottomNavigation from "@/components/ModernBottomNavigation";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, Moon, Sun, Languages, Shield, Store } from "lucide-react";

const Index = () => {
  const [activeSection, setActiveSection] = useState('map');
  const { user, loading } = useAuth();
  const { hasPermission } = useRoles();
  const { t, language, setLanguage, isRTL } = useLocalization();
  const { isDark, toggleTheme } = useTheme();

  console.log('Index page - user:', user?.id, 'loading:', loading);
  console.log('Index page - activeSection:', activeSection);

  if (loading) {
    return (
      <div className={`min-h-screen bg-background flex items-center justify-center ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="text-foreground text-lg font-medium">{t('common.loading')}</div>
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
        return user ? <ModernProfile /> : (
          <div className={`min-h-screen bg-background p-4 flex items-center justify-center pb-20 ${isRTL ? 'rtl' : 'ltr'}`}>
            <div className="text-foreground">Please sign in to view profile</div>
          </div>
        );
      case 'more':
        return (
          <div className={`min-h-screen bg-background p-4 pb-20 ${isRTL ? 'rtl' : 'ltr'}`}>
            <div className="container mx-auto max-w-4xl">
              <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-foreground mb-2">{t('nav.more')}</h1>
                <p className="text-muted-foreground">Additional features and settings</p>
              </div>
              
              <div className="space-y-6">
                {/* Admin Dashboard - Only for admins */}
                {hasPermission('admin_dashboard') && (
                  <Card 
                    className="cursor-pointer hover:shadow-lg transition-all border-0 shadow-md bg-card"
                    onClick={() => setActiveSection('admin')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
                          <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-foreground mb-2">Admin Control Center</h3>
                          <p className="text-muted-foreground">Full platform management, user moderation, and system oversight</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Merchant Dashboard - Only for merchants */}
                {hasPermission('merchant_dashboard') && (
                  <Card 
                    className="cursor-pointer hover:shadow-lg transition-all border-0 shadow-md bg-card"
                    onClick={() => setActiveSection('merchant')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
                          <Store className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-foreground mb-2">Merchant Dashboard</h3>
                          <p className="text-muted-foreground">Manage your stores, post events, and track analytics</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Settings Card */}
                <Card className="border-0 shadow-md bg-card">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                        <Settings className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground">Settings</h3>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Theme Toggle */}
                      <div className="flex items-center justify-between">
                        <span className="text-foreground">Dark Mode</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={toggleTheme}
                          className="flex items-center space-x-2"
                        >
                          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                          <span>{isDark ? 'Light' : 'Dark'}</span>
                        </Button>
                      </div>

                      {/* Language Toggle */}
                      <div className="flex items-center justify-between">
                        <span className="text-foreground">Language</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                          className="flex items-center space-x-2"
                        >
                          <Languages className="w-4 h-4" />
                          <span>{language === 'en' ? 'العربية' : 'English'}</span>
                        </Button>
                      </div>

                      {/* Feature Toggles */}
                      <div className="flex items-center justify-between">
                        <span className="text-foreground">Live GPS Tracking</span>
                        <div className="w-12 h-6 bg-primary rounded-full relative">
                          <div className="w-5 h-5 bg-background rounded-full absolute top-0.5 right-0.5 shadow-sm"></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-foreground">Chat Notifications</span>
                        <div className="w-12 h-6 bg-primary rounded-full relative">
                          <div className="w-5 h-5 bg-background rounded-full absolute top-0.5 right-0.5 shadow-sm"></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-foreground">Proximity Alerts</span>
                        <div className="w-12 h-6 bg-primary rounded-full relative">
                          <div className="w-5 h-5 bg-background rounded-full absolute top-0.5 right-0.5 shadow-sm"></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        );
      case 'merchant':
        return hasPermission('merchant_dashboard') ? <FullMerchantDashboard /> : (
          <div className={`min-h-screen bg-background p-4 flex items-center justify-center pb-20 ${isRTL ? 'rtl' : 'ltr'}`}>
            <div className="text-foreground">Access denied</div>
          </div>
        );
      case 'admin':
        return hasPermission('admin_dashboard') ? <EnhancedAdminDashboard /> : (
          <div className={`min-h-screen bg-background p-4 flex items-center justify-center pb-20 ${isRTL ? 'rtl' : 'ltr'}`}>
            <div className="text-foreground">Access denied</div>
          </div>
        );
      default:
        return <ModernMap />;
    }
  };

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`}>
      {renderActiveSection()}
      <ModernBottomNavigation 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
    </div>
  );
};

export default Index;
