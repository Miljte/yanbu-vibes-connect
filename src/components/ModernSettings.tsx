
import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Moon, 
  Sun, 
  Globe, 
  User, 
  Bell, 
  MapPin, 
  Shield, 
  Palette,
  Smartphone,
  Languages,
  Volume2,
  Vibrate,
  Eye,
  EyeOff,
  Check,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocalization } from '@/contexts/LocalizationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserProfile {
  nickname: string;
  age?: number;
  gender?: string;
  interests: string[];
  avatar_preset: string;
  location_sharing_enabled: boolean;
  notifications_enabled: boolean;
}

const ModernSettings = () => {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { language, setLanguage, t, isRTL } = useLocalization();
  const [profile, setProfile] = useState<UserProfile>({
    nickname: '',
    age: undefined,
    gender: '',
    interests: [],
    avatar_preset: 'default',
    location_sharing_enabled: true,
    notifications_enabled: true
  });
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          nickname: data.nickname || '',
          age: data.age || undefined,
          gender: data.gender || '',
          interests: data.interests || [],
          avatar_preset: data.avatar_preset || 'default',
          location_sharing_enabled: data.location_sharing_enabled ?? true,
          notifications_enabled: data.notifications_enabled ?? true
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error(t('common.error'));
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nickname: profile.nickname,
          age: profile.age,
          gender: profile.gender,
          interests: profile.interests,
          avatar_preset: profile.avatar_preset,
          location_sharing_enabled: profile.location_sharing_enabled,
          notifications_enabled: profile.notifications_enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success(t('common.success'));
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
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

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success(t('auth.signOut'));
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error(t('common.error'));
    }
  };

  const sendPasswordReset = async () => {
    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin
      });

      if (error) throw error;
      toast.success('Password reset email sent!');
      setShowPasswordReset(false);
      setResetEmail('');
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast.error('Failed to send password reset email');
    }
  };

  const suggestedInterests = [
    'Sports', 'Music', 'Food', 'Travel', 'Technology', 'Art', 'Gaming', 
    'Reading', 'Movies', 'Photography', 'Fitness', 'Cooking'
  ];

  const addInterest = (interest: string) => {
    if (interest && !profile.interests.includes(interest)) {
      setProfile(prev => ({
        ...prev,
        interests: [...prev.interests, interest]
      }));
    }
  };

  const removeInterest = (interest: string) => {
    setProfile(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest)
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 pb-20">
      <div className="container mx-auto max-w-4xl px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <Settings className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-responsive-xl font-bold text-foreground">{t('settings.title')}</h1>
          <p className="text-muted-foreground max-w-md mx-auto">{t('settings.subtitle')}</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-slide-in-right">
          <Button
            onClick={toggleTheme}
            variant="outline"
            className="h-20 flex-col space-y-2 card-modern"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span className="text-xs">{isDark ? t('settings.lightMode') : t('settings.darkMode')}</span>
          </Button>
          
          <Button
            onClick={handleLanguageSwitch}
            variant="outline"
            className="h-20 flex-col space-y-2 card-modern"
          >
            <Languages className="w-5 h-5" />
            <span className="text-xs">{language === 'en' ? 'العربية' : 'English'}</span>
          </Button>
          
          <Button
            onClick={saveProfile}
            disabled={loading}
            className="h-20 flex-col space-y-2 card-modern bg-primary text-primary-foreground"
          >
            <Check className="w-5 h-5" />
            <span className="text-xs">{loading ? t('common.loading') : t('common.save')}</span>
          </Button>
          
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="h-20 flex-col space-y-2 card-modern border-destructive/20 hover:bg-destructive/10"
          >
            <X className="w-5 h-5 text-destructive" />
            <span className="text-xs text-destructive">{t('auth.signOut')}</span>
          </Button>
        </div>

        {/* Profile Section */}
        <Card className="card-modern animate-fade-in-up">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-responsive-lg">
              <User className="w-5 h-5 mr-3 text-primary" />
              {t('profile.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nickname" className="text-sm font-medium">
                  {t('profile.nickname')}
                </Label>
                <Input
                  id="nickname"
                  value={profile.nickname}
                  onChange={(e) => setProfile(prev => ({ ...prev, nickname: e.target.value }))}
                  placeholder={t('profile.nickname')}
                  className="h-12"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="age" className="text-sm font-medium">
                  {t('profile.age')}
                </Label>
                <Input
                  id="age"
                  type="number"
                  value={profile.age || ''}
                  onChange={(e) => setProfile(prev => ({ 
                    ...prev, 
                    age: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  placeholder={t('profile.age')}
                  className="h-12"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gender" className="text-sm font-medium">
                {t('profile.gender')}
              </Label>
              <Select value={profile.gender} onValueChange={(value) => setProfile(prev => ({ ...prev, gender: value }))}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder={t('profile.gender')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t('profile.male')}</SelectItem>
                  <SelectItem value="female">{t('profile.female')}</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">{t('profile.interests')}</Label>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map(interest => (
                  <Badge
                    key={interest}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive/20 transition-colors px-3 py-1"
                    onClick={() => removeInterest(interest)}
                  >
                    {interest} <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedInterests
                  .filter(interest => !profile.interests.includes(interest))
                  .map(interest => (
                    <Badge
                      key={interest}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 transition-colors px-3 py-1"
                      onClick={() => addInterest(interest)}
                    >
                      + {interest}
                    </Badge>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Appearance */}
          <Card className="card-modern animate-fade-in-up">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg">
                <Palette className="w-5 h-5 mr-3 text-primary" />
                {t('settings.appearance')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium">{t('settings.darkMode')}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('settings.darkModeDesc')}
                  </div>
                </div>
                <Switch checked={isDark} onCheckedChange={toggleTheme} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium">{t('settings.language')}</div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'en' ? 'English' : 'العربية'}
                  </div>
                </div>
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <Globe className="w-3 h-3" />
                  <span>{language.toUpperCase()}</span>
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card className="card-modern animate-fade-in-up">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg">
                <Shield className="w-5 h-5 mr-3 text-primary" />
                Privacy & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium">Location Sharing</div>
                  <div className="text-sm text-muted-foreground">
                    Allow others to see your location
                  </div>
                </div>
                <Switch
                  checked={profile.location_sharing_enabled}
                  onCheckedChange={(checked) => setProfile(prev => ({ ...prev, location_sharing_enabled: checked }))}
                />
              </div>

              <Separator />

              {!showPasswordReset ? (
                <Button 
                  variant="outline" 
                  onClick={() => setShowPasswordReset(true)}
                  className="w-full"
                >
                  Reset Password
                </Button>
              ) : (
                <div className="space-y-3">
                  <Input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="h-12"
                  />
                  <div className="flex space-x-2">
                    <Button onClick={sendPasswordReset} className="flex-1">
                      Send Reset Email
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowPasswordReset(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="card-modern animate-fade-in-up">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg">
                <Bell className="w-5 h-5 mr-3 text-primary" />
                {t('settings.notifications')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium">Push Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Receive notifications for events and messages
                  </div>
                </div>
                <Switch
                  checked={profile.notifications_enabled}
                  onCheckedChange={(checked) => setProfile(prev => ({ ...prev, notifications_enabled: checked }))}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium">Sound Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Play sounds for notifications
                  </div>
                </div>
                <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium">Haptic Feedback</div>
                  <div className="text-sm text-muted-foreground">
                    Feel vibrations for interactions
                  </div>
                </div>
                <Switch checked={hapticEnabled} onCheckedChange={setHapticEnabled} />
              </div>
            </CardContent>
          </Card>

          {/* Device Info */}
          <Card className="card-modern animate-fade-in-up">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg">
                <Smartphone className="w-5 h-5 mr-3 text-primary" />
                Device Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Platform</span>
                <Badge variant="outline">
                  {navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Text Direction</span>
                <Badge variant="outline">
                  {isRTL ? 'RTL' : 'LTR'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Version</span>
                <Badge variant="outline">v1.0.0</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ModernSettings;
