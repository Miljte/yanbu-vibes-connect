
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { User, Edit3, Save, LogOut, Crown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { useLocalization } from '@/contexts/LocalizationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ModernProfile = () => {
  const { user, signOut } = useAuth();
  const { userRole } = useRoles();
  const { t, isRTL } = useLocalization();
  const [profile, setProfile] = useState({
    nickname: '',
    age: '',
    gender: '',
    interests: [] as string[],
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
    const roleColors = {
      admin: 'bg-red-500 text-white',
      merchant: 'bg-purple-500 text-white',
      user: 'bg-blue-500 text-white',
    };

    return (
      <Badge className={`${roleColors[userRole]} flex items-center space-x-1`}>
        {userRole === 'admin' && <Crown className="w-3 h-3" />}
        <span className="capitalize">{userRole}</span>
      </Badge>
    );
  };

  if (!user) {
    return (
      <div className={`min-h-screen bg-gray-50 p-4 pb-20 ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="container mx-auto max-w-2xl">
          <Card className="bg-white border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Please sign in to view your profile</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 p-4 pb-20 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('profile.title')}</h1>
          <div className="flex justify-center">
            {getRoleBadge()}
          </div>
        </div>

        {/* Profile Card */}
        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-gray-900">Profile Information</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center space-x-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>{isEditing ? t('common.cancel') : t('common.edit')}</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-12 h-12 text-white" />
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="nickname">{t('profile.nickname')}</Label>
                <Input
                  id="nickname"
                  value={profile.nickname}
                  onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="age">{t('profile.age')}</Label>
                <Input
                  id="age"
                  type="number"
                  value={profile.age}
                  onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>{t('profile.gender')}</Label>
                <Select
                  value={profile.gender}
                  onValueChange={(value) => setProfile({ ...profile, gender: value })}
                  disabled={!isEditing}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t('profile.male')}</SelectItem>
                    <SelectItem value="female">{t('profile.female')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('profile.interests')}</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {['Coffee', 'Food', 'Shopping', 'Events', 'Music', 'Sports'].map((interest) => (
                    <Button
                      key={interest}
                      variant={profile.interests.includes(interest) ? "default" : "outline"}
                      size="sm"
                      disabled={!isEditing}
                      onClick={() => {
                        if (profile.interests.includes(interest)) {
                          setProfile({
                            ...profile,
                            interests: profile.interests.filter(i => i !== interest)
                          });
                        } else {
                          setProfile({
                            ...profile,
                            interests: [...profile.interests, interest]
                          });
                        }
                      }}
                      className="rounded-full"
                    >
                      {interest}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <Button
                onClick={updateProfile}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? t('common.loading') : t('profile.updateProfile')}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardContent className="p-6">
            <Button
              onClick={signOut}
              variant="outline"
              className="w-full border-red-200 text-red-600 hover:bg-red-50 rounded-xl py-3"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('profile.signOut')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ModernProfile;
