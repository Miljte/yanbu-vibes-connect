import React, { useState, useEffect } from 'react';
import { Shield, Users, Eye, Ban, Crown, Trash2, MessageSquare, MapPin, Settings, RefreshCw, UserCheck, UserX, Volume2, VolumeX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  message_count?: number;
  place_visits?: number;
}

interface AdminStats {
  totalUsers: number;
  onlineUsers: number;
  newUsersToday: number;
  totalMessages: number;
  activePlaces: number;
  bannedUsers: number;
  mutedUsers: number;
  totalAdmins: number;
  totalMerchants: number;
}

interface RealtimeUpdate {
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  new?: any;
  old?: any;
}

const EnhancedAdminPanel = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    onlineUsers: 0,
    newUsersToday: 0,
    totalMessages: 0,
    activePlaces: 0,
    bannedUsers: 0,
    mutedUsers: 0,
    totalAdmins: 0,
    totalMerchants: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchAllData();
    setupRealtimeSubscriptions();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchUsersWithDetails(),
        fetchSystemStats()
      ]);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersWithDetails = async () => {
    try {
      console.log('🔍 Fetching enhanced user data...');
      
      // Fetch ALL profiles without any filtering
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
        throw profilesError;
      }

      console.log(`✅ Found ${profilesData?.length || 0} profiles in database`);

      if (!profilesData || profilesData.length === 0) {
        console.warn('⚠️ No profiles found in database');
        setUsers([]);
        return;
      }

      // Fetch user roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      console.log(`👑 Found ${rolesData?.length || 0} role assignments`);

      // Fetch user locations for online status
      const { data: locationsData } = await supabase
        .from('user_locations')
        .select('user_id, latitude, longitude, updated_at');

      // Fetch active bans
      const { data: bansData } = await supabase
        .from('user_bans')
        .select('user_id')
        .eq('is_active', true);

      // Fetch active mutes
      const { data: mutesData } = await supabase
        .from('user_mutes')
        .select('user_id')
        .eq('is_active', true);

      // Fetch message counts per user
      const { data: messageCountsData } = await supabase
        .from('chat_messages')
        .select('user_id')
        .eq('is_deleted', false);

      const messageCounts = messageCountsData?.reduce((acc, msg) => {
        acc[msg.user_id] = (acc[msg.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Combine all data with enhanced details
      const usersWithDetails = profilesData.map(profile => {
        const userRole = rolesData?.find(role => role.user_id === profile.id);
        const location = locationsData?.find(loc => loc.user_id === profile.id);
        const isBanned = bansData?.some(ban => ban.user_id === profile.id) || false;
        const isMuted = mutesData?.some(mute => mute.user_id === profile.id) || false;
        
        // Check if user is online (activity within last 5 minutes for more accurate status)
        const lastSeen = location?.updated_at || profile.created_at;
        const isOnline = lastSeen ? new Date(lastSeen) > new Date(Date.now() - 5 * 60 * 1000) : false;

        return {
          id: profile.id,
          nickname: profile.nickname,
          created_at: profile.created_at,
          role: userRole?.role || 'user',
          is_banned: isBanned,
          is_muted: isMuted,
          last_seen: lastSeen,
          is_online: isOnline,
          location: location ? { latitude: location.latitude, longitude: location.longitude } : undefined,
          message_count: messageCounts[profile.id] || 0,
          place_visits: 0 // Could be calculated from user_locations visits
        };
      });

      console.log('✅ Enhanced users loaded:', usersWithDetails.length);
      console.log('👥 User list:', usersWithDetails.map(u => ({ nickname: u.nickname, role: u.role })));
      
      setUsers(usersWithDetails);
    } catch (error) {
      console.error('❌ Error in fetchUsersWithDetails:', error);
      toast.error('Failed to fetch user details');
    }
  };

  const fetchSystemStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Count new users today
      const { count: newUsersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // Count total messages
      const { count: messagesCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false);

      // Count active places
      const { count: placesCount } = await supabase
        .from('places')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      setStats(prevStats => ({
        ...prevStats,
        newUsersToday: newUsersCount || 0,
        totalMessages: messagesCount || 0,
        activePlaces: placesCount || 0
      }));
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    console.log('🔄 Setting up enhanced real-time subscriptions...');

    const adminChannel = supabase
      .channel('enhanced_admin_panel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        console.log('👤 Profile change:', payload);
        handleRealtimeUpdate('profiles', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, (payload) => {
        console.log('👑 Role change:', payload);
        handleRealtimeUpdate('user_roles', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_locations' }, (payload) => {
        console.log('📍 Location update:', payload);
        handleRealtimeUpdate('user_locations', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_bans' }, (payload) => {
        console.log('🚫 Ban change:', payload);
        handleRealtimeUpdate('user_bans', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_mutes' }, (payload) => {
        console.log('🔇 Mute change:', payload);
        handleRealtimeUpdate('user_mutes', payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(adminChannel);
    };
  };

  const handleRealtimeUpdate = (table: string, payload: any) => {
    // Smart real-time updates without full refresh
    if (table === 'user_locations' && payload.eventType === 'UPDATE') {
      // Update online status in real-time
      const userId = payload.new?.user_id;
      if (userId) {
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === userId 
              ? { ...user, is_online: true, last_seen: payload.new.updated_at }
              : user
          )
        );
      }
    } else {
      // For other changes, do a smart refresh
      setTimeout(() => fetchUsersWithDetails(), 1000);
    }
  };

  const promoteUser = async (userId: string, newRole: 'user' | 'merchant' | 'admin') => {
    try {
      console.log(`👑 Promoting user ${userId} to ${newRole}`);
      
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: newRole,
          assigned_by: user?.id
        });

      if (error) throw error;

      await logAdminAction('role_change', userId, { newRole, previousRole: users.find(u => u.id === userId)?.role });
      toast.success(`User promoted to ${newRole}`);
    } catch (error) {
      console.error('Error promoting user:', error);
      toast.error('Failed to promote user');
    }
  };

  const banUser = async (userId: string, reason?: string) => {
    try {
      console.log(`🚫 Banning user: ${userId}`);
      
      const { error } = await supabase
        .from('user_bans')
        .insert({
          user_id: userId,
          banned_by: user?.id,
          reason: reason || 'Admin action',
          is_active: true
        });

      if (error) throw error;

      await logAdminAction('user_banned', userId, { reason });
      toast.success('User banned successfully');
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    }
  };

  const muteUser = async (userId: string, reason?: string, duration?: number) => {
    try {
      console.log(`🔇 Muting user: ${userId} for ${duration} minutes`);
      
      const expiresAt = duration ? new Date(Date.now() + duration * 60 * 1000).toISOString() : null;
      
      const { error } = await supabase
        .from('user_mutes')
        .insert({
          user_id: userId,
          muted_by: user?.id,
          reason: reason || 'Admin action',
          expires_at: expiresAt,
          is_active: true
        });

      if (error) throw error;

      await logAdminAction('user_muted', userId, { reason, duration });
      toast.success(`User muted${duration ? ` for ${duration} minutes` : ''}`);
    } catch (error) {
      console.error('Error muting user:', error);
      toast.error('Failed to mute user');
    }
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
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.nickname.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'online' && user.is_online) ||
      (statusFilter === 'banned' && user.is_banned) ||
      (statusFilter === 'muted' && user.is_muted);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Update stats based on current users
  useEffect(() => {
    setStats(prevStats => ({
      ...prevStats,
      totalUsers: users.length,
      onlineUsers: users.filter(u => u.is_online).length,
      bannedUsers: users.filter(u => u.is_banned).length,
      mutedUsers: users.filter(u => u.is_muted).length,
      totalAdmins: users.filter(u => u.role === 'admin').length,
      totalMerchants: users.filter(u => u.role === 'merchant').length
    }));
  }, [users]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-foreground">Loading enhanced admin panel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">🛡️ Enhanced Admin Control Center</h1>
            <p className="text-muted-foreground">Real-time monitoring & comprehensive user management</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
              <span>Total Users: {stats.totalUsers}</span>
              <span>Online: {stats.onlineUsers}</span>
              <span>New Today: {stats.newUsersToday}</span>
            </div>
            {users.length === 0 && (
              <p className="text-sm text-orange-400 mt-1">
                ⚠️ No users found - Check database and RLS policies
              </p>
            )}
          </div>
          <Button onClick={refreshData} disabled={refreshing} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-card border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs">Online Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{stats.onlineUsers}</div>
              <div className="text-xs text-muted-foreground">of {stats.totalUsers}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs">New Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{stats.newUsersToday}</div>
              <div className="text-xs text-muted-foreground">registrations</div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs">Merchants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">{stats.totalMerchants}</div>
              <div className="text-xs text-muted-foreground">verified</div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs">Moderation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-orange-400">{stats.bannedUsers + stats.mutedUsers}</div>
              <div className="text-xs text-muted-foreground">{stats.bannedUsers}B / {stats.mutedUsers}M</div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs">Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-400">{stats.totalMessages}</div>
              <div className="text-xs text-muted-foreground">total sent</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              User Management ({filteredUsers.length})
            </TabsTrigger>
            <TabsTrigger value="monitoring">
              <Eye className="w-4 h-4 mr-2" />
              Live Monitoring
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="bg-card border">
              <CardHeader>
                <CardTitle className="text-foreground">Enhanced User Management</CardTitle>
                <div className="flex space-x-4">
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-xs"
                  />
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="user">Users</SelectItem>
                      <SelectItem value="merchant">Merchants</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="banned">Banned</SelectItem>
                      <SelectItem value="muted">Muted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredUsers.map((userData) => (
                    <div key={userData.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${userData.is_online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                          <div className="text-foreground font-medium flex items-center space-x-2">
                            <span>{userData.nickname}</span>
                            {userData.role === 'admin' && <Crown className="w-4 h-4 text-yellow-400" />}
                            {userData.role === 'merchant' && <Crown className="w-4 h-4 text-purple-400" />}
                            {userData.is_banned && <Badge variant="destructive" className="text-xs">Banned</Badge>}
                            {userData.is_muted && <Badge variant="secondary" className="text-xs">Muted</Badge>}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            {userData.role} • Joined {new Date(userData.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            Messages: {userData.message_count} • 
                            {userData.is_online ? (
                              <span className="text-green-400 ml-1">Online now</span>
                            ) : (
                              <span className="ml-1">Last seen: {userData.last_seen ? new Date(userData.last_seen).toLocaleString() : 'Never'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Settings className="w-3 h-3 mr-1" />
                              Manage
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-card border">
                            <DialogHeader>
                              <DialogTitle className="text-foreground">Manage User: {userData.nickname}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <Button
                                  variant="outline"
                                  onClick={() => promoteUser(userData.id, 'merchant')}
                                  disabled={userData.role === 'admin' || userData.role === 'merchant'}
                                  className="border-purple-600 text-purple-400"
                                >
                                  <Crown className="w-3 h-3 mr-1" />
                                  Make Merchant
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => promoteUser(userData.id, 'admin')}
                                  disabled={userData.role === 'admin'}
                                  className="border-yellow-600 text-yellow-400"
                                >
                                  <Crown className="w-3 h-3 mr-1" />
                                  Make Admin
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <Button
                                  variant="outline"
                                  onClick={() => muteUser(userData.id, 'Admin action', 60)}
                                  disabled={userData.is_muted}
                                  className="border-orange-600 text-orange-400"
                                >
                                  <VolumeX className="w-3 h-3 mr-1" />
                                  Mute 1hr
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => muteUser(userData.id, 'Admin action', 1440)}
                                  disabled={userData.is_muted}
                                  className="border-orange-600 text-orange-400"
                                >
                                  <VolumeX className="w-3 h-3 mr-1" />
                                  Mute 24hr
                                </Button>
                              </div>
                              <Button
                                variant="destructive"
                                onClick={() => banUser(userData.id, 'Admin action')}
                                disabled={userData.is_banned || userData.role === 'admin'}
                                className="w-full"
                              >
                                <Ban className="w-3 h-3 mr-1" />
                                Ban User
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No users found matching your criteria</p>
                      {users.length === 0 && (
                        <div className="mt-4 text-sm">
                          <p className="text-orange-400">Possible issues:</p>
                          <ul className="text-left list-disc list-inside space-y-1">
                            <li>No users in profiles table</li>
                            <li>RLS policies blocking access</li>
                            <li>Database connection issues</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card border">
                <CardHeader>
                  <CardTitle className="text-foreground">Live Online Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {users.filter(u => u.is_online).map(user => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <div>
                            <span className="text-foreground font-medium">{user.nickname}</span>
                            <div className="text-muted-foreground text-sm">{user.role} • {user.message_count} messages</div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-green-400 border-green-400">
                          Online
                        </Badge>
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
                  <CardTitle className="text-foreground">System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Active Places</span>
                      <Badge variant="outline">{stats.activePlaces}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Messages</span>
                      <Badge variant="outline">{stats.totalMessages}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Online Rate</span>
                      <Badge variant="outline">
                        {stats.totalUsers > 0 ? Math.round((stats.onlineUsers / stats.totalUsers) * 100) : 0}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Moderation Actions</span>
                      <Badge variant="outline" className="text-orange-400">
                        {stats.bannedUsers + stats.mutedUsers}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EnhancedAdminPanel;
