
import React, { useState, useEffect } from 'react';
import { User, Settings, Crown, Shield, Store, LogOut, Edit, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ModernProfileProps {
  onNavigate: (section: string) => void;
}

interface Profile {
  id: string;
  nickname: string;
  age?: number;
  gender?: string;
  interests?: string[];
  avatar_preset?: string;
  location_sharing_enabled?: boolean;
  notifications_enabled?: boolean;
}

const ModernProfile = ({ onNavigate }: ModernProfileProps) => {
  const { user, signOut } = useAuth();
  const { userRole, isAdmin, isMerchant } = useRoles();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    nickname: '',
    age: '',
    gender: '',
  });

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

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile(data);
        setEditForm({
          nickname: data.nickname || '',
          age: data.age?.toString() || '',
          gender: data.gender || '',
        });
      } else {
        // Create profile if it doesn't exist
        await createProfile();
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  const createProfile = async () => {
    if (!user) return;

    try {
      const newProfile = {
        id: user.id,
        nickname: `User_${user.id.substring(0, 8)}`,
        location_sharing_enabled: true,
        notifications_enabled: true,
        avatar_preset: 'default'
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      setEditForm({
        nickname: data.nickname,
        age: '',
        gender: '',
      });
    } catch (error) {
      console.error('Error creating profile:', error);
      toast.error('Failed to create profile');
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;

    try {
      const updates = {
        nickname: editForm.nickname || profile.nickname,
        age: editForm.age ? parseInt(editForm.age) : null,
        gender: editForm.gender || null,
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
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

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-4 pb-20">
        <div className="container mx-auto max-w-2xl">
          <Card className="bg-card border">
            <CardContent className="p-6 text-center">
              <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-bold text-foreground mb-2">Not Signed In</h2>
              <p className="text-muted-foreground">Please sign in to view your profile</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="container mx-auto max-w-2xl space-y-6">
        {/* Profile Header */}
        <Card className="bg-card border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{profile?.nickname || 'Loading...'}</h2>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {userRole || 'user'}
                    </Badge>
                    {isAdmin && <Crown className="w-4 h-4 text-yellow-500" />}
                    {isMerchant && <Store className="w-4 h-4 text-blue-500" />}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <Input
                  placeholder="Nickname"
                  value={editForm.nickname}
                  onChange={(e) => setEditForm({...editForm, nickname: e.target.value})}
                />
                <Input
                  type="number"
                  placeholder="Age"
                  value={editForm.age}
                  onChange={(e) => setEditForm({...editForm, age: e.target.value})}
                />
                <Input
                  placeholder="Gender"
                  value={editForm.gender}
                  onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                />
                <Button onClick={handleSaveProfile} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {profile?.age && (
                  <p className="text-muted-foreground">Age: {profile.age}</p>
                )}
                {profile?.gender && (
                  <p className="text-muted-foreground">Gender: {profile.gender}</p>
                )}
                <p className="text-muted-foreground text-sm">ID: {user.id.substring(0, 8)}...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-card border">
          <CardHeader>
            <CardTitle className="text-foreground">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isAdmin && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => onNavigate('admin')}
              >
                <Shield className="w-4 h-4 mr-2" />
                Admin Dashboard
              </Button>
            )}
            
            {isMerchant && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => onNavigate('merchant')}
              >
                <Store className="w-4 h-4 mr-2" />
                Merchant Dashboard
              </Button>
            )}
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => onNavigate('settings')}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card className="bg-card border">
          <CardHeader>
            <CardTitle className="text-foreground">Account</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={handleSignOut}
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* Debug Info (only show for admins) */}
        {isAdmin && (
          <Card className="bg-muted/20 border-dashed">
            <CardHeader>
              <CardTitle className="text-foreground text-sm">Debug Info</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>User Role: {userRole}</p>
              <p>Is Admin: {isAdmin ? 'Yes' : 'No'}</p>
              <p>Is Merchant: {isMerchant ? 'Yes' : 'No'}</p>
              <p>User ID: {user.id}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ModernProfile;
