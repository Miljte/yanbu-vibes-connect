
import React, { useState, useEffect } from 'react';
import { Eye, Shield, Users, MapPin, MessageSquare, BarChart3, Ban, UserCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LiveUser {
  id: string;
  nickname: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  last_seen: string;
  role: string;
  is_online: boolean;
  created_at: string;
  is_banned: boolean;
  is_muted: boolean;
}

interface LiveMessage {
  id: string;
  message: string;
  user_nickname: string;
  place_name: string;
  created_at: string;
  user_id: string;
  place_id: string;
}

const SuperAdminDashboard = () => {
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const [liveUsers, setLiveUsers] = useState<LiveUser[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    totalMessages: 0,
    activeStores: 0
  });
  const [searchFilter, setSearchFilter] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchLiveData();
    setupRealtimeSubscriptions();
    
    const interval = setInterval(() => {
      fetchLiveData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const syncUsers = async () => {
    if (syncing) return;
    
    setSyncing(true);
    try {
      const { data: syncResult, error } = await supabase.functions.invoke('sync-users');
      
      if (error) {
        console.error('Sync error:', error);
        toast.error('Failed to sync users');
      } else {
        console.log('Sync completed:', syncResult);
        if (syncResult?.createdProfiles > 0) {
          toast.success(`Synced ${syncResult.createdProfiles} new users`);
        } else {
          toast.success('All users are already synced');
        }
        // Wait for sync to propagate then refresh
        setTimeout(() => fetchLiveData(), 2000);
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Sync operation failed');
    } finally {
      setSyncing(false);
    }
  };

  const fetchLiveData = async () => {
    try {
      console.log('🔄 Fetching live data...');
      
      // Get current user session for email access
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData?.session?.user;

      // Fetch all profiles - use a more direct approach
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('❌ Profile fetch error:', profilesError);
        throw profilesError;
      }

      console.log(`✅ Fetched ${profilesData?.length || 0} profiles`);

      // Fetch additional data in parallel
      const [rolesResponse, locationsResponse, bansResponse, mutesResponse] = await Promise.all([
        supabase.from('user_roles').select('*'),
        supabase.from('user_locations').select('*'),
        supabase.from('user_bans').select('user_id').eq('is_active', true),
        supabase.from('user_mutes').select('user_id').eq('is_active', true)
      ]);

      const rolesData = rolesResponse.data || [];
      const locationsData = locationsResponse.data || [];
      const bansData = bansResponse.data || [];
      const mutesData = mutesResponse.data || [];

      // Process users with complete information
      const usersWithStatus: LiveUser[] = (profilesData || []).map(profile => {
        const userRole = rolesData.find(role => role.user_id === profile.id);
        const location = locationsData.find(loc => loc.user_id === profile.id);
        const isBanned = bansData.some(ban => ban.user_id === profile.id);
        const isMuted = mutesData.some(mute => mute.user_id === profile.id);
        
        const lastSeen = location?.updated_at || profile.created_at;
        const isOnline = lastSeen ? new Date(lastSeen) > new Date(Date.now() - 10 * 60 * 1000) : false;

        // Get email for current user
        let email = undefined;
        if (currentUser && currentUser.id === profile.id) {
          email = currentUser.email;
        }

        return {
          id: profile.id,
          nickname: profile.nickname,
          email,
          latitude: location?.latitude,
          longitude: location?.longitude,
          last_seen: lastSeen,
          role: userRole?.role || 'user',
          is_online: isOnline,
          created_at: profile.created_at,
          is_banned: isBanned,
          is_muted: isMuted
        };
      });

      console.log(`✅ Processed ${usersWithStatus.length} users with complete data`);
      setLiveUsers(usersWithStatus);

      // Fetch recent messages
      const { data: messagesData } = await supabase
        .from('chat_messages')
        .select('id, message, created_at, user_id, place_id')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(50);

      // Get message context data
      if (messagesData && messagesData.length > 0) {
        const userIds = [...new Set(messagesData.map(msg => msg.user_id).filter(Boolean))];
        const placeIds = [...new Set(messagesData.map(msg => msg.place_id).filter(Boolean))];

        const [messageProfilesResponse, placesResponse] = await Promise.all([
          userIds.length > 0 ? supabase.from('profiles').select('id, nickname').in('id', userIds) : { data: [] },
          placeIds.length > 0 ? supabase.from('places').select('id, name').in('id', placeIds) : { data: [] }
        ]);

        const messageProfiles = messageProfilesResponse.data || [];
        const places = placesResponse.data || [];

        const messagesWithInfo = messagesData.map(msg => {
          const userProfile = messageProfiles.find(p => p.id === msg.user_id);
          const place = places.find(p => p.id === msg.place_id);
          
          return {
            id: msg.id,
            message: msg.message,
            user_nickname: userProfile?.nickname || 'Unknown',
            place_name: place?.name || 'Unknown',
            created_at: msg.created_at,
            user_id: msg.user_id,
            place_id: msg.place_id
          };
        });

        setLiveMessages(messagesWithInfo);

        const newStats = {
          totalUsers: usersWithStatus.length,
          onlineUsers: usersWithStatus.filter(u => u.is_online).length,
          totalMessages: messagesWithInfo.length,
          activeStores: places?.length || 0
        };

        setStats(newStats);
      } else {
        setLiveMessages([]);
        setStats({
          totalUsers: usersWithStatus.length,
          onlineUsers: usersWithStatus.filter(u => u.is_online).length,
          totalMessages: 0,
          activeStores: 0
        });
      }

    } catch (error) {
      console.error('❌ Error fetching live data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    console.log('🔗 Setting up realtime subscriptions...');
    
    const profilesChannel = supabase
      .channel('admin-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        console.log('Profile change detected');
        fetchLiveData();
      })
      .subscribe();

    const rolesChannel = supabase
      .channel('admin-roles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => {
        console.log('Role change detected');
        fetchLiveData();
      })
      .subscribe();

    const messagesChannel = supabase
      .channel('admin-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => {
        console.log('New message detected');
        fetchLiveData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(rolesChannel);
      supabase.removeChannel(messagesChannel);
    };
  };

  const banUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_bans')
        .insert({
          user_id: userId,
          banned_by: user?.id,
          reason: 'Admin action'
        });

      if (error) throw error;
      toast.success('User banned successfully');
      fetchLiveData();
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
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
      toast.success(`User promoted to ${newRole}`);
      fetchLiveData();
    } catch (error) {
      console.error('Error promoting user:', error);
      toast.error('Failed to promote user');
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_deleted: true })
        .eq('id', messageId);

      if (error) throw error;
      toast.success('Message deleted');
      fetchLiveData();
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const filteredUsers = liveUsers.filter(user => {
    const matchesSearch = searchFilter === '' || 
      user.nickname.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchFilter.toLowerCase()));
    
    const matchesFilter = userFilter === 'all' || 
      (userFilter === 'online' && user.is_online) ||
      (userFilter === 'offline' && !user.is_online) ||
      (userFilter === 'banned' && user.is_banned) ||
      (userFilter === 'muted' && user.is_muted);
    
    return matchesSearch && matchesFilter;
  });

  const filteredMessages = liveMessages.filter(msg => 
    searchFilter === '' || 
    msg.message.toLowerCase().includes(searchFilter.toLowerCase()) ||
    msg.user_nickname.toLowerCase().includes(searchFilter.toLowerCase()) ||
    msg.place_name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const canPromoteUser = (targetUser: LiveUser, targetRole: string) => {
    return targetUser.id !== user?.id && 
           targetUser.role !== targetRole && 
           targetUser.role !== 'admin';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <div className="text-foreground mb-2">Loading Pro Admin Dashboard...</div>
          <div className="text-sm text-muted-foreground">Synchronizing data and setting up real-time monitoring</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                🛡️ Pro Admin Control Center
              </h1>
              <p className="text-muted-foreground text-lg">Real-time monitoring and management for POP IN platform</p>
            </div>
            <Button 
              onClick={syncUsers}
              disabled={syncing}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync Users'}</span>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">System Status</p>
                  <p className="text-xl font-bold">🟢 Operational</p>
                </div>
                <Shield className="w-8 h-8 text-green-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">Live Data</p>
                  <p className="text-xl font-bold">{stats.totalUsers} users • {stats.onlineUsers} online</p>
                </div>
                <Eye className="w-8 h-8 text-blue-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">Auto-Refresh</p>
                  <p className="text-xl font-bold">Every 30s</p>
                </div>
                <RefreshCw className="w-8 h-8 text-purple-200" />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-card to-muted/20 border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground text-sm flex items-center">
                <Users className="w-4 h-4 mr-2 text-blue-500" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.totalUsers}</div>
              <div className="text-xs text-muted-foreground">Registered accounts</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-card to-muted/20 border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground text-sm flex items-center">
                <Eye className="w-4 h-4 mr-2 text-green-500" />
                Online Now
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.onlineUsers}</div>
              <div className="text-xs text-muted-foreground">Active sessions</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-card to-muted/20 border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground text-sm flex items-center">
                <MessageSquare className="w-4 h-4 mr-2 text-purple-500" />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{stats.totalMessages}</div>
              <div className="text-xs text-muted-foreground">Recent activity</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-card to-muted/20 border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground text-sm flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-orange-500" />
                Active Stores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.activeStores}</div>
              <div className="text-xs text-muted-foreground">Live locations</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="surveillance" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="surveillance">🔍 Live Surveillance</TabsTrigger>
            <TabsTrigger value="users">👥 Users ({filteredUsers.length})</TabsTrigger>
            <TabsTrigger value="messages">💬 Messages</TabsTrigger>
            <TabsTrigger value="analytics">📊 Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="surveillance">
            <Card className="bg-card border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Real-Time Activity Monitor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
                      Online Users ({liveUsers.filter(u => u.is_online).length})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {liveUsers.filter(u => u.is_online).map(user => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-800">
                          <div>
                            <span className="font-medium text-foreground">{user.nickname}</span>
                            <Badge variant="outline" className="ml-2 border-green-500 text-green-600">{user.role}</Badge>
                            {user.email && <div className="text-xs text-muted-foreground">{user.email}</div>}
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-green-600 font-medium">LIVE</span>
                          </div>
                        </div>
                      ))}
                      {liveUsers.filter(u => u.is_online).length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                          <Eye className="w-12 h-12 mx-auto mb-4 opacity-30" />
                          <p className="text-sm">No users currently online</p>
                          <p className="text-xs">Users will appear here when they're active</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2 text-purple-500" />
                      Live Messages ({liveMessages.length})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {liveMessages.slice(0, 10).map(message => (
                        <div key={message.id} className="p-3 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-800">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-foreground">{message.user_nickname}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(message.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1 line-clamp-2">{message.message}</p>
                          <span className="text-xs text-purple-600 font-medium">📍 {message.place_name}</span>
                        </div>
                      ))}
                      {liveMessages.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                          <p className="text-sm">No recent messages</p>
                          <p className="text-xs">Messages will appear here in real-time</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="bg-card border">
              <CardHeader>
                <CardTitle className="text-foreground">Professional User Management</CardTitle>
                <div className="flex flex-wrap gap-4">
                  <Input
                    placeholder="Search by name or email..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="max-w-xs"
                  />
                  <select 
                    value={userFilter} 
                    onChange={(e) => setUserFilter(e.target.value)}
                    className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  >
                    <option value="all">All Users ({liveUsers.length})</option>
                    <option value="online">Online ({liveUsers.filter(u => u.is_online).length})</option>
                    <option value="offline">Offline ({liveUsers.filter(u => !u.is_online).length})</option>
                    <option value="banned">Banned ({liveUsers.filter(u => u.is_banned).length})</option>
                    <option value="muted">Muted ({liveUsers.filter(u => u.is_muted).length})</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredUsers.map((userData) => (
                    <div key={userData.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/30 to-muted/50 rounded-lg border hover:shadow-md transition-all">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${userData.is_online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'} ring-2 ring-white`}></div>
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center">
                          <Users className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div>
                          <div className="text-foreground font-medium flex items-center space-x-2">
                            <span className="text-lg">{userData.nickname}</span>
                            <Badge variant={userData.role === 'admin' ? 'default' : 'outline'} className={
                              userData.role === 'admin' ? 'bg-yellow-500 text-yellow-900' :
                              userData.role === 'merchant' ? 'border-purple-500 text-purple-600' : ''
                            }>
                              {userData.role}
                            </Badge>
                            {userData.is_banned && <Badge variant="destructive" className="text-xs">BANNED</Badge>}
                            {userData.is_muted && <Badge variant="secondary" className="text-xs">MUTED</Badge>}
                            {userData.id === user?.id && <Badge variant="default" className="text-xs bg-blue-600">YOU</Badge>}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            {userData.email && <span className="font-medium">{userData.email}</span>}
                            {userData.email && <span className="mx-2">•</span>}
                            <span>Joined {new Date(userData.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="text-muted-foreground text-xs mt-1">
                            {userData.is_online ? (
                              <span className="text-green-600 font-medium flex items-center">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                                Online now
                              </span>
                            ) : (
                              <span>Last seen: {new Date(userData.last_seen).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {canPromoteUser(userData, 'merchant') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => promoteUser(userData.id, 'merchant')}
                            className="text-xs border-purple-500 text-purple-600 hover:bg-purple-50"
                          >
                            <UserCheck className="w-3 h-3 mr-1" />
                            Merchant
                          </Button>
                        )}
                        {canPromoteUser(userData, 'admin') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => promoteUser(userData.id, 'admin')}
                            className="text-xs border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Button>
                        )}
                        {userData.id !== user?.id && !userData.is_banned && userData.role !== 'admin' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => banUser(userData.id)}
                            className="text-xs"
                          >
                            <Ban className="w-3 h-3 mr-1" />
                            Ban
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className="text-center text-muted-foreground py-12">
                      <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p className="text-lg font-medium">No users found</p>
                      <p className="text-sm">Try adjusting your search or filter criteria</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <Card className="bg-card border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Message Monitoring & Moderation
                </CardTitle>
                <Input
                  placeholder="Search messages, users, or places..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="max-w-md"
                />
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredMessages.map(message => (
                    <div key={message.id} className="flex items-start justify-between p-4 bg-gradient-to-r from-muted/30 to-muted/50 rounded-lg border hover:shadow-sm transition-all">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-foreground font-medium">{message.user_nickname}</span>
                          <span className="text-muted-foreground text-sm">in</span>
                          <span className="text-blue-600 font-medium">{message.place_name}</span>
                          <span className="text-muted-foreground text-xs">
                            {new Date(message.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed">{message.message}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMessage(message.id)}
                        className="ml-4"
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {filteredMessages.length === 0 && (
                    <div className="text-center text-muted-foreground py-12">
                      <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p className="text-lg font-medium">No messages found</p>
                      <p className="text-sm">Messages will appear here as users interact</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="bg-card border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Professional Analytics Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">User Metrics</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Total Registered', value: stats.totalUsers, color: 'blue' },
                        { label: 'Currently Online', value: stats.onlineUsers, color: 'green' },
                        { label: 'Online Rate', value: stats.totalUsers > 0 ? `${Math.round((stats.onlineUsers / stats.totalUsers) * 100)}%` : '0%', color: 'purple' },
                        { label: 'Banned Users', value: liveUsers.filter(u => u.is_banned).length, color: 'red' }
                      ].map(({ label, value, color }, index) => (
                        <div key={index} className={`flex justify-between items-center p-4 bg-gradient-to-r from-${color}-50 to-${color}-100 dark:from-${color}-900/20 dark:to-${color}-800/20 rounded-lg border border-${color}-200 dark:border-${color}-800`}>
                          <span className="text-foreground font-medium">{label}</span>
                          <Badge variant="secondary" className={`bg-${color}-100 text-${color}-800 border-${color}-300`}>
                            {value}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">System Health</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Real-time Status', value: '🟢 Active', color: 'green' },
                        { label: 'Data Refresh', value: 'Every 30s', color: 'blue' },
                        { label: 'Live Updates', value: 'Enabled', color: 'purple' },
                        { label: 'Active Messages', value: liveMessages.length, color: 'orange' }
                      ].map(({ label, value, color }, index) => (
                        <div key={index} className={`flex justify-between items-center p-4 bg-gradient-to-r from-${color}-50 to-${color}-100 dark:from-${color}-900/20 dark:to-${color}-800/20 rounded-lg border border-${color}-200 dark:border-${color}-800`}>
                          <span className="text-foreground font-medium">{label}</span>
                          <Badge variant="secondary" className={`bg-${color}-100 text-${color}-800 border-${color}-300`}>
                            {value}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
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
