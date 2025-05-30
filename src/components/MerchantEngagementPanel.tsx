
import React, { useState, useEffect } from 'react';
import { Send, Users, MapPin, Megaphone, BarChart3, Eye, Gift } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeLocation } from '@/hooks/useRealtimeLocation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NearbyUser {
  id: string;
  nickname: string;
  distance: number;
  last_seen: string;
  status: string;
}

interface StoreStats {
  nearby_users: number;
  chat_messages_today: number;
  total_visits: number;
  engagement_rate: number;
  total_offers: number;
}

const MerchantEngagementPanel = () => {
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [storeStats, setStoreStats] = useState<StoreStats>({
    nearby_users: 0,
    chat_messages_today: 0,
    total_visits: 0,
    engagement_rate: 0,
    total_offers: 0
  });
  const [promotionText, setPromotionText] = useState('');
  const [merchantStores, setMerchantStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();
  const { calculateDistance } = useRealtimeLocation();

  useEffect(() => {
    if (user) {
      fetchMerchantStores();
      setupRealtimeSubscriptions();
      
      const interval = setInterval(() => {
        fetchNearbyUsers();
        fetchStoreStats();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [user, selectedStore]);

  const setupRealtimeSubscriptions = () => {
    if (!user) return;

    // Subscribe to real-time location updates
    const locationChannel = supabase
      .channel('location-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_locations'
        },
        () => {
          fetchNearbyUsers();
        }
      )
      .subscribe();

    // Subscribe to chat message updates
    const messageChannel = supabase
      .channel('message-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: selectedStore ? `place_id=eq.${selectedStore}` : undefined
        },
        () => {
          fetchStoreStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(locationChannel);
      supabase.removeChannel(messageChannel);
    };
  };

  const fetchMerchantStores = async () => {
    try {
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('merchant_id', user?.id)
        .eq('is_active', true);

      if (error) throw error;
      setMerchantStores(data || []);
      
      if (data && data.length > 0 && !selectedStore) {
        setSelectedStore(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching merchant stores:', error);
    }
  };

  const fetchNearbyUsers = async () => {
    if (!selectedStore) return;

    try {
      const selectedStoreData = merchantStores.find(store => store.id === selectedStore);
      if (!selectedStoreData) return;

      // Use the new user activity view for comprehensive data
      const { data: userActivity, error } = await supabase
        .from('user_activity_summary')
        .select('*')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .gte('last_seen', new Date(Date.now() - 30 * 60 * 1000).toISOString());

      if (error) throw error;

      const usersWithDistance = userActivity?.map(user => {
        const distance = calculateDistance(
          selectedStoreData.latitude,
          selectedStoreData.longitude,
          user.latitude,
          user.longitude
        );

        return {
          id: user.id,
          nickname: user.nickname || 'Anonymous',
          distance: Math.round(distance),
          last_seen: user.last_seen,
          status: user.status
        };
      }).filter(user => user.distance <= 2000) || [];

      setNearbyUsers(usersWithDistance);
      
      setStoreStats(prev => ({
        ...prev,
        nearby_users: usersWithDistance.length
      }));

    } catch (error) {
      console.error('Error fetching nearby users:', error);
    }
  };

  const fetchStoreStats = async () => {
    if (!selectedStore) return;

    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Get today's messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('place_id', selectedStore)
        .gte('created_at', todayStart.toISOString());

      if (messagesError) throw messagesError;

      // Get total visits from the new place_visits table
      const { data: visitsData, error: visitsError } = await supabase
        .from('place_visits')
        .select('id')
        .eq('place_id', selectedStore);

      if (visitsError) throw visitsError;

      // Get offers count
      const { data: offersData, error: offersError } = await supabase
        .from('offers')
        .select('id')
        .eq('place_id', selectedStore)
        .eq('is_active', true);

      if (offersError) throw offersError;

      const chatMessagesToday = messagesData?.length || 0;
      const totalVisits = visitsData?.length || 0;
      const engagementRate = nearbyUsers.length > 0 ? Math.round((chatMessagesToday / nearbyUsers.length) * 100) : 0;

      setStoreStats(prev => ({
        ...prev,
        chat_messages_today: chatMessagesToday,
        total_visits: totalVisits,
        engagement_rate: engagementRate,
        total_offers: offersData?.length || 0
      }));

    } catch (error) {
      console.error('Error fetching store stats:', error);
    }
  };

  const sendPromotionToNearbyUsers = async () => {
    if (!promotionText.trim() || !selectedStore) {
      toast.error('Please enter a promotion message and select a store');
      return;
    }

    setLoading(true);
    try {
      // Send promotion as a special message in the chat
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user?.id,
          message: `🎉 SPECIAL OFFER: ${promotionText}`,
          place_id: selectedStore,
          message_type: 'merchant',
          is_promotion: true
        });

      if (error) throw error;

      // Create an offer record
      const { error: offerError } = await supabase
        .from('offers')
        .insert({
          place_id: selectedStore,
          merchant_id: user?.id,
          title: 'Instant Promotion',
          description: promotionText,
          is_active: true
        });

      if (offerError) console.error('Error creating offer record:', offerError);

      toast.success(`🎉 Promotion sent to ${nearbyUsers.length} nearby users!`);
      setPromotionText('');
      fetchStoreStats();
      
    } catch (error) {
      console.error('Error sending promotion:', error);
      toast.error('Failed to send promotion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">🎯 Customer Engagement Hub</h2>
        <p className="text-muted-foreground">Connect with nearby customers in real-time</p>
      </div>

      {/* Store Selection */}
      {merchantStores.length > 0 && (
        <Card className="bg-card border">
          <CardHeader>
            <CardTitle className="text-foreground">Select Store</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {merchantStores.map(store => (
                <Button
                  key={store.id}
                  variant={selectedStore === store.id ? "default" : "outline"}
                  onClick={() => setSelectedStore(store.id)}
                  className="justify-start"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  {store.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-card border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-foreground">{storeStats.nearby_users}</p>
                <p className="text-xs text-muted-foreground">Users Nearby</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-foreground">{storeStats.chat_messages_today}</p>
                <p className="text-xs text-muted-foreground">Messages Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-foreground">{storeStats.engagement_rate}%</p>
                <p className="text-xs text-muted-foreground">Engagement</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-foreground">{storeStats.total_visits}</p>
                <p className="text-xs text-muted-foreground">Total Visits</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Gift className="w-5 h-5 text-pink-600" />
              <div>
                <p className="text-2xl font-bold text-foreground">{storeStats.total_offers}</p>
                <p className="text-xs text-muted-foreground">Active Offers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Promotion Panel */}
        <Card className="bg-card border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center">
              <Megaphone className="w-5 h-5 mr-2" />
              Send Real-time Promotion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Enter your special offer or promotion message..."
              value={promotionText}
              onChange={(e) => setPromotionText(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Will reach {storeStats.nearby_users} nearby users
              </span>
              <Button
                onClick={sendPromotionToNearbyUsers}
                disabled={loading || !promotionText.trim() || storeStats.nearby_users === 0}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Send className="w-4 h-4 mr-2" />
                {loading ? 'Sending...' : 'Send Now'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Real-time Nearby Users */}
        <Card className="bg-card border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Live Nearby Customers ({nearbyUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {nearbyUsers.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No customers nearby at the moment</p>
                </div>
              ) : (
                nearbyUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <span className="font-medium text-foreground">{user.nickname}</span>
                      <div className="text-sm text-muted-foreground">
                        {user.distance < 1000 
                          ? `${user.distance}m away` 
                          : `${(user.distance / 1000).toFixed(1)}km away`
                        }
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <Badge 
                        variant="secondary" 
                        className={
                          user.status === 'online' ? "bg-green-100 text-green-800" :
                          user.status === 'recently_active' ? "bg-yellow-100 text-yellow-800" :
                          "bg-gray-100 text-gray-800"
                        }
                      >
                        {user.status}
                      </Badge>
                      <Badge 
                        variant="outline"
                        className={user.distance <= 500 ? "border-green-500 text-green-700" : "border-blue-500 text-blue-700"}
                      >
                        {user.distance <= 500 ? 'Very Close' : 'Nearby'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MerchantEngagementPanel;
