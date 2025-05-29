import React, { useState, useEffect } from 'react';
import { Eye, Shield, Users, MapPin, MessageSquare, BarChart3, Ban, UserCheck, AlertTriangle } from 'lucide-react';
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
  const { user } = useAuth();

  // Real-time data fetching with enhanced logging
  useEffect(() => {
    console.log('🔄 SuperAdmin Dashboard initializing...');
    fetchLiveData();
    setupRealtimeSubscriptions();
    
    // Set up periodic refresh for accurate online status
    const interval = setInterval(() => {
      console.log('🔄 Periodic data refresh...');
      fetchLiveData();
    }, 30000);
    
    return () => {
      console.log('🛑 SuperAdmin Dashboard cleanup');
      clearInterval(interval);
    };
  }, []);

  const fetchLiveData = async () => {
    try {
      console.log('📊 🚨 CRITICAL: Fetching ALL user data - checking multiple sources...');
      
      // 🚨 STEP 1: Fetch ALL auth users using service role (admin function)
      let authUsers: any[] = [];
      try {
        console.log('🔍 Attempting to fetch auth users via admin API...');
        const { data: authResponse, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
          console.error('❌ Auth admin error:', authError);
          console.log('⚠️ Trying alternative method - will use profiles only');
        } else {
          authUsers = authResponse?.users || [];
          console.log(`✅ AUTH USERS FOUND VIA ADMIN API: ${authUsers.length}`);
          console.log('📧 Auth user emails:', authUsers.map(u => u.email));
        }
      } catch (error) {
        console.error('❌ Auth admin call failed:', error);
        console.log('⚠️ Continuing with profiles-only approach');
      }

      // 🚨 STEP 2: Fetch ALL profiles from database - EXPANDED QUERY
      console.log('📊 Fetching ALL profiles from database...');
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('❌ CRITICAL ERROR fetching profiles:', profilesError);
        throw profilesError;
      }

      console.log(`✅ PROFILES FOUND: ${profilesData?.length || 0} total users in database`);
      console.log('👤 Profile nicknames:', profilesData?.map(p => ({ id: p.id, nickname: p.nickname })));

      // 🚨 STEP 3: Cross-reference auth users with profiles
      console.log('🔄 Cross-referencing auth users with profiles...');
      
      // Create a comprehensive user list
      const allUserIds = new Set([
        ...authUsers.map(u => u.id),
        ...(profilesData || []).map(p => p.id)
      ]);
      
      console.log(`🔍 TOTAL UNIQUE USER IDs FOUND: ${allUserIds.size}`);
      console.log('📝 All User IDs:', Array.from(allUserIds));

      // 🚨 STEP 4: For any auth users without profiles, create missing profile data
      for (const authUser of authUsers) {
        const hasProfile = profilesData?.some(p => p.id === authUser.id);
        if (!hasProfile) {
          console.log(`⚠️ Missing profile for auth user: ${authUser.email} (${authUser.id})`);
          console.log('🔧 Creating missing profile...');
          
          try {
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: authUser.id,
                nickname: authUser.email?.split('@')[0] || `User_${authUser.id.substring(0, 8)}`,
                created_at: authUser.created_at
              });
            
            if (insertError) {
              console.error('❌ Error creating missing profile:', insertError);
            } else {
              console.log('✅ Created missing profile');
              // Refresh profiles data
              const { data: updatedProfiles } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });
              if (updatedProfiles) {
                profilesData.length = 0;
                profilesData.push(...updatedProfiles);
              }
            }
          } catch (error) {
            console.error('❌ Failed to create missing profile:', error);
          }
        }
      }

      // Fetch ALL user roles - NO FILTERS
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) {
        console.error('❌ Error fetching roles:', rolesError);
      }

      console.log(`✅ ROLES FOUND: ${rolesData?.length || 0} role assignments`);

      // Fetch ALL user locations for online status (last 10 minutes = online)
      const { data: locationsData, error: locationsError } = await supabase
        .from('user_locations')
        .select('*');

      if (locationsError) {
        console.error('❌ Error fetching locations:', locationsError);
      }

      console.log(`✅ LOCATIONS FOUND: ${locationsData?.length || 0} location records`);

      // Fetch ban status for all users
      const { data: bansData } = await supabase
        .from('user_bans')
        .select('user_id')
        .eq('is_active', true);

      // Fetch mute status for all users
      const { data: mutesData } = await supabase
        .from('user_mutes')
        .select('user_id')
        .eq('is_active', true);

      console.log(`✅ BANS FOUND: ${bansData?.length || 0} banned users`);
      console.log(`✅ MUTES FOUND: ${mutesData?.length || 0} muted users`);

      // 🚨 STEP 5: Combine ALL user data with DETAILED LOGGING
      const usersWithStatus: LiveUser[] = (profilesData || []).map(profile => {
        const userRole = rolesData?.find(role => role.user_id === profile.id);
        const location = locationsData?.find(loc => loc.user_id === profile.id);
        const authUser = authUsers.find(au => au.id === profile.id);
        const isBanned = bansData?.some(ban => ban.user_id === profile.id) || false;
        const isMuted = mutesData?.some(mute => mute.user_id === profile.id) || false;
        
        // Calculate online status - user is online if they've updated location in last 10 minutes
        const lastSeen = location?.updated_at || profile.created_at;
        const isOnline = lastSeen ? new Date(lastSeen) > new Date(Date.now() - 10 * 60 * 1000) : false;

        console.log(`👤 Processing User ${profile.nickname}:`);
        console.log(`  - ID: ${profile.id}`);
        console.log(`  - Role: ${userRole?.role || 'user'}`);
        console.log(`  - Online: ${isOnline}`);
        console.log(`  - Last Seen: ${lastSeen}`);
        console.log(`  - Email: ${authUser?.email || 'N/A'}`);
        console.log(`  - Banned: ${isBanned}`);
        console.log(`  - Muted: ${isMuted}`);

        return {
          id: profile.id,
          nickname: profile.nickname,
          email: authUser?.email || undefined,
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

      // 🚨 STEP 6: Add any auth users that don't have profiles yet
      for (const authUser of authUsers) {
        const hasProfile = usersWithStatus.some(u => u.id === authUser.id);
        if (!hasProfile) {
          console.log(`⚠️ Adding auth user without profile: ${authUser.email}`);
          usersWithStatus.push({
            id: authUser.id,
            nickname: authUser.email?.split('@')[0] || `User_${authUser.id.substring(0, 8)}`,
            email: authUser.email,
            latitude: undefined,
            longitude: undefined,
            last_seen: authUser.created_at,
            role: 'user',
            is_online: false,
            created_at: authUser.created_at,
            is_banned: false,
            is_muted: false
          });
        }
      }

      console.log(`📊 🚨 FINAL PROCESSING RESULT:`);
      console.log(`- Total users processed: ${usersWithStatus.length}`);
      console.log(`- Online users: ${usersWithStatus.filter(u => u.is_online).length}`);
      console.log(`- Offline users: ${usersWithStatus.filter(u => !u.is_online).length}`);
      console.log(`- Admins: ${usersWithStatus.filter(u => u.role === 'admin').length}`);
      console.log(`- Merchants: ${usersWithStatus.filter(u => u.role === 'merchant').length}`);
      console.log(`- Regular users: ${usersWithStatus.filter(u => u.role === 'user').length}`);
      console.log('📧 All user emails:', usersWithStatus.map(u => u.email).filter(Boolean));
      
      // CRITICAL: Ensure we're setting the state with ALL users
      setLiveUsers(usersWithStatus);
      console.log(`✅ STATE UPDATED: Set ${usersWithStatus.length} users in component state`);

      // Fetch recent messages with user and place info
      const { data: messagesData } = await supabase
        .from('chat_messages')
        .select('id, message, created_at, user_id, place_id')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(50);

      console.log(`💬 MESSAGES FOUND: ${messagesData?.length || 0} recent messages`);

      // Get user profiles for message authors
      const userIds = messagesData?.map(msg => msg.user_id).filter(Boolean) || [];
      const { data: messageProfiles } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', userIds);

      // Get places for messages
      const placeIds = messagesData?.map(msg => msg.place_id).filter(Boolean) || [];
      const { data: places } = await supabase
        .from('places')
        .select('id, name')
        .in('id', placeIds);

      const messagesWithInfo = messagesData?.map(msg => {
        const userProfile = messageProfiles?.find(p => p.id === msg.user_id);
        const place = places?.find(p => p.id === msg.place_id);
        
        return {
          id: msg.id,
          message: msg.message,
          user_nickname: userProfile?.nickname || 'Unknown',
          place_name: place?.name || 'Unknown',
          created_at: msg.created_at,
          user_id: msg.user_id,
          place_id: msg.place_id
        };
      }) || [];

      setLiveMessages(messagesWithInfo);

      // Calculate accurate stats
      const newStats = {
        totalUsers: usersWithStatus.length,
        onlineUsers: usersWithStatus.filter(u => u.is_online).length,
        totalMessages: messagesWithInfo.length,
        activeStores: places?.length || 0
      };

      console.log(`📈 STATS UPDATE:`, newStats);
      setStats(newStats);

    } catch (error) {
      console.error('❌ CRITICAL ERROR in fetchLiveData:', error);
      toast.error('Failed to load admin data - check console for details');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    console.log('🔗 Setting up real-time subscriptions...');
    
    // Subscribe to auth schema changes (if possible)
    const authChannel = supabase
      .channel('admin-auth')
      .on('postgres_changes', 
        { event: '*', schema: 'auth', table: 'users' },
        (payload) => {
          console.log('🔐 Auth user change detected:', payload);
          fetchLiveData();
        }
      )
      .subscribe();

    // Subscribe to profile changes
    const profilesChannel = supabase
      .channel('admin-profiles')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('👤 Profile change detected:', payload);
          fetchLiveData();
        }
      )
      .subscribe();

    // Subscribe to user role changes
    const rolesChannel = supabase
      .channel('admin-roles')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_roles' },
        (payload) => {
          console.log('🔑 Role change detected:', payload);
          fetchLiveData();
        }
      )
      .subscribe();

    // Subscribe to location updates (for online status)
    const locationsChannel = supabase
      .channel('admin-locations')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_locations' },
        (payload) => {
          console.log('📍 Location update detected:', payload);
          fetchLiveData();
        }
      )
      .subscribe();

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('admin-messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          console.log('💬 New message detected:', payload);
          fetchLiveData();
        }
      )
      .subscribe();

    // Subscribe to ban/mute changes
    const bansChannel = supabase
      .channel('admin-bans')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_bans' },
        (payload) => {
          console.log('🚫 Ban change detected:', payload);
          fetchLiveData();
        }
      )
      .subscribe();

    const mutesChannel = supabase
      .channel('admin-mutes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_mutes' },
        (payload) => {
          console.log('🔇 Mute change detected:', payload);
          fetchLiveData();
        }
      )
      .subscribe();

    return () => {
      console.log('🛑 Cleaning up real-time subscriptions');
      supabase.removeChannel(authChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(rolesChannel);
      supabase.removeChannel(locationsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(bansChannel);
      supabase.removeChannel(mutesChannel);
    };
  };

  const banUser = async (userId: string) => {
    try {
      console.log('🚫 Banning user:', userId);
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
      console.error('❌ Error banning user:', error);
      toast.error('Failed to ban user');
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
      toast.success(`User promoted to ${newRole}`);
      fetchLiveData();
    } catch (error) {
      console.error('❌ Error promoting user:', error);
      toast.error('Failed to promote user');
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      console.log('🗑️ Deleting message:', messageId);
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_deleted: true })
        .eq('id', messageId);

      if (error) throw error;
      toast.success('Message deleted');
      fetchLiveData();
    } catch (error) {
      console.error('❌ Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  // Filter users based on search and status
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

  // Helper function to check if current user can promote another user
  const canPromoteUser = (targetUser: LiveUser, targetRole: string) => {
    // Don't show promotion buttons for the current admin user
    if (targetUser.id === user?.id) {
      return false;
    }
    
    // Don't promote someone who already has that role
    if (targetUser.role === targetRole) {
      return false;
    }
    
    // Don't allow promoting existing admins
    if (targetUser.role === 'admin') {
      return false;
    }
    
    return true;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">🛡️ Super Admin Control Center</h1>
          <p className="text-muted-foreground">Real-time monitoring and control for POP IN</p>
          <p className="text-sm text-green-600 mt-2">
            ✅ Live Data: {stats.totalUsers} total users • {stats.onlineUsers} online now
          </p>
          <p className="text-xs text-blue-600 mt-1">
            🔄 Auto-refresh: Every 30s • Real-time subscriptions active
          </p>
          <p className="text-xs text-purple-600 mt-1">
            📊 Showing {filteredUsers.length} of {liveUsers.length} users in list
          </p>
        </div>

        {/* Real-time Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-card border">
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground text-sm flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
              <div className="text-xs text-muted-foreground">All registered</div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border">
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground text-sm flex items-center">
                <Eye className="w-4 h-4 mr-2 text-green-500" />
                Online Now
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.onlineUsers}</div>
              <div className="text-xs text-muted-foreground">Active in 10min</div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border">
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground text-sm flex items-center">
                <MessageSquare className="w-4 h-4 mr-2" />
                Live Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.totalMessages}</div>
              <div className="text-xs text-muted-foreground">Recent activity</div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border">
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground text-sm flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                Active Stores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.activeStores}</div>
              <div className="text-xs text-muted-foreground">With activity</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="surveillance" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="surveillance">🔍 Live Surveillance</TabsTrigger>
            <TabsTrigger value="users">👥 All Users ({filteredUsers.length})</TabsTrigger>
            <TabsTrigger value="messages">💬 Message Monitor</TabsTrigger>
            <TabsTrigger value="analytics">📊 Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="surveillance">
            <Card className="bg-card border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Real-Time Activity Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Online Users */}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                      🟢 Users Online ({liveUsers.filter(u => u.is_online).length})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {liveUsers.filter(u => u.is_online).map(user => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <span className="font-medium text-foreground">{user.nickname}</span>
                            <Badge variant="outline" className="ml-2">{user.role}</Badge>
                            {user.email && <div className="text-xs text-muted-foreground">{user.email}</div>}
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-green-600">Online</span>
                          </div>
                        </div>
                      ))}
                      {liveUsers.filter(u => u.is_online).length === 0 && (
                        <div className="text-center text-muted-foreground py-4">
                          <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No users currently online</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Live Messages */}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">💬 Live Messages</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {liveMessages.slice(0, 10).map(message => (
                        <div key={message.id} className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-foreground">{message.user_nickname}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(message.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">{message.message}</p>
                          <span className="text-xs text-blue-600">@ {message.place_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="bg-card border">
              <CardHeader>
                <CardTitle className="text-foreground">Complete User Management</CardTitle>
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
                    <div key={userData.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${userData.is_online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                          <div className="text-foreground font-medium flex items-center space-x-2">
                            <span>{userData.nickname}</span>
                            <Badge variant="outline">{userData.role}</Badge>
                            {userData.is_banned && <Badge variant="destructive" className="text-xs">Banned</Badge>}
                            {userData.is_muted && <Badge variant="secondary" className="text-xs">Muted</Badge>}
                            {userData.id === user?.id && <Badge variant="default" className="text-xs bg-yellow-600">You</Badge>}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            {userData.email && <span>{userData.email} • </span>}
                            Joined {new Date(userData.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {userData.is_online ? (
                              <span className="text-green-600">🟢 Online now</span>
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
                            className="text-xs"
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
                            className="text-xs"
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
                    <div className="text-center text-muted-foreground py-8">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No users found matching your criteria</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <Card className="bg-card border">
              <CardHeader>
                <CardTitle className="text-foreground">Message Monitor</CardTitle>
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
                    <div key={message.id} className="flex items-start justify-between p-4 bg-muted rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-foreground font-medium">{message.user_nickname}</span>
                          <span className="text-muted-foreground text-sm">in {message.place_name}</span>
                          <span className="text-muted-foreground text-xs">
                            {new Date(message.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-sm">{message.message}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMessage(message.id)}
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="bg-card border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Real-Time Analytics Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">User Activity</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-3 bg-muted rounded">
                        <span className="text-foreground">Total Registered</span>
                        <Badge variant="secondary">{stats.totalUsers}</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted rounded">
                        <span className="text-foreground">Currently Online</span>
                        <Badge variant="default" className="bg-green-600">{stats.onlineUsers}</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted rounded">
                        <span className="text-foreground">Online Rate</span>
                        <Badge variant="secondary">
                          {stats.totalUsers > 0 ? Math.round((stats.onlineUsers / stats.totalUsers) * 100) : 0}%
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted rounded">
                        <span className="text-foreground">Banned Users</span>
                        <Badge variant="destructive">{liveUsers.filter(u => u.is_banned).length}</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">System Health</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-3 bg-muted rounded">
                        <span className="text-foreground">Real-time Status</span>
                        <Badge variant="default" className="bg-green-600">🟢 Active</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted rounded">
                        <span className="text-foreground">Data Refresh</span>
                        <Badge variant="secondary">Every 30s</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted rounded">
                        <span className="text-foreground">Live Updates</span>
                        <Badge variant="default" className="bg-blue-600">Enabled</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted rounded">
                        <span className="text-foreground">Active Messages</span>
                        <Badge variant="secondary">{liveMessages.length}</Badge>
                      </div>
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
