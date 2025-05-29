import React, { useState, useEffect } from 'react';
import { Settings, Moon, Sun, Globe, User, Bell, MapPin, Shield, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
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
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

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

      toast.success('Password reset email sent! Check your inbox.');
      setShowPasswordReset(false);
      setResetEmail('');
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast.error('Failed to send password reset email');
    }
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

  const suggestedInterests = [
    'Sports', 'Music', 'Food', 'Travel', 'Technology', 'Art', 'Gaming', 
    'Reading', 'Movies', 'Photography', 'Fitness', 'Cooking'
  ];

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">⚙️ Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences and privacy settings</p>
        </div>

        <div className="space-y-6">
          {/* Profile Settings */}
          <Card className="bg-card border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center">
                <User className="w-5 h-5 mr-2" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nickname">Display Name</Label>
                  <Input
                    id="nickname"
                    value={profile.nickname}
                    onChange={(e) => setProfile(prev => ({ ...prev, nickname: e.target.value }))}
                    placeholder="How others see you"
                  />
                </div>
                <div>
                  <Label htmlFor="age">Age (Optional)</Label>
                  <Input
                    id="age"
                    type="number"
                    value={profile.age || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, age: e.target.value ? parseInt(e.target.value) : undefined }))}
                    placeholder="Your age"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="gender">Gender (Optional)</Label>
                <Select value={profile.gender} onValueChange={(value) => setProfile(prev => ({ ...prev, gender: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Interests</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {profile.interests.map(interest => (
                    <Badge
                      key={interest}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive"
                      onClick={() => removeInterest(interest)}
                    >
                      {interest} ×
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
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => addInterest(interest)}
                      >
                        + {interest}
                      </Badge>
                    ))}
                </div>
              </div>

              <Button onClick={saveProfile} disabled={loading} className="w-full">
                {loading ? 'Saving...' : 'Save Profile'}
              </Button>
            </CardContent>
          </Card>

          {/* App Preferences */}
          <Card className="bg-card border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                App Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  <div>
                    <Label>Theme</Label>
                    <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                  </div>
                </div>
                <Switch
                  checked={isDark}
                  onCheckedChange={toggleTheme}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5" />
                  <div>
                    <Label>Location Sharing</Label>
                    <p className="text-sm text-muted-foreground">Allow others to see your location</p>
                  </div>
                </div>
                <Switch
                  checked={profile.location_sharing_enabled}
                  onCheckedChange={(checked) => setProfile(prev => ({ ...prev, location_sharing_enabled: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="w-5 h-5" />
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications for events and messages</p>
                  </div>
                </div>
                <Switch
                  checked={profile.notifications_enabled}
                  onCheckedChange={(checked) => setProfile(prev => ({ ...prev, notifications_enabled: checked }))}
                />
              </div>

              <Button onClick={saveProfile} disabled={loading} variant="outline" className="w-full">
                {loading ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="bg-card border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Security & Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showPasswordReset ? (
                <Button 
                  variant="outline" 
                  onClick={() => setShowPasswordReset(true)}
                  className="w-full"
                >
                  Reset Password
                </Button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="reset-email">Email for Password Reset</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Enter your email address"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={sendPasswordReset} className="flex-1">
                      Send Reset Email
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowPasswordReset(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <Button 
                variant="destructive" 
                onClick={handleSignOut}
                className="w-full"
              >
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ModernSettings;
