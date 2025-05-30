
import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Moon, 
  Sun, 
  Globe, 
  User, 
  Bell, 
  Shield, 
  Palette,
  Smartphone,
  Languages,
  Volume2,
  Vibrate,
  Check,
  X,
  ChevronRight,
  Edit3,
  Save,
  Camera,
  Mail,
  Calendar
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
  const [editingProfile, setEditingProfile] = useState(false);

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
      toast.error('Failed to load profile');
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
      toast.success('Profile updated successfully!');
      setEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
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
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
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

  const avatarPresets = [
    { name: 'default', gradient: 'from-blue-500 to-purple-600' },
    { name: 'casual', gradient: 'from-green-500 to-teal-600' },
    { name: 'business', gradient: 'from-gray-500 to-slate-600' },
    { name: 'creative', gradient: 'from-purple-500 to-pink-600' },
    { name: 'sporty', gradient: 'from-orange-500 to-red-600' },
    { name: 'elegant', gradient: 'from-indigo-500 to-purple-600' }
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

  const getAvatarGradient = (preset: string) => {
    const found = avatarPresets.find(p => p.name === preset);
    return found?.gradient || 'from-blue-500 to-purple-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/5 pb-20">
      <div className="container mx-auto max-w-6xl px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl mb-4 sm:mb-6">
            <Settings className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm sm:text-base lg:text-lg max-w-md mx-auto">
            Customize your experience and manage your preferences
          </p>
        </div>

        {/* User Profile Section */}
        {user && (
          <Card className="card-modern">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="flex items-center space-x-3 text-lg sm:text-xl">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                    <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span>Profile</span>
                </CardTitle>
                <Button
                  onClick={() => editingProfile ? saveProfile() : setEditingProfile(true)}
                  disabled={loading}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  {editingProfile ? (
                    loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit Profile
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar and Basic Info */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="flex flex-col items-center space-y-3">
                  <div className={`w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br ${getAvatarGradient(profile.avatar_preset)} rounded-full flex items-center justify-center shadow-lg`}>
                    <User className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                  </div>
                  {editingProfile && (
                    <Button variant="outline" size="sm" className="text-xs">
                      <Camera className="w-3 h-3 mr-1" />
                      Change
                    </Button>
                  )}
                </div>
                
                <div className="flex-1 w-full space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Member Since</Label>
                      <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{new Date(user.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Nickname</Label>
                      {editingProfile ? (
                        <Input
                          value={profile.nickname}
                          onChange={(e) => setProfile(prev => ({ ...prev, nickname: e.target.value }))}
                          placeholder="Enter your nickname"
                          className="h-11"
                        />
                      ) : (
                        <div className="h-11 px-3 py-2 bg-muted/50 rounded-lg flex items-center">
                          <span className="text-foreground">{profile.nickname || 'Not set'}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Age</Label>
                      {editingProfile ? (
                        <Input
                          type="number"
                          value={profile.age || ''}
                          onChange={(e) => setProfile(prev => ({ 
                            ...prev, 
                            age: e.target.value ? parseInt(e.target.value) : undefined 
                          }))}
                          placeholder="Age"
                          className="h-11"
                        />
                      ) : (
                        <div className="h-11 px-3 py-2 bg-muted/50 rounded-lg flex items-center">
                          <span className="text-foreground">{profile.age || 'Not set'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Gender</Label>
                    {editingProfile ? (
                      <Select value={profile.gender} onValueChange={(value) => setProfile(prev => ({ ...prev, gender: value }))}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="h-11 px-3 py-2 bg-muted/50 rounded-lg flex items-center">
                        <span className="text-foreground">{profile.gender || 'Not set'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Avatar Styles */}
              {editingProfile && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground">Avatar Style</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {avatarPresets.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => setProfile(prev => ({ ...prev, avatar_preset: preset.name }))}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          profile.avatar_preset === preset.name
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className={`w-8 h-8 bg-gradient-to-br ${preset.gradient} rounded-full mx-auto mb-2 flex items-center justify-center`}>
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs text-muted-foreground capitalize">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Interests */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-muted-foreground">Interests</Label>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map(interest => (
                    <Badge
                      key={interest}
                      variant="secondary"
                      className={`px-3 py-1 ${editingProfile ? 'cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors' : ''}`}
                      onClick={() => editingProfile && removeInterest(interest)}
                    >
                      {interest} {editingProfile && <X className="w-3 h-3 ml-1" />}
                    </Badge>
                  ))}
                </div>
                {editingProfile && (
                  <div className="flex flex-wrap gap-2">
                    {suggestedInterests
                      .filter(interest => !profile.interests.includes(interest))
                      .slice(0, 8)
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
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Button
            onClick={toggleTheme}
            variant="outline"
            className="h-20 sm:h-24 flex-col space-y-2 sm:space-y-3 card-modern group hover:scale-105 transition-all duration-300"
          >
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              {isDark ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />}
            </div>
            <span className="text-xs font-medium">{isDark ? 'Light' : 'Dark'}</span>
          </Button>
          
          <Button
            onClick={handleLanguageSwitch}
            variant="outline"
            className="h-20 sm:h-24 flex-col space-y-2 sm:space-y-3 card-modern group hover:scale-105 transition-all duration-300"
          >
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Languages className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <span className="text-xs font-medium">{language === 'en' ? 'عربي' : 'English'}</span>
          </Button>
          
          <Button
            onClick={saveProfile}
            disabled={loading}
            className="h-20 sm:h-24 flex-col space-y-2 sm:space-y-3 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 hover:scale-105 transition-all duration-300"
          >
            <div className="p-2 rounded-lg bg-white/20">
              {loading ? (
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </div>
            <span className="text-xs font-medium">{loading ? 'Saving...' : 'Save'}</span>
          </Button>
          
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="h-20 sm:h-24 flex-col space-y-2 sm:space-y-3 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 hover:scale-105 transition-all duration-300"
          >
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20">
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-xs font-medium text-red-600 dark:text-red-400">Sign Out</span>
          </Button>
        </div>

        {/* Settings Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Privacy & Security */}
          <Card className="card-modern">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                    <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <span>Privacy & Security</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 sm:p-4 bg-muted/30 rounded-lg">
                <div>
                  <div className="font-medium text-sm sm:text-base">Location Sharing</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Allow others to see your location
                  </div>
                </div>
                <Switch
                  checked={profile.location_sharing_enabled}
                  onCheckedChange={(checked) => setProfile(prev => ({ ...prev, location_sharing_enabled: checked }))}
                />
              </div>

              {!showPasswordReset ? (
                <Button 
                  variant="outline" 
                  onClick={() => setShowPasswordReset(true)}
                  className="w-full h-11 sm:h-12"
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
                    className="h-11 sm:h-12"
                  />
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button onClick={sendPasswordReset} className="flex-1 h-11 sm:h-12">
                      Send Reset Email
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowPasswordReset(false)}
                      className="h-11 sm:h-12"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notifications & Sound */}
          <Card className="card-modern">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                    <Bell className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span>Notifications</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 sm:p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Bell className="w-4 h-4" />
                  <div>
                    <div className="font-medium text-sm sm:text-base">Push Notifications</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Proximity alerts</div>
                  </div>
                </div>
                <Switch
                  checked={profile.notifications_enabled}
                  onCheckedChange={(checked) => setProfile(prev => ({ ...prev, notifications_enabled: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 sm:p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Volume2 className="w-4 h-4" />
                  <div>
                    <div className="font-medium text-sm sm:text-base">Sound Effects</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Audio feedback</div>
                  </div>
                </div>
                <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
              </div>

              <div className="flex items-center justify-between p-3 sm:p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Vibrate className="w-4 h-4" />
                  <div>
                    <div className="font-medium text-sm sm:text-base">Haptic Feedback</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Touch vibrations</div>
                  </div>
                </div>
                <Switch checked={hapticEnabled} onCheckedChange={setHapticEnabled} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Device Info */}
        <Card className="card-modern">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3 text-lg">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                <Smartphone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <span>Device Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="text-center p-3 sm:p-4 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground">Platform</div>
                <Badge variant="outline" className="mt-2">
                  {navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}
                </Badge>
              </div>
              <div className="text-center p-3 sm:p-4 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground">Text Direction</div>
                <Badge variant="outline" className="mt-2">
                  {isRTL ? 'RTL' : 'LTR'}
                </Badge>
              </div>
              <div className="text-center p-3 sm:p-4 bg-muted/30 rounded-lg sm:col-span-2 lg:col-span-1">
                <div className="text-sm text-muted-foreground">Version</div>
                <Badge variant="outline" className="mt-2">v1.0.0</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ModernSettings;
