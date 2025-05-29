
import React, { useState, useEffect } from 'react';
import { Send, Users, MapPin, Megaphone, BarChart3, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
}

interface StoreStats {
  nearby_users: number;
  chat_messages_today: number;
  total_visits: number;
  engagement_rate: number;
}

const MerchantEngagementPanel = () => {
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [storeStats, setStoreStats] = useState<StoreStats>({
    nearby_users: 0,
    chat_messages_today: 0,
    total_visits: 0,
    engagement_rate: 0
  });
  const [promotionText, setPromotionText] = useState('');
  const [merchantStores, setMerchantStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();
  const { location, calculateDistance } = useRealtimeLocation();

  useEffect(() => {
    if (user) {
      fetchMerchantStores();
      fetchNearbyUsers();
      fetchStoreStats();
      
      // Set up real-time updates
      const interval = setInterval(() => {
        fetchNearbyUsers();
        fetchStoreStats();
      }, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [user, selectedStore]);

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

      // Get all users with recent locations
      const { data: userLocations, error } = await supabase
        .from('user_locations')
        .select(`
          user_id,
          latitude,
          longitude,
          updated_at,
          profiles(nickname)
        `)
        .gte('updated_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()); // Last 30 minutes

      if (error) throw error;

      // Calculate distances and filter users within 2km
      const usersWithDistance = userLocations?.map(userLoc => {
        const distance = calculateDistance(
          selectedStoreData.latitude,
          selectedStoreData.longitude,
          userLoc.latitude,
          userLoc.longitude
        );

        return {
          id: userLoc.user_id,
          nickname: userLoc.profiles?.nickname || 'Anonymous',
          distance: Math.round(distance),
          last_seen: userLoc.updated_at
        };
      }).filter(user => user.distance <= 2000) || []; // Within 2km

      setNearbyUsers(usersWithDistance);
      
      // Update nearby users count
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
      // Get today's messages count
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('place_id', selectedStore)
        .gte('created_at', todayStart.toISOString());

      if (messagesError) throw messagesError;

      // Get total messages for engagement calculation
      const { data: totalMessages, error: totalError } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('place_id', selectedStore);

      if (totalError) throw totalError;

      const chatMessagesToday = messagesData?.length || 0;
      const totalChats = totalMessages?.length || 0;
      const engagementRate = nearbyUsers.length > 0 ? Math.round((chatMessagesToday / nearbyUsers.length) * 100) : 0;

      setStoreStats(prev => ({
        ...prev,
        chat_messages_today: chatMessagesToday,
        total_visits: totalChats,
        engagement_rate: engagementRate
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
      const selectedStoreData = merchantStores.find(store => store.id === selectedStore);
      
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

      // Log the promotion activity
      await supabase
        .from('merchant_promotions')
        .insert({
          merchant_id: user?.id,
          place_id: selectedStore,
          promotion_text: promotionText,
          target_users: nearbyUsers.length,
          sent_at: new Date().toISOString()
        });

      toast.success(`🎉 Promotion sent to ${nearbyUsers.length} nearby users!`);
      setPromotionText('');
      
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
        <p className="text-muted-foreground">Connect with nearby customers and boost your business</p>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-foreground">{storeStats.nearby_users}</p>
                <p className="text-xs text-muted-foreground">Users Nearby (2km)</p>
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
                <p className="text-xs text-muted-foreground">Engagement Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Megaphone className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-foreground">{storeStats.total_visits}</p>
                <p className="text-xs text-muted-foreground">Total Interactions</p>
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
              Send Promotion to Nearby Users
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
                {loading ? 'Sending...' : 'Send Promotion'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Nearby Users */}
        <Card className="bg-card border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Nearby Customers ({nearbyUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {nearbyUsers.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No customers nearby at the moment</p>
                  <p className="text-sm">Check back later or create an attractive offer!</p>
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
                    <Badge 
                      variant="secondary" 
                      className={user.distance <= 500 ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}
                    >
                      {user.distance <= 500 ? 'Very Close' : 'Nearby'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tips for Engagement */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border">
        <CardHeader>
          <CardTitle className="text-foreground">💡 Engagement Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-foreground mb-2">Best Times to Send Promotions:</h4>
              <ul className="text-muted-foreground space-y-1">
                <li>• Lunch hours (11 AM - 2 PM)</li>
                <li>• Evening rush (5 PM - 8 PM)</li>
                <li>• Weekend afternoons</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">Effective Promotion Ideas:</h4>
              <ul className="text-muted-foreground space-y-1">
                <li>• "Flash Sale: 20% off for next hour!"</li>
                <li>• "Free coffee with any pastry today"</li>
                <li>• "Buy 2 get 1 free - limited time"</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MerchantEngagementPanel;
