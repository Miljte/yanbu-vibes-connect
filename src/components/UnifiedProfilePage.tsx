import React, { useState } from 'react';
import { User, Settings, Crown, Shield, LogOut, Globe, Moon, Sun, Bell, Lock, Heart, Star, Calendar, MapPin, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useTheme } from '@/contexts/ThemeContext';
import FullMerchantDashboard from '@/components/FullMerchantDashboard';
import EnhancedAdminPanel from '@/components/EnhancedAdminPanel';

const UnifiedProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'business' | 'admin'>('profile');
  const { user, signOut } = useAuth();
  const { hasPermission } = useRoles();
  const { language, setLanguage, t } = useLocalization();
  const { isDark, toggleTheme } = useTheme();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Get user stats (mock data for now)
  const userStats = {
    placesVisited: 12,
    eventsAttended: 8,
    connectionsMade: 24,
    favoriteSpots: 5
  };

  const renderBusinessTab = () => {
    if (!hasPermission('merchant_dashboard')) {
      return (
        <div className="text-center py-12 md:py-16 space-y-4 px-4">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
            <Crown className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-base md:text-lg">Business Features</h3>
            <p className="text-muted-foreground text-sm">Contact admin to access merchant tools</p>
          </div>
        </div>
      );
    }
    return (
      <div className="p-3 md:p-4">
        <FullMerchantDashboard />
      </div>
    );
  };

  const renderAdminTab = () => {
    if (!hasPermission('admin_dashboard')) {
      return (
        <div className="text-center py-12 md:py-16 space-y-4 px-4">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-base md:text-lg">Admin Panel</h3>
            <p className="text-muted-foreground text-sm">Administrator access required</p>
          </div>
        </div>
      );
    }
    return (
      <div className="p-3 md:p-4">
        <EnhancedAdminPanel />
      </div>
    );
  };

  const renderProfileTab = () => (
    <div className="space-y-4 md:space-y-6 p-3 md:p-4">
      {/* User Info Card */}
      <Card className="floating-card">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-primary to-primary/70 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-bold truncate">{user?.email?.split('@')[0] || 'User'}</h2>
              <p className="text-muted-foreground text-sm truncate">{user?.email}</p>
              <Badge variant="outline" className="mt-1 text-xs">
                Active Explorer
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Stats */}
      <Card className="floating-card">
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Star className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            Your Yanbu Journey
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
            <div className="text-center p-2 md:p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 bg-blue-500/20 rounded-lg mx-auto mb-1 md:mb-2">
                <MapPin className="w-3 h-3 md:w-4 md:h-4 text-blue-600" />
              </div>
              <div className="text-lg md:text-xl font-bold">{userStats.placesVisited}</div>
              <div className="text-xs text-muted-foreground">Places</div>
            </div>
            <div className="text-center p-2 md:p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 bg-purple-500/20 rounded-lg mx-auto mb-1 md:mb-2">
                <Calendar className="w-3 h-3 md:w-4 md:h-4 text-purple-600" />
              </div>
              <div className="text-lg md:text-xl font-bold">{userStats.eventsAttended}</div>
              <div className="text-xs text-muted-foreground">Events</div>
            </div>
            <div className="text-center p-2 md:p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 bg-green-500/20 rounded-lg mx-auto mb-1 md:mb-2">
                <MessageSquare className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
              </div>
              <div className="text-lg md:text-xl font-bold">{userStats.connectionsMade}</div>
              <div className="text-xs text-muted-foreground">Chats</div>
            </div>
            <div className="text-center p-2 md:p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 bg-red-500/20 rounded-lg mx-auto mb-1 md:mb-2">
                <Heart className="w-3 h-3 md:w-4 md:h-4 text-red-600" />
              </div>
              <div className="text-lg md:text-xl font-bold">{userStats.favoriteSpots}</div>
              <div className="text-xs text-muted-foreground">Favorites</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* App Settings */}
      <Card className="floating-card">
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Settings className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            App Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3 md:space-y-4">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3 flex-1">
              {isDark ? <Moon className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" /> : <Sun className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />}
              <div className="min-w-0">
                <p className="font-medium text-sm md:text-base">Theme</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {isDark ? 'Dark mode' : 'Light mode'}
                </p>
              </div>
            </div>
            <Switch
              checked={isDark}
              onCheckedChange={toggleTheme}
              className="flex-shrink-0"
            />
          </div>

          <Separator />

          {/* Language Toggle */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3 flex-1">
              <Globe className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm md:text-base">Language</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {language === 'ar' ? 'العربية' : 'English'}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="flex-shrink-0 text-xs"
            >
              {language === 'ar' ? 'EN' : 'ع'}
            </Button>
          </div>

          <Separator />

          {/* Notifications */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3 flex-1">
              <Bell className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm md:text-base">Notifications</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Proximity alerts and events
                </p>
              </div>
            </div>
            <Switch defaultChecked className="flex-shrink-0" />
          </div>

          <Separator />

          {/* Privacy */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3 flex-1">
              <Lock className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm md:text-base">Location Sharing</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Required for proximity features
                </p>
              </div>
            </div>
            <Switch defaultChecked disabled className="flex-shrink-0" />
          </div>
        </CardContent>
      </Card>

      {/* Sign Out Button */}
      <Card className="floating-card border-destructive/20">
        <CardContent className="p-3 md:p-4">
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full text-destructive border-destructive/20 hover:bg-destructive/10 text-sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header with Tabs */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 p-3 md:p-4">
        <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-3 md:mb-4">
          Profile & Settings
        </h1>
        
        {/* Tab Navigation - Mobile Optimized */}
        <div className="flex gap-1 md:gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
            }`}
          >
            <User className="w-3 h-3 md:w-4 md:h-4" />
            Profile
          </button>
          
          {hasPermission('merchant_dashboard') && (
            <button
              onClick={() => setActiveTab('business')}
              className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border whitespace-nowrap ${
                activeTab === 'business'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
              }`}
            >
              <Crown className="w-3 h-3 md:w-4 md:h-4" />
              Business
            </button>
          )}
          
          {hasPermission('admin_dashboard') && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border whitespace-nowrap ${
                activeTab === 'admin'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
              }`}
            >
              <Shield className="w-3 h-3 md:w-4 md:h-4" />
              Admin
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="pb-24 md:pb-28">
        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'business' && renderBusinessTab()}
        {activeTab === 'admin' && renderAdminTab()}
      </div>
    </div>
  );
};

export default UnifiedProfilePage;
