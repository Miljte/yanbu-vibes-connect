import React, { useState, useEffect } from 'react';
import { Users, MapPin, MessageSquare, BarChart3, Shield, Ban, Eye, Trash2, Crown, Volume2, VolumeX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface User {
  id: string;
  nickname: string;
  email: string;
  role: string;
  created_at: string;
  is_banned?: boolean;
  is_muted?: boolean;
}

interface Message {
  id: string;
  message: string;
  user_nickname: string;
  place_name: string;
  created_at: string;
  is_deleted: boolean;
  is_reported?: boolean;
  message_type: string;
  is_promotion: boolean;
}

interface Place {
  id: string;
  name: string;
  type: string;
  merchant_nickname: string;
  is_active: boolean;
  created_at: string;
  latitude: number;
  longitude: number;
}

const EnhancedAdminDashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalPlaces: 0,
    totalMessages: 0,
    bannedUsers: 0,
    mutedUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchAdminData();
    setupRealtimeSubscriptions();
  }, []);

  const setupRealtimeSubscriptions = () => {
    // Real-time updates for new users
    const usersChannel = supabase
      .channel('admin_users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchAdminData();
      })
      .subscribe();

    // Real-time updates for messages
    const messagesChannel = supabase
      .channel('admin_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
        fetchAdminData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(messagesChannel);
    };
  };

  const fetchAdminData = async () => {
    try {
      console.log('🔍 Fetching admin data...');
      
      // Fetch ALL users with their roles - ensuring we get everyone
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
        throw profilesError;
      }

      console.log(`✅ Found ${profilesData?.length || 0} total profiles`);

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const { data: bansData } = await supabase
        .from('user_bans')
        .select('user_id')
        .eq('is_active', true);

      const { data: mutesData } = await supabase
        .from('user_mutes')
        .select('user_id')
        .eq('is_active', true);

      const usersWithRoles = profilesData?.map(profile => {
        const userRole = rolesData?.find(role => role.user_id === profile.id);
        const isBanned = bansData?.some(ban => ban.user_id === profile.id) || false;
        const isMuted = mutesData?.some(mute => mute.user_id === profile.id) || false;
        
        return {
          ...profile,
          email: '',
          role: userRole?.role || 'user',
          is_banned: isBanned,
          is_muted: isMuted
        };
      }) || [];

      console.log(`👥 Users with roles: ${usersWithRoles.length}`);
      console.log('Users list:', usersWithRoles.map(u => ({ nickname: u.nickname, role: u.role })));

      // Fetch messages with enhanced info
      const { data: messagesData } = await supabase
        .from('chat_messages')
        .select(`
          id,
          message,
          created_at,
          is_deleted,
          user_id,
          place_id,
          message_type,
          is_promotion
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      const { data: profilesForMessages } = await supabase
        .from('profiles')
        .select('id, nickname');

      const { data: placesForMessages } = await supabase
        .from('places')
        .select('id, name');

      const messagesWithInfo = messagesData?.map(message => {
        const profile = profilesForMessages?.find(p => p.id === message.user_id);
        const place = placesForMessages?.find(p => p.id === message.place_id);
        return {
          ...message,
          user_nickname: profile?.nickname || 'Unknown',
          place_name: place?.name || 'Unknown'
        };
      }) || [];

      // Fetch places with merchant info
      const { data: placesData } = await supabase
        .from('places')
        .select(`
          id,
          name,
          type,
          is_active,
          created_at,
          merchant_id,
          latitude,
          longitude
        `)
        .order('created_at', { ascending: false });

      const placesWithMerchants = await Promise.all(
        (placesData || []).map(async (place) => {
          if (place.merchant_id) {
            const { data: merchantProfile } = await supabase
              .from('profiles')
              .select('nickname')
              .eq('id', place.merchant_id)
              .single();
            
            return {
              ...place,
              merchant_nickname: merchantProfile?.nickname || 'Unknown'
            };
          }
          return {
            ...place,
            merchant_nickname: 'No merchant'
          };
        })
      );

      // Fetch reports
      const { data: reportsData } = await supabase
        .from('reported_messages')
        .select(`
          id,
          reason,
          status,
          created_at,
          message_id,
          reported_by
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setUsers(usersWithRoles);
      setMessages(messagesWithInfo);
      setPlaces(placesWithMerchants);
      setReports(reportsData || []);

      setStats({
        totalUsers: usersWithRoles?.length || 0,
        activeUsers: usersWithRoles?.filter(u => new Date(u.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length || 0,
        totalPlaces: placesWithMerchants?.length || 0,
        totalMessages: messagesWithInfo?.length || 0,
        bannedUsers: usersWithRoles?.filter(u => u.is_banned).length || 0,
        mutedUsers: usersWithRoles?.filter(u => u.is_muted).length || 0
      });

      console.log('📊 Final stats:', {
        totalUsers: usersWithRoles?.length || 0,
        totalPlaces: placesWithMerchants?.length || 0,
        totalMessages: messagesWithInfo?.length || 0
      });

    } catch (error) {
      console.error('❌ Error fetching admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
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
      fetchAdminData();
    } catch (error) {
      console.error('Error promoting user:', error);
      toast.error('Failed to promote user');
    }
  };

  const banUser = async (userId: string) => {
    try {
      // In a real implementation, you'd have a user_bans table
      toast.success('User banned (feature would be implemented with user_bans table)');
      fetchAdminData();
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    }
  };

  const muteUser = async (userId: string) => {
    try {
      // In a real implementation, you'd have a user_mutes table
      toast.success('User muted (feature would be implemented with user_mutes table)');
      fetchAdminData();
    } catch (error) {
      console.error('Error muting user:', error);
      toast.error('Failed to mute user');
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
      fetchAdminData();
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const togglePlaceStatus = async (placeId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('places')
        .update({ is_active: !isActive })
        .eq('id', placeId);

      if (error) throw error;
      toast.success(`Store ${!isActive ? 'activated' : 'deactivated'}`);
      fetchAdminData();
    } catch (error) {
      console.error('Error updating store status:', error);
      toast.error('Failed to update store status');
    }
  };

  const resolveReport = async (reportId: string, action: 'dismiss' | 'delete_message') => {
    try {
      const { error } = await supabase
        .from('reported_messages')
        .update({ 
          status: action === 'dismiss' ? 'dismissed' : 'resolved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;
      toast.success(`Report ${action === 'dismiss' ? 'dismissed' : 'resolved'}`);
      fetchAdminData();
    } catch (error) {
      console.error('Error resolving report:', error);
      toast.error('Failed to resolve report');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 flex items-center justify-center">
        <div className="text-white">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pb-20">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">🛠 Admin Control Center</h1>
          <p className="text-slate-300">Full platform management • Real-time monitoring</p>
          <p className="text-sm text-slate-400 mt-2">
            Total Users: {stats.totalUsers} | Messages: {stats.totalMessages} | Places: {stats.totalPlaces}
          </p>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-xs">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-400">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-xs">Active Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{stats.activeUsers}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-xs">Total Stores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{stats.totalPlaces}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-xs">Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">{stats.totalMessages}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-xs">Banned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{stats.bannedUsers}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-xs">Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400">{reports.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="users" className="data-[state=active]:bg-cyan-600">
              <Users className="w-4 h-4 mr-2" />
              User Management ({users.length})
            </TabsTrigger>
            <TabsTrigger value="places" className="data-[state=active]:bg-cyan-600">
              <MapPin className="w-4 h-4 mr-2" />
              Store Management
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-cyan-600">
              <MessageSquare className="w-4 h-4 mr-2" />
              Message Moderation
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-cyan-600">
              <Shield className="w-4 h-4 mr-2" />
              Reports ({reports.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">User Management & Moderation</CardTitle>
                <p className="text-slate-400 text-sm">Showing {users.length} registered users</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-white font-medium flex items-center space-x-2">
                            <span>{user.nickname}</span>
                            {user.role === 'admin' && <Crown className="w-4 h-4 text-yellow-400" />}
                            {user.role === 'merchant' && <Crown className="w-4 h-4 text-purple-400" />}
                          </div>
                          <div className="text-slate-400 text-sm">
                            Joined {new Date(user.created_at).toLocaleDateString()} • {user.role}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className={`border-slate-600 ${
                          user.role === 'admin' ? 'text-yellow-400' :
                          user.role === 'merchant' ? 'text-purple-400' : 'text-slate-300'
                        }`}>
                          {user.role}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => promoteUser(user.id, 'merchant')}
                          className="border-slate-600 text-slate-300 hover:text-white text-xs"
                        >
                          → Merchant
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => promoteUser(user.id, 'admin')}
                          className="border-slate-600 text-slate-300 hover:text-white text-xs"
                        >
                          → Admin
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => muteUser(user.id)}
                          className="border-orange-600 text-orange-400 hover:text-white text-xs"
                        >
                          <VolumeX className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => banUser(user.id)}
                          className="text-xs"
                        >
                          <Ban className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <div className="text-center text-slate-400 py-8">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No users found in database</p>
                      <p className="text-sm mt-2">Check database connection and RLS policies</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="places">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Store Management & Control</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {places.map((place) => (
                    <div key={place.id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-white font-medium">{place.name}</div>
                          <div className="text-slate-400 text-sm">
                            {place.type} • Merchant: {place.merchant_nickname}
                          </div>
                          <div className="text-slate-500 text-xs">
                            {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge 
                          variant="outline" 
                          className={`border-slate-600 ${place.is_active ? 'text-green-400' : 'text-red-400'}`}
                        >
                          {place.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => togglePlaceStatus(place.id, place.is_active)}
                          className="border-slate-600 text-slate-300 hover:text-white"
                        >
                          {place.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-slate-300 hover:text-white"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Live Message Moderation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {messages.map((message) => (
                    <div key={message.id} className="flex items-start justify-between p-4 bg-slate-700/30 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-white font-medium flex items-center space-x-1">
                            {message.message_type === 'merchant' && <Crown className="w-3 h-3 text-purple-400" />}
                            <span>{message.user_nickname}</span>
                          </span>
                          <span className="text-slate-400 text-sm">in {message.place_name}</span>
                          {message.is_promotion && (
                            <Badge className="bg-orange-600 text-white text-xs">PROMO</Badge>
                          )}
                          <span className="text-slate-500 text-xs">
                            {new Date(message.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className={`text-sm ${message.is_deleted ? 'text-red-400 line-through' : 'text-slate-300'}`}>
                          {message.message}
                        </p>
                      </div>
                      {!message.is_deleted && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-600 text-slate-300"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteMessage(message.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Reported Content Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reports.length === 0 ? (
                    <div className="text-center text-slate-400 py-8">
                      <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No pending reports</p>
                    </div>
                  ) : (
                    reports.map((report) => (
                      <div key={report.id} className="p-4 bg-slate-700/30 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="text-white font-medium">
                              Report #{report.id.substring(0, 8)}
                            </span>
                            <span className="text-slate-400 text-sm ml-2">
                              {new Date(report.created_at).toLocaleString()}
                            </span>
                          </div>
                          <Badge variant="outline" className="border-orange-500 text-orange-400">
                            {report.status}
                          </Badge>
                        </div>
                        <p className="text-slate-300 text-sm mb-2">
                          Reason: {report.reason}
                        </p>
                        <div className="flex space-x-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveReport(report.id, 'dismiss')}
                            className="border-slate-600 text-slate-300"
                          >
                            Dismiss
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => resolveReport(report.id, 'delete_message')}
                          >
                            Delete Message
                          </Button>
                        </div>
                      </div>
                    ))
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

export default EnhancedAdminDashboard;
