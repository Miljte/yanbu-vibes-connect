
import React, { useState, useEffect } from 'react';
import { Shield, Users, MessageSquare, Ban, Trash2, Eye, UserX, Volume2, VolumeX, Search, Filter, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useChatValidation } from '@/hooks/useChatValidation';
import { toast } from 'sonner';

interface User {
  id: string;
  nickname: string;
  email?: string;
  created_at: string;
  role: string;
  is_online: boolean;
  last_seen?: string;
}

interface ChatMessage {
  id: string;
  message: string;
  user_id: string;
  place_id: string;
  created_at: string;
  is_deleted: boolean;
  message_type: 'user' | 'merchant' | 'system';
  is_promotion: boolean;
  user_nickname: string;
  place_name: string;
}

interface UserMute {
  id: string;
  user_id: string;
  muted_by: string;
  reason?: string;
  muted_at: string;
  expires_at?: string;
  is_active: boolean;
  user_nickname: string;
}

interface UserBan {
  id: string;
  user_id: string;
  banned_by: string;
  reason?: string;
  banned_at: string;
  expires_at?: string;
  is_active: boolean;
  user_nickname: string;
}

interface Place {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  message_count: number;
}

const SuperAdminDashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mutes, setMutes] = useState<UserMute[]>([]);
  const [bans, setBans] = useState<UserBan[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  
  const { user } = useAuth();
  const { checkMuteStatus } = useChatValidation();

  useEffect(() => {
    fetchAllData();
    setupRealtimeSubscriptions();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchUsers(),
        fetchMessages(),
        fetchMutes(),
        fetchBans(),
        fetchPlaces()
      ]);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nickname, created_at');

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Fetch user locations for online status
      const { data: locationsData } = await supabase
        .from('user_locations')
        .select('user_id, updated_at');

      // Combine data
      const usersWithDetails = profilesData?.map(profile => {
        const userRole = rolesData?.find(role => role.user_id === profile.id);
        const location = locationsData?.find(loc => loc.user_id === profile.id);
        
        // Check if user is online (activity within last 10 minutes)
        const lastSeen = location?.updated_at || profile.created_at;
        const isOnline = lastSeen ? new Date(lastSeen) > new Date(Date.now() - 10 * 60 * 1000) : false;

        return {
          id: profile.id,
          nickname: profile.nickname,
          created_at: profile.created_at,
          role: userRole?.role || 'user',
          is_online: isOnline,
          last_seen: lastSeen
        };
      }) || [];

      console.log('✅ Fetched users:', usersWithDetails.length);
      setUsers(usersWithDetails);
    } catch (error) {
      console.error('❌ Error fetching users:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data: messagesData, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      // Get user nicknames
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, nickname');

      // Get place names
      const { data: placesData } = await supabase
        .from('places')
        .select('id, name');

      const messagesWithInfo = messagesData?.map(message => {
        const profile = profilesData?.find(p => p.id === message.user_id);
        const place = placesData?.find(p => p.id === message.place_id);
        
        return {
          ...message,
          user_nickname: profile?.nickname || 'Unknown User',
          place_name: place?.name || 'Unknown Place'
        };
      }) || [];

      console.log('✅ Fetched messages:', messagesWithInfo.length);
      setMessages(messagesWithInfo);
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
    }
  };

  const fetchMutes = async () => {
    try {
      const { data: mutesData, error } = await supabase
        .from('user_mutes')
        .select('*')
        .eq('is_active', true)
        .order('muted_at', { ascending: false });

      if (error) throw error;

      // Get user nicknames
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, nickname');

      const mutesWithInfo = mutesData?.map(mute => {
        const profile = profilesData?.find(p => p.id === mute.user_id);
        return {
          ...mute,
          user_nickname: profile?.nickname || 'Unknown User'
        };
      }) || [];

      console.log('✅ Fetched mutes:', mutesWithInfo.length);
      setMutes(mutesWithInfo);
    } catch (error) {
      console.error('❌ Error fetching mutes:', error);
    }
  };

  const fetchBans = async () => {
    try {
      const { data: bansData, error } = await supabase
        .from('user_bans')
        .select('*')
        .eq('is_active', true)
        .order('banned_at', { ascending: false });

      if (error) throw error;

      // Get user nicknames
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, nickname');

      const bansWithInfo = bansData?.map(ban => {
        const profile = profilesData?.find(p => p.id === ban.user_id);
        return {
          ...ban,
          user_nickname: profile?.nickname || 'Unknown User'
        };
      }) || [];

      console.log('✅ Fetched bans:', bansWithInfo.length);
      setBans(bansWithInfo);
    } catch (error) {
      console.error('❌ Error fetching bans:', error);
    }
  };

  const fetchPlaces = async () => {
    try {
      const { data: placesData, error } = await supabase
        .from('places')
        .select('id, name, type, is_active');

      if (error) throw error;

      // Get message counts for each place
      const placesWithCounts = await Promise.all(
        (placesData || []).map(async (place) => {
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('place_id', place.id)
            .eq('is_deleted', false);

          return {
            ...place,
            message_count: count || 0
          };
        })
      );

      console.log('✅ Fetched places:', placesWithCounts.length);
      setPlaces(placesWithCounts);
    } catch (error) {
      console.error('❌ Error fetching places:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    const messagesChannel = supabase
      .channel('admin_messages_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
        console.log('🔄 Real-time message update detected');
        fetchMessages();
      })
      .subscribe();

    const mutesChannel = supabase
      .channel('admin_mutes_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_mutes' }, () => {
        console.log('🔄 Real-time mute update detected');
        fetchMutes();
      })
      .subscribe();

    const bansChannel = supabase
      .channel('admin_bans_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_bans' }, () => {
        console.log('🔄 Real-time ban update detected');
        fetchBans();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(mutesChannel);
      supabase.removeChannel(bansChannel);
    };
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_deleted: true })
        .eq('id', messageId);

      if (error) throw error;
      
      toast.success('Message deleted successfully');
      fetchMessages();
    } catch (error) {
      console.error('❌ Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const banUser = async (userId: string, reason?: string) => {
    try {
      const { error } = await supabase
        .from('user_bans')
        .insert({
          user_id: userId,
          banned_by: user?.id,
          reason: reason || 'Admin action',
          is_active: true
        });

      if (error) throw error;
      
      toast.success('User banned successfully');
      fetchBans();
      fetchUsers();
    } catch (error) {
      console.error('❌ Error banning user:', error);
      toast.error('Failed to ban user');
    }
  };

  const muteUser = async (userId: string, reason?: string, duration?: number) => {
    try {
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
      
      toast.success('User muted successfully');
      fetchMutes();
      fetchUsers();
    } catch (error) {
      console.error('❌ Error muting user:', error);
      toast.error('Failed to mute user');
    }
  };

  const unbanUser = async (banId: string) => {
    try {
      const { error } = await supabase
        .from('user_bans')
        .update({ is_active: false })
        .eq('id', banId);

      if (error) throw error;
      
      toast.success('User unbanned successfully');
      fetchBans();
      fetchUsers();
    } catch (error) {
      console.error('❌ Error unbanning user:', error);
      toast.error('Failed to unban user');
    }
  };

  const unmuteUser = async (muteId: string) => {
    try {
      const { error } = await supabase
        .from('user_mutes')
        .update({ is_active: false })
        .eq('id', muteId);

      if (error) throw error;
      
      toast.success('User unmuted successfully');
      fetchMutes();
      fetchUsers();
    } catch (error) {
      console.error('❌ Error unmuting user:', error);
      toast.error('Failed to unmute user');
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         message.user_nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         message.place_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlace = selectedPlace === 'all' || message.place_id === selectedPlace;
    return matchesSearch && matchesPlace;
  });

  const filteredUsers = users.filter(user => 
    user.nickname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalUsers: users.length,
    onlineUsers: users.filter(u => u.is_online).length,
    totalMessages: messages.length,
    activeMutes: mutes.length,
    activeBans: bans.length,
    activePlaces: places.filter(p => p.is_active).length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-foreground">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">🛡️ Super Admin Dashboard</h1>
            <p className="text-muted-foreground">Complete control over user interactions and chat activity</p>
          </div>
          <Button onClick={refreshData} disabled={refreshing} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Online</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{stats.onlineUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">{stats.totalMessages}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Active Mutes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400">{stats.activeMutes}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Active Bans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{stats.activeBans}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Active Places</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-400">{stats.activePlaces}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="messages" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="messages">
              <MessageSquare className="w-4 h-4 mr-2" />
              Live Chat Monitor ({filteredMessages.length})
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              User Management ({filteredUsers.length})
            </TabsTrigger>
            <TabsTrigger value="moderation">
              <Shield className="w-4 h-4 mr-2" />
              Moderation Actions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Real-Time Chat Monitoring</CardTitle>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Search messages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-64"
                    />
                    <Select value={selectedPlace} onValueChange={setSelectedPlace}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by place" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Places</SelectItem>
                        {places.map(place => (
                          <SelectItem key={place.id} value={place.id}>
                            {place.name} ({place.message_count})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredMessages.map((message) => (
                    <div key={message.id} className="flex items-start justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-foreground">{message.user_nickname}</span>
                          <Badge variant="outline" className="text-xs">
                            {message.place_name}
                          </Badge>
                          {message.message_type === 'merchant' && (
                            <Badge className="bg-purple-600 text-xs">Merchant</Badge>
                          )}
                          {message.is_promotion && (
                            <Badge className="bg-orange-600 text-xs">Promo</Badge>
                          )}
                          <span className="text-muted-foreground text-xs">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className={`text-sm ${message.is_deleted ? 'text-red-400 line-through' : 'text-foreground'}`}>
                          {message.message}
                        </p>
                      </div>
                      {!message.is_deleted && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteMessage(message.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => muteUser(message.user_id, 'Inappropriate message')}
                          >
                            <VolumeX className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => banUser(message.user_id, 'Inappropriate message')}
                          >
                            <Ban className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {filteredMessages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No messages found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>User Management</CardTitle>
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredUsers.map((userData) => (
                    <div key={userData.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${userData.is_online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <div>
                          <div className="font-medium text-foreground">{userData.nickname}</div>
                          <div className="text-muted-foreground text-sm">
                            {userData.role} • Joined {new Date(userData.created_at).toLocaleDateString()}
                            {userData.last_seen && (
                              <span className="ml-2">
                                Last seen: {new Date(userData.last_seen).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Eye className="w-3 h-3 mr-1" />
                              Actions
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>User Actions: {userData.nickname}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <Button
                                  variant="outline"
                                  onClick={() => muteUser(userData.id, 'Admin action', 60)}
                                  className="border-orange-600 text-orange-400"
                                >
                                  <VolumeX className="w-3 h-3 mr-1" />
                                  Mute 1hr
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => muteUser(userData.id, 'Admin action', 1440)}
                                  className="border-orange-600 text-orange-400"
                                >
                                  <VolumeX className="w-3 h-3 mr-1" />
                                  Mute 24hr
                                </Button>
                              </div>
                              <Button
                                variant="destructive"
                                onClick={() => banUser(userData.id, 'Admin action')}
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
                      <p>No users found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="moderation">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Active Mutes ({mutes.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {mutes.map((mute) => (
                      <div key={mute.id} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                        <div>
                          <span className="font-medium text-foreground">{mute.user_nickname}</span>
                          <div className="text-muted-foreground text-sm">
                            Muted: {new Date(mute.muted_at).toLocaleString()}
                            {mute.expires_at && (
                              <span className="ml-2">
                                Expires: {new Date(mute.expires_at).toLocaleString()}
                              </span>
                            )}
                          </div>
                          {mute.reason && (
                            <div className="text-muted-foreground text-xs">Reason: {mute.reason}</div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unmuteUser(mute.id)}
                        >
                          <Volume2 className="w-3 h-3 mr-1" />
                          Unmute
                        </Button>
                      </div>
                    ))}
                    {mutes.length === 0 && (
                      <div className="text-center text-muted-foreground py-4">
                        <VolumeX className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No active mutes</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Active Bans ({bans.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {bans.map((ban) => (
                      <div key={ban.id} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                        <div>
                          <span className="font-medium text-foreground">{ban.user_nickname}</span>
                          <div className="text-muted-foreground text-sm">
                            Banned: {new Date(ban.banned_at).toLocaleString()}
                            {ban.expires_at && (
                              <span className="ml-2">
                                Expires: {new Date(ban.expires_at).toLocaleString()}
                              </span>
                            )}
                          </div>
                          {ban.reason && (
                            <div className="text-muted-foreground text-xs">Reason: {ban.reason}</div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unbanUser(ban.id)}
                        >
                          <UserX className="w-3 h-3 mr-1" />
                          Unban
                        </Button>
                      </div>
                    ))}
                    {bans.length === 0 && (
                      <div className="text-center text-muted-foreground py-4">
                        <Ban className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No active bans</p>
                      </div>
                    )}
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

export default SuperAdminDashboard;
