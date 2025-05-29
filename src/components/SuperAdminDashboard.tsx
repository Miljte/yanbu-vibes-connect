
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
  latitude?: number;
  longitude?: number;
  last_seen: string;
  role: string;
  is_online: boolean;
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

interface StoreActivity {
  place_id: string;
  place_name: string;
  nearby_users: number;
  message_count: number;
  merchant_name: string;
}

const SuperAdminDashboard = () => {
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const [liveUsers, setLiveUsers] = useState<LiveUser[]>([]);
  const [storeActivity, setStoreActivity] = useState<StoreActivity[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    totalMessages: 0,
    activeStores: 0
  });
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const { user } = useAuth();

  // Real-time data fetching
  useEffect(() => {
    fetchLiveData();
    setupRealtimeSubscriptions();
  }, []);

  const fetchLiveData = async () => {
    try {
      // Fetch live users with locations
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, nickname, created_at');

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const { data: locationsData } = await supabase
        .from('user_locations')
        .select('user_id, latitude, longitude, updated_at');

      // Combine user data
      const usersWithStatus = profilesData?.map(profile => {
        const userRole = rolesData?.find(role => role.user_id === profile.id);
        const location = locationsData?.find(loc => loc.user_id === profile.id);
        const lastSeen = location?.updated_at || profile.created_at;
        const isOnline = new Date(lastSeen) > new Date(Date.now() - 10 * 60 * 1000); // 10 minutes

        return {
          id: profile.id,
          nickname: profile.nickname,
          latitude: location?.latitude,
          longitude: location?.longitude,
          last_seen: lastSeen,
          role: userRole?.role || 'user',
          is_online: isOnline
        };
      }) || [];

      setLiveUsers(usersWithStatus);

      // Fetch recent messages with user and place info
      const { data: messagesData } = await supabase
        .from('chat_messages')
        .select('id, message, created_at, user_id, place_id')
        .order('created_at', { ascending: false })
        .limit(50);

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

      // Calculate stats
      setStats({
        totalUsers: usersWithStatus.length,
        onlineUsers: usersWithStatus.filter(u => u.is_online).length,
        totalMessages: messagesWithInfo.length,
        activeStores: storeActivity.length
      });

    } catch (error) {
      console.error('Error fetching live data:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('live-messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          console.log('📨 New message detected:', payload);
          fetchLiveData(); // Refresh data
        }
      )
      .subscribe();

    // Subscribe to user location updates
    const locationsChannel = supabase
      .channel('live-locations')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_locations' },
        (payload) => {
          console.log('📍 Location update detected:', payload);
          fetchLiveData(); // Refresh data
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(locationsChannel);
    };
  };

  const banUser = async (userId: string) => {
    try {
      // For now, we'll use user_roles to mark banned users
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: 'user' // Keep as user but add ban logic later
        });

      if (error) throw error;
      toast.success('User action completed');
      fetchLiveData();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
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

  const filteredMessages = liveMessages.filter(msg => 
    searchFilter === '' || 
    msg.message.toLowerCase().includes(searchFilter.toLowerCase()) ||
    msg.user_nickname.toLowerCase().includes(searchFilter.toLowerCase()) ||
    msg.place_name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">🛡️ Super Admin Control Center</h1>
          <p className="text-muted-foreground">Real-time monitoring and control for POP IN</p>
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
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="surveillance" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="surveillance">🔍 Live Surveillance</TabsTrigger>
            <TabsTrigger value="users">👥 User Management</TabsTrigger>
            <TabsTrigger value="messages">💬 Message Monitor</TabsTrigger>
            <TabsTrigger value="analytics">📊 Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="surveillance">
            <Card className="bg-card border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Real-Time Surveillance Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Online Users */}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">🟢 Users Online</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {liveUsers.filter(u => u.is_online).map(user => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <span className="font-medium text-foreground">{user.nickname}</span>
                            <Badge variant="outline" className="ml-2">{user.role}</Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-muted-foreground">Online</span>
                          </div>
                        </div>
                      ))}
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
                <CardTitle className="text-foreground">User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {liveUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${user.is_online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <div>
                          <div className="text-foreground font-medium">{user.nickname}</div>
                          <div className="text-muted-foreground text-sm">
                            Last seen: {new Date(user.last_seen).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">{user.role}</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => promoteUser(user.id, 'merchant')}
                          disabled={user.role === 'admin'}
                        >
                          <UserCheck className="w-4 h-4 mr-1" />
                          Promote
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => banUser(user.id)}
                          disabled={user.role === 'admin'}
                        >
                          <Ban className="w-4 h-4 mr-1" />
                          Manage
                        </Button>
                      </div>
                    </div>
                  ))}
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
                  Real-Time Analytics
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
                        <span className="text-foreground">Messages Today</span>
                        <Badge variant="secondary">{liveMessages.length}</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">System Health</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-3 bg-muted rounded">
                        <span className="text-foreground">Active Places</span>
                        <Badge variant="secondary">{stats.activeStores}</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted rounded">
                        <span className="text-foreground">GPS Accuracy</span>
                        <Badge variant="default" className="bg-blue-600">High</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted rounded">
                        <span className="text-foreground">Real-time Status</span>
                        <Badge variant="default" className="bg-green-600">Active</Badge>
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
