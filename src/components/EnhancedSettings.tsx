
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Moon, 
  Sun, 
  Globe, 
  Bell, 
  Vibrate, 
  MapPin, 
  Volume2,
  Smartphone,
  Monitor,
  Languages
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocalization } from '@/contexts/LocalizationContext';
import { proximityNotifications } from '@/services/ProximityNotifications';
import { toast } from 'sonner';
import GamificationSystem from './GamificationSystem';

const EnhancedSettings: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const { language, setLanguage, t, isRTL } = useLocalization();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await proximityNotifications.requestPermissions();
      if (granted) {
        setNotificationsEnabled(true);
        toast.success(t('settings.notificationsEnabled'));
      } else {
        toast.error(t('settings.notificationsPermissionDenied'));
      }
    } else {
      setNotificationsEnabled(false);
      toast.success(t('settings.notificationsDisabled'));
    }
  };

  const handleLanguageSwitch = () => {
    const newLanguage = language === 'en' ? 'ar' : 'en';
    setLanguage(newLanguage);
    toast.success(
      newLanguage === 'ar' 
        ? 'تم تغيير اللغة إلى العربية' 
        : 'Language changed to English'
    );
  };

  const handleHapticTest = async () => {
    await proximityNotifications.vibrate();
    toast.success(t('settings.hapticTested'));
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">{t('settings.title')}</h1>
        <p className="text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            <span>{t('settings.appearance')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">{t('settings.darkMode')}</div>
              <div className="text-sm text-muted-foreground">
                {t('settings.darkModeDesc')}
              </div>
            </div>
            <Switch
              checked={isDark}
              onCheckedChange={toggleTheme}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={!isDark ? "default" : "outline"}
              className="h-16 flex-col space-y-2"
              onClick={() => !isDark && toggleTheme()}
            >
              <Sun className="w-5 h-5" />
              <span className="text-xs">{t('settings.lightMode')}</span>
            </Button>
            <Button
              variant={isDark ? "default" : "outline"}
              className="h-16 flex-col space-y-2"
              onClick={() => isDark && toggleTheme()}
            >
              <Moon className="w-5 h-5" />
              <span className="text-xs">{t('settings.darkMode')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Languages className="w-5 h-5" />
            <span>{t('settings.language')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">{t('settings.currentLanguage')}</div>
              <div className="text-sm text-muted-foreground">
                {language === 'en' ? 'English' : 'العربية'}
              </div>
            </div>
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Globe className="w-3 h-3" />
              <span>{language.toUpperCase()}</span>
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={language === 'en' ? "default" : "outline"}
              className="h-16 flex-col space-y-2"
              onClick={() => language !== 'en' && handleLanguageSwitch()}
            >
              <span className="text-lg">🇺🇸</span>
              <span className="text-xs">English</span>
            </Button>
            <Button
              variant={language === 'ar' ? "default" : "outline"}
              className="h-16 flex-col space-y-2"
              onClick={() => language !== 'ar' && handleLanguageSwitch()}
            >
              <span className="text-lg">🇸🇦</span>
              <span className="text-xs">العربية</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>{t('settings.notifications')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">{t('settings.proximityNotifications')}</div>
              <div className="text-sm text-muted-foreground">
                {t('settings.proximityNotificationsDesc')}
              </div>
            </div>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={handleNotificationToggle}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">{t('settings.soundNotifications')}</div>
              <div className="text-sm text-muted-foreground">
                {t('settings.soundNotificationsDesc')}
              </div>
            </div>
            <Switch
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Haptic Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Vibrate className="w-5 h-5" />
            <span>{t('settings.hapticFeedback')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">{t('settings.enableHaptic')}</div>
              <div className="text-sm text-muted-foreground">
                {t('settings.hapticDesc')}
              </div>
            </div>
            <Switch
              checked={hapticEnabled}
              onCheckedChange={setHapticEnabled}
            />
          </div>

          <Button
            variant="outline"
            onClick={handleHapticTest}
            disabled={!hapticEnabled}
            className="w-full"
          >
            <Vibrate className="w-4 h-4 mr-2" />
            {t('settings.testHaptic')}
          </Button>
        </CardContent>
      </Card>

      {/* Device Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5" />
            <span>{t('settings.deviceInfo')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('settings.platform')}</span>
            <Badge variant="outline">
              {navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('settings.orientation')}</span>
            <Badge variant="outline">
              {isRTL ? 'RTL' : 'LTR'}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('settings.version')}</span>
            <Badge variant="outline">v1.0.0</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Gamification Section */}
      <GamificationSystem />
    </div>
  );
};

export default EnhancedSettings;
