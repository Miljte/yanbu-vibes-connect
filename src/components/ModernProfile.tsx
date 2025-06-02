
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { User, Edit3, Save, Crown, Camera, Mail, Calendar, MapPin, Heart, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { useLocalization } from '@/contexts/LocalizationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ModernProfile = () => {
  const { user } = useAuth();
  const { userRole } = useRoles();
  const { t, isRTL } = useLocalization();
  const [profile, setProfile] = useState({
    nickname: '',
    age: '',
    gender: '',
    interests: [] as string[],
    avatar_preset: 'default'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile({
        nickname: data.nickname || '',
        age: data.age?.toString() || '',
        gender: data.gender || '',
        interests: data.interests || [],
        avatar_preset: data.avatar_preset || 'default'
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nickname: profile.nickname,
          age: profile.age ? parseInt(profile.age) : null,
          gender: profile.gender,
          interests: profile.interests,
          avatar_preset: profile.avatar_preset,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = () => {
    const roleConfig = {
      admin: { color: 'bg-gradient-to-r from-red-500 to-red-600 text-white', icon: Crown },
      merchant: { color: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white', icon: Star },
      user: { color: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white', icon: User },
    };

    const config = roleConfig[userRole] || roleConfig.user;
    const IconComponent = config.icon;

    return (
      <Badge className={`${config.color} flex items-center space-x-1 px-3 py-1 shadow-lg`}>
        <IconComponent className="w-3 h-3" />
        <span className="capitalize font-medium">{userRole}</span>
      </Badge>
    );
  };

  const avatarPresets = [
    { name: 'default', gradient: 'from-blue-500 to-purple-600', emoji: '😊' },
    { name: 'casual', gradient: 'from-green-500 to-teal-600', emoji: '😎' },
    { name: 'business', gradient: 'from-gray-500 to-slate-600', emoji: '💼' },
    { name: 'creative', gradient: 'from-purple-500 to-pink-600', emoji: '🎨' },
    { name: 'sporty', gradient: 'from-orange-500 to-red-600', emoji: '⚽' },
    { name: 'elegant', gradient: 'from-indigo-500 to-purple-600', emoji: '✨' }
  ];

  const getAvatarConfig = (preset: string) => {
    return avatarPresets.find(p => p.name === preset) || avatarPresets[0];
  };

  const suggestedInterests = [
    'Coffee', 'Food', 'Shopping', 'Events', 'Music', 'Sports', 
    'Travel', 'Art', 'Technology', 'Gaming', 'Reading', 'Movies'
  ];

  if (!user) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 flex items-center justify-center ${isRTL ? 'rtl' : 'ltr'}`}>
        <Card className="bg-background border-0 shadow-xl max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Profile Access</h3>
            <p className="text-muted-foreground">Please sign in to view your profile</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const avatarConfig = getAvatarConfig(profile.avatar_preset);

  return (
    <div className={`min-h-screen bg-gradient-to-br from-background via-background to-muted/5 p-4 pb-20 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            {t('profile.title')}
          </h1>
          <div className="flex justify-center">
            {getRoleBadge()}
          </div>
        </div>

        {/* Profile Card */}
        <Card className="bg-background/80 backdrop-blur-lg border-0 shadow-xl rounded-3xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-foreground flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <span>Profile Information</span>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                <span>{isEditing ? t('common.cancel') : t('common.edit')}</span>
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative group">
                <div className={`w-24 h-24 bg-gradient-to-br ${avatarConfig.gradient} rounded-full flex items-center justify-center shadow-lg ring-4 ring-white/20 transition-all duration-300 group-hover:scale-105`}>
                  <span className="text-3xl">{avatarConfig.emoji}</span>
                </div>
                {isEditing && (
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform">
                    <Camera className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              
              {/* Avatar Presets */}
              {isEditing && (
                <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
                  {avatarPresets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => setProfile(prev => ({ ...prev, avatar_preset: preset.name }))}
                      className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                        profile.avatar_preset === preset.name
                          ? 'border-primary bg-primary/10 scale-105'
                          : 'border-border hover:border-primary/50 hover:scale-105'
                      }`}
                    >
                      <div className={`w-8 h-8 bg-gradient-to-br ${preset.gradient} rounded-full mx-auto mb-1 flex items-center justify-center`}>
                        <span className="text-sm">{preset.emoji}</span>
                      </div>
                      <span className="text-xs text-muted-foreground capitalize">{preset.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>Email</span>
                </Label>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm text-foreground">{user.email}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Member Since</span>
                </Label>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm text-foreground">{new Date(user.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="nickname" className="text-sm font-medium text-muted-foreground">
                  {t('profile.nickname')}
                </Label>
                {isEditing ? (
                  <Input
                    id="nickname"
                    value={profile.nickname}
                    onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
                    placeholder="Enter your nickname"
                    className="mt-2 h-11 rounded-lg"
                  />
                ) : (
                  <div className="mt-2 h-11 px-3 py-2 bg-muted/30 rounded-lg flex items-center">
                    <span className="text-foreground">{profile.nickname || 'Not set'}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t('profile.age')}</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={profile.age}
                      onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                      placeholder="Age"
                      className="mt-2 h-11 rounded-lg"
                    />
                  ) : (
                    <div className="mt-2 h-11 px-3 py-2 bg-muted/30 rounded-lg flex items-center">
                      <span className="text-foreground">{profile.age || 'Not set'}</span>
                    </div>
                  )}
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t('profile.gender')}</Label>
                  {isEditing ? (
                    <Select value={profile.gender} onValueChange={(value) => setProfile({ ...profile, gender: value })}>
                      <SelectTrigger className="mt-2 h-11 rounded-lg">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{t('profile.male')}</SelectItem>
                        <SelectItem value="female">{t('profile.female')}</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-2 h-11 px-3 py-2 bg-muted/30 rounded-lg flex items-center">
                      <span className="text-foreground">{profile.gender || 'Not set'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Interests */}
              <div>
                <Label className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
                  <Heart className="w-4 h-4" />
                  <span>{t('profile.interests')}</span>
                </Label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.interests.map(interest => (
                    <Badge
                      key={interest}
                      variant="secondary"
                      className={`px-3 py-1 rounded-full ${
                        isEditing 
                          ? 'cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors' 
                          : ''
                      }`}
                      onClick={() => {
                        if (isEditing) {
                          setProfile(prev => ({
                            ...prev,
                            interests: prev.interests.filter(i => i !== interest)
                          }));
                        }
                      }}
                    >
                      {interest} {isEditing && <span className="ml-1">×</span>}
                    </Badge>
                  ))}
                </div>
                
                {isEditing && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {suggestedInterests
                      .filter(interest => !profile.interests.includes(interest))
                      .slice(0, 8)
                      .map(interest => (
                        <Badge
                          key={interest}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/10 transition-colors px-3 py-1 rounded-full"
                          onClick={() => {
                            setProfile(prev => ({
                              ...prev,
                              interests: [...prev.interests, interest]
                            }));
                          }}
                        >
                          + {interest}
                        </Badge>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            {isEditing && (
              <Button
                onClick={updateProfile}
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground rounded-xl py-3 h-12 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? t('common.loading') : t('profile.updateProfile')}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ModernProfile;
