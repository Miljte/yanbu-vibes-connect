
import React, { useState, useEffect } from 'react';
import { Shield, Users, Eye, Ban, Crown, Trash2, MessageSquare, MapPin, Settings } from 'lucide-react';
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
  created_at: string;
  role: string;
  is_banned: boolean;
  is_muted: boolean;
  last_seen?: string;
  location?: { latitude: number; longitude: number };
}

interface AdminLog {
  id: string;
  action_type: string;
  target_user_id?: string;
  details: any;
  created_at: string;
  admin_nickname: string;
}

const AdvancedAdminPanel = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchUsers();
    fetchAdminLogs();
    setupRealtimeSubscriptions();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, nickname, created_at')
        .order('created_at', { ascending: false });

      // Fetch user roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Fetch user locations
      const { data: locationsData } = await supabase
        .from('user_locations')
        .select('user_id, latitude, longitude, updated_at');

      // Fetch bans and mutes
      const { data: bansData } = await supabase
        .from('user_bans')
        .select('user_id')
        .eq('is_active', true);

      const { data: mutesData } = await supabase
        .from('user_mutes')
        .select('user_id')
        .eq('is_active', true);

      // Combine all data
      const usersWithDetails = profilesData?.map(profile => {
        const userRole = rolesData?.find(role => role.user_id === profile.id);
        const location = locationsData?.find(loc => loc.user_id === profile.id);
        const isBanned = bansData?.some(ban => ban.user_id === profile.id);
        const isMuted = mutesData?.some(mute => mute.user_id === profile.id);

        return {
          id: profile.id,
          nickname: profile.nickname,
          created_at: profile.created_at,
          role: userRole?.role || 'user',
          is_banned: isBanned || false,
          is_muted: isMuted || false,
          last_seen: location?.updated_at,
          location: location ? { latitude: location.latitude, longitude: location.longitude } : undefined
        };
      }) || [];

      setUsers(usersWithDetails);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminLogs = async () => {
    try {
      const { data: logsData } = await supabase
        .from('admin_logs')
        .select('*, admin:admin_id(nickname)')
        .order('created_at', { ascending: false })
        .limit(50);

      const logsWithNames = logsData?.map(log => ({
        ...log,
        admin_nickname: log.admin?.nickname || 'Unknown Admin'
      })) || [];

      setAdminLogs(logsWithNames);
    } catch (error) {
      console.error('Error fetching admin logs:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to profile changes
    const profilesChannel = supabase
      .channel('admin-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchUsers();
      })
      .subscribe();

    // Subscribe to admin logs
    const logsChannel = supabase
      .channel('admin-logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_logs' }, () => {
        fetchAdminLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(logsChannel);
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
    } catch (error) {
      console.error('Error logging admin action:', error);
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

      await logAdminAction('role_change', userId, { newRole, previousRole: users.find(u => u.id === userId)?.role });
      toast.success(`User promoted to ${newRole}`);
      fetchUsers();
    } catch (error) {
      console.error('Error promoting user:', error);
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
      fetchUsers();
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
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
      fetchUsers();
    } catch (error) {
      console.error('Error muting user:', error);
      toast.error('Failed to mute user');
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
      console.error('Error deleting messages:', error);
      toast.error('Failed to delete messages');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.nickname.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 flex items-center justify-center">
        <div className="text-white">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pb-20">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">🛡️ Advanced Admin Control Panel</h1>
          <p className="text-slate-300">Complete control over users, content, and system operations</p>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="users" className="data-[state=active]:bg-cyan-600">
              <Users className="w-4 h-4 mr-2" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="surveillance" className="data-[state=active]:bg-cyan-600">
              <Eye className="w-4 h-4 mr-2" />
              Live Surveillance
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-cyan-600">
              <Settings className="w-4 h-4 mr-2" />
              Admin Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">User Management & Control</CardTitle>
                <div className="flex space-x-4">
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-xs bg-slate-700 border-slate-600 text-white"
                  />
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
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
                <div className="space-y-4">
                  {filteredUsers.map((userData) => (
                    <div key={userData.id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-white font-medium flex items-center space-x-2">
                            <span>{userData.nickname}</span>
                            {userData.role === 'admin' && <Crown className="w-4 h-4 text-yellow-400" />}
                            {userData.role === 'merchant' && <Crown className="w-4 h-4 text-purple-400" />}
                            {userData.is_banned && <Badge variant="destructive" className="text-xs">Banned</Badge>}
                            {userData.is_muted && <Badge variant="secondary" className="text-xs">Muted</Badge>}
                          </div>
                          <div className="text-slate-400 text-sm">
                            Joined {new Date(userData.created_at).toLocaleDateString()} • {userData.role}
                            {userData.last_seen && (
                              <span className="ml-2">
                                Last seen: {new Date(userData.last_seen).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-600 text-slate-300 hover:text-white"
                              onClick={() => setSelectedUser(userData)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-slate-800 border-slate-700">
                            <DialogHeader>
                              <DialogTitle className="text-white">User Management: {userData.nickname}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <Button
                                  variant="outline"
                                  onClick={() => promoteUser(userData.id, 'merchant')}
                                  disabled={userData.role === 'admin'}
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
                                  onClick={() => muteUser(userData.id)}
                                  disabled={userData.is_muted}
                                  className="border-orange-600 text-orange-400"
                                >
                                  <MessageSquare className="w-3 h-3 mr-1" />
                                  Mute User
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => banUser(userData.id)}
                                  disabled={userData.is_banned || userData.role === 'admin'}
                                >
                                  <Ban className="w-3 h-3 mr-1" />
                                  Ban User
                                </Button>
                              </div>
                              <Button
                                variant="destructive"
                                onClick={() => deleteUserMessages(userData.id)}
                                className="w-full"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Delete All Messages
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="surveillance">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Live User Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {users.filter(u => u.last_seen && new Date(u.last_seen) > new Date(Date.now() - 30 * 60 * 1000))
                      .map(user => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded">
                          <div>
                            <span className="text-white font-medium">{user.nickname}</span>
                            <div className="text-slate-400 text-sm">{user.role}</div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-green-400 text-xs">Online</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">System Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-slate-700/30 rounded">
                      <div className="text-2xl font-bold text-cyan-400">{users.length}</div>
                      <div className="text-slate-400 text-sm">Total Users</div>
                    </div>
                    <div className="text-center p-4 bg-slate-700/30 rounded">
                      <div className="text-2xl font-bold text-green-400">
                        {users.filter(u => u.last_seen && new Date(u.last_seen) > new Date(Date.now() - 30 * 60 * 1000)).length}
                      </div>
                      <div className="text-slate-400 text-sm">Online Now</div>
                    </div>
                    <div className="text-center p-4 bg-slate-700/30 rounded">
                      <div className="text-2xl font-bold text-red-400">
                        {users.filter(u => u.is_banned).length}
                      </div>
                      <div className="text-slate-400 text-sm">Banned</div>
                    </div>
                    <div className="text-center p-4 bg-slate-700/30 rounded">
                      <div className="text-2xl font-bold text-orange-400">
                        {users.filter(u => u.is_muted).length}
                      </div>
                      <div className="text-slate-400 text-sm">Muted</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="logs">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Admin Action Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {adminLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-slate-700/30 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-medium">{log.admin_nickname}</span>
                        <span className="text-slate-400 text-sm">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm">
                        Action: {log.action_type}
                        {log.details && Object.keys(log.details).length > 0 && (
                          <span className="text-slate-400 ml-2">
                            ({JSON.stringify(log.details)})
                          </span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdvancedAdminPanel;
