import React, { useState, useEffect } from 'react';
import { Shield, Users, Eye, Ban, Crown, Trash2, MessageSquare, MapPin, Settings, UserX, Volume2, VolumeX, UserCheck, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface User {
  id: string;
  nickname: string;
  email?: string;
  created_at: string;
  role: string;
  is_banned: boolean;
  is_muted: boolean;
  last_seen?: string;
  is_online: boolean;
  location?: { latitude: number; longitude: number };
  age?: number;
  gender?: string;
}

interface AdminLog {
  id: string;
  action_type: string;
  target_user_id?: string;
  details: any;
  created_at: string;
  admin_nickname: string;
}

const SuperAdminDashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { user } = useAuth();

  useEffect(() => {
    initializeDashboard();
    setupRealtimeSubscriptions();
    
    // Auto-refresh every 30 seconds for real-time updates
    const refreshInterval = setInterval(() => {
      fetchAllUsers();
      setLastRefresh(new Date());
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, []);

  const initializeDashboard = async () => {
    setLoading(true);
    console.log('🚀 Initializing Super Admin Dashboard...');
    await Promise.all([
      syncUsersIfNeeded(),
      fetchAllUsers(),
      fetchAdminLogs()
    ]);
    setLoading(false);
  };

  const syncUsersIfNeeded = async () => {
    try {
      setSyncing(true);
      console.log('🔄 Force syncing all auth users to profiles...');
      
      const { data, error } = await supabase.functions.invoke('sync-users');
      
      if (error) {
        console.error('❌ Sync error:', error);
        toast.error('Failed to sync users');
        return;
      }

      console.log('✅ Sync result:', data);
      if (data?.createdProfiles > 0) {
        toast.success(`Synced ${data.createdProfiles} new users`);
      }
    } catch (error) {
      console.error('❌ Sync failed:', error);
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      console.log('👥 Fetching ALL users from database...');
      
      // Step 1: Get ALL auth users (this requires admin privileges)
      console.log('🔓 Attempting to fetch auth users with admin privileges...');
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
      
      let allAuthUsers = [];
      if (authError) {
        console.error('❌ Auth admin access failed:', authError);
        console.log('⚠️ Falling back to profiles-only approach...');
      } else {
        allAuthUsers = authData.users || [];
        console.log(`✅ Found ${allAuthUsers.length} auth users via admin API`);
      }

      // Step 2: Get ALL profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
        throw profilesError;
      }

      console.log(`✅ Found ${profilesData?.length || 0} profiles`);

      // Step 3: Get supporting data
      const [rolesData, locationsData, allLocationsData, bansData, mutesData] = await Promise.all([
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('user_locations').select('user_id, latitude, longitude, updated_at').gte('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()),
        supabase.from('user_locations').select('user_id, updated_at'),
        supabase.from('user_bans').select('user_id').eq('is_active', true),
        supabase.from('user_mutes').select('user_id').eq('is_active', true)
      ]);

      console.log('✅ Supporting data fetched');

      // Step 4: Create a comprehensive user list from both auth users and profiles
      const userMap = new Map();

      // Add all auth users first (if we have admin access)
      allAuthUsers.forEach(authUser => {
        const profile = profilesData?.find(p => p.id === authUser.id);
        const userRole = rolesData.data?.find(role => role.user_id === authUser.id);
        const recentLocation = locationsData.data?.find(loc => loc.user_id === authUser.id);
        const lastLocation = allLocationsData.data?.find(loc => loc.user_id === authUser.id);
        const isBanned = bansData.data?.some(ban => ban.user_id === authUser.id);
        const isMuted = mutesData.data?.some(mute => mute.user_id === authUser.id);

        userMap.set(authUser.id, {
          id: authUser.id,
          nickname: profile?.nickname || authUser.email?.split('@')[0] || 'Unknown User',
          email: authUser.email || '',
          created_at: authUser.created_at,
          role: userRole?.role || 'user',
          is_banned: isBanned || false,
          is_muted: isMuted || false,
          last_seen: lastLocation?.updated_at || authUser.created_at,
          is_online: !!recentLocation,
          location: recentLocation ? { 
            latitude: recentLocation.latitude, 
            longitude: recentLocation.longitude 
          } : undefined,
          age: profile?.age,
          gender: profile?.gender
        });
      });

      // Add any profiles that might not have been in auth users
      profilesData?.forEach(profile => {
        if (!userMap.has(profile.id)) {
          const userRole = rolesData.data?.find(role => role.user_id === profile.id);
          const recentLocation = locationsData.data?.find(loc => loc.user_id === profile.id);
          const lastLocation = allLocationsData.data?.find(loc => loc.user_id === profile.id);
          const isBanned = bansData.data?.some(ban => ban.user_id === profile.id);
          const isMuted = mutesData.data?.some(mute => mute.user_id === profile.id);

          userMap.set(profile.id, {
            id: profile.id,
            nickname: profile.nickname || 'Unknown User',
            email: '', // No email available from profiles only
            created_at: profile.created_at,
            role: userRole?.role || 'user',
            is_banned: isBanned || false,
            is_muted: isMuted || false,
            last_seen: lastLocation?.updated_at || profile.created_at,
            is_online: !!recentLocation,
            location: recentLocation ? { 
              latitude: recentLocation.latitude, 
              longitude: recentLocation.longitude 
            } : undefined,
            age: profile.age,
            gender: profile.gender
          });
        }
      });

      const allUsers = Array.from(userMap.values());
      
      console.log(`✅ Final user count: ${allUsers.length} total users`);
      console.log(`🟢 Online users: ${allUsers.filter(u => u.is_online).length}`);
      console.log(`🔴 Offline users: ${allUsers.filter(u => !u.is_online).length}`);
      console.log(`👤 User breakdown:`, {
        admins: allUsers.filter(u => u.role === 'admin').length,
        merchants: allUsers.filter(u => u.role === 'merchant').length,
        users: allUsers.filter(u => u.role === 'user').length
      });
      
      setUsers(allUsers);
      
      if (allUsers.length === 0) {
        console.log('⚠️ No users found - this might indicate a permissions issue');
        toast.error('No users found. Check admin permissions or run sync.');
      }
      
    } catch (error) {
      console.error('❌ Critical error fetching users:', error);
      toast.error('Failed to load users: ' + error.message);
      
      // Emergency fallback - try to get current user at least
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

          if (profile) {
            setUsers([{
              id: currentUser.id,
              nickname: profile.nickname || 'Current User',
              email: currentUser.email || '',
              created_at: currentUser.created_at,
              role: 'admin', // Assume admin since they're accessing this panel
              is_banned: false,
              is_muted: false,
              last_seen: new Date().toISOString(),
              is_online: true,
              location: undefined,
              age: profile.age,
              gender: profile.gender
            }]);
            console.log('✅ Fallback: Loaded current user only');
          }
        }
      } catch (fallbackError) {
        console.error('❌ Even fallback failed:', fallbackError);
      }
    }
  };

  const fetchAdminLogs = async () => {
    try {
      const { data: logsData } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsData) {
        const adminIds = logsData.map(log => log.admin_id).filter(Boolean);
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('id, nickname')
          .in('id', adminIds);

        const logsWithNames = logsData.map(log => ({
          ...log,
          admin_nickname: adminProfiles?.find(p => p.id === log.admin_id)?.nickname || 'Unknown Admin'
        }));

        setAdminLogs(logsWithNames);
      }
    } catch (error) {
      console.error('❌ Error fetching admin logs:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Real-time subscription for user locations (online status)
    const locationsChannel = supabase
      .channel('admin-locations')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'user_locations' 
      }, () => {
        console.log('📍 Location update detected, refreshing users...');
        fetchAllUsers();
      })
      .subscribe();

    // Real-time subscription for profiles
    const profilesChannel = supabase
      .channel('admin-profiles')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles' 
      }, () => {
        console.log('👤 Profile update detected, refreshing users...');
        fetchAllUsers();
      })
      .subscribe();

    // Real-time subscription for roles
    const rolesChannel = supabase
      .channel('admin-roles')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'user_roles' 
      }, () => {
        console.log('👑 Role update detected, refreshing users...');
        fetchAllUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(locationsChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(rolesChannel);
    };
  };

  const logAdminAction = async (actionType: string, targetUserId?: string, details?: any) => {
    try {
      await supabase
        .from('admin_logs')
        .insert({
          admin_id: user?.id,
          action_type: actionType,
          target_user_id: targetUserId,
          details: details || {}
        });
      
      // Refresh logs after adding new one
      fetchAdminLogs();
    } catch (error) {
      console.error('❌ Error logging admin action:', error);
    }
  };

  const promoteUser = async (userId: string, newRole: 'user' | 'merchant' | 'admin') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: newRole,
          assigned_by: user?.id
        });

      if (error) throw error;

      await logAdminAction('role_change', userId, { 
        newRole, 
        previousRole: users.find(u => u.id === userId)?.role 
      });
      
      toast.success(`User promoted to ${newRole}`);
      fetchAllUsers();
    } catch (error) {
      console.error('❌ Error promoting user:', error);
      toast.error('Failed to promote user');
    }
  };

  const banUser = async (userId: string, reason?: string) => {
    try {
      const { error } = await supabase
        .from('user_bans')
        .insert({
          user_id: userId,
          banned_by: user?.id,
          reason: reason || 'Admin action'
        });

      if (error) throw error;

      await logAdminAction('user_banned', userId, { reason });
      toast.success('User banned successfully');
      fetchAllUsers();
    } catch (error) {
      console.error('❌ Error banning user:', error);
      toast.error('Failed to ban user');
    }
  };

  const unbanUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_bans')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;

      await logAdminAction('user_unbanned', userId);
      toast.success('User unbanned successfully');
      fetchAllUsers();
    } catch (error) {
      console.error('❌ Error unbanning user:', error);
      toast.error('Failed to unban user');
    }
  };

  const muteUser = async (userId: string, reason?: string) => {
    try {
      const { error } = await supabase
        .from('user_mutes')
        .insert({
          user_id: userId,
          muted_by: user?.id,
          reason: reason || 'Admin action'
        });

      if (error) throw error;

      await logAdminAction('user_muted', userId, { reason });
      toast.success('User muted successfully');
      fetchAllUsers();
    } catch (error) {
      console.error('❌ Error muting user:', error);
      toast.error('Failed to mute user');
    }
  };

  const unmuteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_mutes')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;

      await logAdminAction('user_unmuted', userId);
      toast.success('User unmuted successfully');
      fetchAllUsers();
    } catch (error) {
      console.error('❌ Error unmuting user:', error);
      toast.error('Failed to unmute user');
    }
  };

  const deleteUserMessages = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_deleted: true })
        .eq('user_id', userId);

      if (error) throw error;

      await logAdminAction('messages_deleted', userId);
      toast.success('User messages deleted');
    } catch (error) {
      console.error('❌ Error deleting messages:', error);
      toast.error('Failed to delete messages');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const stats = {
    totalUsers: users.length,
    onlineUsers: users.filter(u => u.is_online).length,
    bannedUsers: users.filter(u => u.is_banned).length,
    mutedUsers: users.filter(u => u.is_muted).length,
    adminUsers: users.filter(u => u.role === 'admin').length,
    merchantUsers: users.filter(u => u.role === 'merchant').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <div className="text-foreground">Loading super admin dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">🛡️ Super Admin Control Center</h1>
          <p className="text-muted-foreground">Real-time monitoring and control for POP IN</p>
          
          <div className="flex items-center gap-4 mt-4">
            <Button 
              onClick={() => {
                syncUsersIfNeeded();
                fetchAllUsers();
              }} 
              disabled={syncing} 
              variant="outline"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Force Refresh
                </>
              )}
            </Button>
            <div className="text-sm text-muted-foreground">
              📊 Live Data: {stats.totalUsers} total users • {stats.onlineUsers} online now
            </div>
            <div className="text-xs text-muted-foreground">
              🔄 Last refresh: {lastRefresh.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <Card className="bg-card border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalUsers}</div>
              <div className="text-sm text-muted-foreground">Total Users</div>
              <div className="text-xs text-muted-foreground mt-1">All registered</div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-500">{stats.onlineUsers}</div>
              <div className="text-sm text-muted-foreground">Online Now</div>
              <div className="text-xs text-muted-foreground mt-1">Active in 10min</div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-500">{stats.adminUsers}</div>
              <div className="text-sm text-muted-foreground">Admins</div>
              <div className="text-xs text-muted-foreground mt-1">With control</div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-500">{stats.merchantUsers}</div>
              <div className="text-sm text-muted-foreground">Merchants</div>
              <div className="text-xs text-muted-foreground mt-1">Business users</div>
            </CardContent>
          </Card>

          <Card className="bg-card border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-500">{stats.bannedUsers}</div>
              <div className="text-sm text-muted-foreground">Banned</div>
              <div className="text-xs text-muted-foreground mt-1">Suspended</div>
            </CardContent>
          </Card>

          <Card className="bg-card border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-500">{stats.mutedUsers}</div>
              <div className="text-sm text-muted-foreground">Muted</div>
              <div className="text-xs text-muted-foreground mt-1">No chat</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              👥 All Users ({filteredUsers.length})
            </TabsTrigger>
            <TabsTrigger value="surveillance">
              <Eye className="w-4 h-4 mr-2" />
              🔍 Live Surveillance
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Settings className="w-4 h-4 mr-2" />
              📊 Admin Logs ({adminLogs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="bg-card border">
              <CardHeader>
                <CardTitle className="text-foreground">Complete User Management</CardTitle>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-xs"
                  />
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="user">Users</SelectItem>
                      <SelectItem value="merchant">Merchants</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Last Seen</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((userData) => (
                      <TableRow key={userData.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${
                              userData.is_online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                            }`}></div>
                            <span className={`text-xs font-medium ${
                              userData.is_online ? 'text-green-600' : 'text-gray-500'
                            }`}>
                              {userData.is_online ? 'ONLINE' : 'OFFLINE'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                              <Users className="w-4 h-4 text-primary-foreground" />
                            </div>
                            <div>
                              <div className="font-medium text-foreground flex items-center space-x-2">
                                <span>{userData.nickname}</span>
                                {userData.role === 'admin' && <Crown className="w-3 h-3 text-yellow-400" />}
                                {userData.role === 'merchant' && <Crown className="w-3 h-3 text-purple-400" />}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ID: {userData.id.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${
                            userData.role === 'admin' ? 'border-yellow-400 text-yellow-600' :
                            userData.role === 'merchant' ? 'border-purple-400 text-purple-600' : 
                            'border-gray-400 text-gray-600'
                          }`}>
                            {userData.role}
                          </Badge>
                          {userData.is_banned && (
                            <Badge variant="destructive" className="ml-2 text-xs">BANNED</Badge>
                          )}
                          {userData.is_muted && (
                            <Badge variant="secondary" className="ml-2 text-xs">MUTED</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {userData.email || 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(userData.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {userData.is_online ? (
                            <span className="text-green-600 font-medium">Online now</span>
                          ) : (
                            userData.last_seen ? new Date(userData.last_seen).toLocaleString() : 'Never'
                          )}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedUser(userData)}
                              >
                                <Settings className="w-3 h-3 mr-1" />
                                Control
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-card border max-w-md">
                              <DialogHeader>
                                <DialogTitle className="text-foreground">Control: {userData.nickname}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                {/* Role Management */}
                                <div className="space-y-2">
                                  <h4 className="font-medium text-foreground">Role Management</h4>
                                  <div className="grid grid-cols-2 gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => promoteUser(userData.id, 'user')}
                                      disabled={userData.role === 'user'}
                                      className="text-xs"
                                    >
                                      → User
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => promoteUser(userData.id, 'merchant')}
                                      disabled={userData.role === 'merchant'}
                                      className="border-purple-600 text-purple-400 text-xs"
                                    >
                                      → Merchant
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => promoteUser(userData.id, 'admin')}
                                      disabled={userData.role === 'admin'}
                                      className="border-yellow-600 text-yellow-400 text-xs col-span-2"
                                    >
                                      <Crown className="w-3 h-3 mr-1" />
                                      → Admin
                                    </Button>
                                  </div>
                                </div>

                                {/* Moderation Actions */}
                                <div className="space-y-2">
                                  <h4 className="font-medium text-foreground">Moderation</h4>
                                  <div className="grid grid-cols-2 gap-2">
                                    {userData.is_muted ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => unmuteUser(userData.id)}
                                        className="border-green-600 text-green-400 text-xs"
                                      >
                                        <Volume2 className="w-3 h-3 mr-1" />
                                        Unmute
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => muteUser(userData.id)}
                                        className="border-orange-600 text-orange-400 text-xs"
                                      >
                                        <VolumeX className="w-3 h-3 mr-1" />
                                        Mute
                                      </Button>
                                    )}
                                    
                                    {userData.is_banned ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => unbanUser(userData.id)}
                                        className="border-green-600 text-green-400 text-xs"
                                      >
                                        <UserCheck className="w-3 h-3 mr-1" />
                                        Unban
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => banUser(userData.id)}
                                        disabled={userData.role === 'admin'}
                                        className="text-xs"
                                      >
                                        <UserX className="w-3 h-3 mr-1" />
                                        Ban
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                {/* Destructive Actions */}
                                <div className="space-y-2">
                                  <h4 className="font-medium text-foreground">Destructive Actions</h4>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => deleteUserMessages(userData.id)}
                                    className="w-full text-xs"
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Delete All Messages
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {filteredUsers.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No users found matching your criteria</p>
                    {users.length === 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm">Try syncing users or check database connection</p>
                        <Button 
                          onClick={() => {
                            syncUsersIfNeeded();
                            fetchAllUsers();
                          }}
                          variant="outline"
                          size="sm"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Sync Users Now
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="surveillance">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card border">
                <CardHeader>
                  <CardTitle className="text-foreground">🔍 Live User Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {users.filter(u => u.is_online).map(user => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                        <div>
                          <span className="text-foreground font-medium">{user.nickname}</span>
                          <div className="text-muted-foreground text-sm">{user.role}</div>
                          {user.location && (
                            <div className="text-muted-foreground text-xs">
                              📍 {user.location.latitude.toFixed(4)}, {user.location.longitude.toFixed(4)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-green-400 text-xs font-medium">ONLINE</span>
                        </div>
                      </div>
                    ))}
                    {users.filter(u => u.is_online).length === 0 && (
                      <div className="text-center text-muted-foreground py-4">
                        <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No users currently online</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border">
                <CardHeader>
                  <CardTitle className="text-foreground">📊 System Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted/30 rounded">
                      <div className="text-2xl font-bold text-primary">{stats.totalUsers}</div>
                      <div className="text-muted-foreground text-sm">Total Users</div>
                    </div>
                    <div className="text-center p-4 bg-muted/30 rounded">
                      <div className="text-2xl font-bold text-green-400">{stats.onlineUsers}</div>
                      <div className="text-muted-foreground text-sm">Online</div>
                    </div>
                    <div className="text-center p-4 bg-muted/30 rounded">
                      <div className="text-2xl font-bold text-red-400">{stats.bannedUsers}</div>
                      <div className="text-muted-foreground text-sm">Banned</div>
                    </div>
                    <div className="text-center p-4 bg-muted/30 rounded">
                      <div className="text-2xl font-bold text-orange-400">{stats.mutedUsers}</div>
                      <div className="text-muted-foreground text-sm">Muted</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="logs">
            <Card className="bg-card border">
              <CardHeader>
                <CardTitle className="text-foreground">📊 Admin Action Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {adminLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-muted/30 rounded border-l-4 border-primary">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-foreground font-medium">{log.admin_nickname}</span>
                        <span className="text-muted-foreground text-sm">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        <span className="font-medium">{log.action_type}</span>
                        {log.target_user_id && ` • Target: ${log.target_user_id.substring(0, 8)}...`}
                        {log.details && Object.keys(log.details).length > 0 && (
                          <span className="text-muted-foreground ml-2">
                            ({JSON.stringify(log.details)})
                          </span>
                        )}
                      </p>
                    </div>
                  ))}
                  {adminLogs.length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                      <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No admin actions logged yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
