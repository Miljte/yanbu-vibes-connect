
import React, { useState, useRef, useEffect } from 'react';
import { Send, MapPin, Users, Clock, Lock, Crown, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeLocation } from '@/hooks/useRealtimeLocation';
import { useRoles } from '@/hooks/useRoles';
import { useLocalization } from '@/contexts/LocalizationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  message_type: 'user' | 'merchant' | 'system';
  is_promotion: boolean;
  place_id: string;
  user_nickname?: string;
}

interface Place {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance?: number;
  is_active: boolean;
}

const RealTimeProximityChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPromotion, setIsPromotion] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const { location, nearbyPlaces, chatUnlockedPlaces, isTracking } = useRealtimeLocation();
  const { isMerchant } = useRoles();
  const { t, isRTL } = useLocalization();

  // Convert nearby places from useRealtimeLocation to our format
  const availablePlaces: Place[] = nearbyPlaces.map(place => ({
    id: place.id,
    name: place.name,
    latitude: place.latitude,
    longitude: place.longitude,
    distance: place.distance,
    is_active: true
  }));

  useEffect(() => {
    if (availablePlaces.length > 0 && !selectedPlace) {
      setSelectedPlace(availablePlaces[0]);
    }
    setLoading(false);
  }, [availablePlaces, selectedPlace]);

  useEffect(() => {
    if (selectedPlace) {
      fetchMessages();
      setupRealtimeSubscription();
    }
  }, [selectedPlace]);

  const fetchMessages = async () => {
    if (!selectedPlace) return;

    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('place_id', selectedPlace.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(50);

      if (messagesError) throw messagesError;

      const userIds = [...new Set(messagesData?.map(msg => msg.user_id).filter(Boolean) || [])];
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const messagesWithNicknames = messagesData?.map(msg => ({
        ...msg,
        user_nickname: profilesData?.find(profile => profile.id === msg.user_id)?.nickname || 'Anonymous'
      })) || [];

      setMessages(messagesWithNicknames);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setIsConnected(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!selectedPlace) return;

    const channel = supabase
      .channel(`realtime_chat_${selectedPlace.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `place_id=eq.${selectedPlace.id}`
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          
          // Fetch user nickname for the new message
          const { data: profileData } = await supabase
            .from('profiles')
            .select('nickname')
            .eq('id', newMessage.user_id)
            .single();

          const messageWithNickname = {
            ...newMessage,
            user_nickname: profileData?.nickname || 'Anonymous'
          };

          setMessages(prev => [...prev, messageWithNickname]);
          setIsConnected(true);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedPlace || !user) return;

    // Check if user is within chat range
    if (!chatUnlockedPlaces.has(selectedPlace.id)) {
      toast.error('You must be within 500m to send messages');
      return;
    }

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          message: newMessage,
          place_id: selectedPlace.id,
          message_type: isMerchant ? 'merchant' : 'user',
          is_promotion: isPromotion && isMerchant
        });

      if (error) throw error;

      setNewMessage('');
      setIsPromotion(false);
      toast.success('Message sent!');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setIsConnected(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageStyle = (messageType: string, isPromotion: boolean) => {
    if (isPromotion) {
      return 'bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 border-l-4 border-orange-500 text-orange-900 dark:text-orange-100';
    }
    switch (messageType) {
      case 'merchant':
        return 'bg-purple-100 dark:bg-purple-900/30 border-l-4 border-purple-500 text-purple-900 dark:text-purple-100';
      case 'system':
        return 'bg-muted text-muted-foreground text-center text-sm';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const isNearby = (place: Place) => {
    return chatUnlockedPlaces.has(place.id);
  };

  if (loading) {
    return (
      <div className={`min-h-screen bg-background p-4 flex items-center justify-center pb-20 ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="text-foreground text-lg">Loading real-time chat...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background p-4 pb-20 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">🎯 Real-Time Store Chats</h2>
              <p className="text-muted-foreground">Auto-unlocks within 500m • Live GPS tracking</p>
            </div>
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <Badge variant="default" className="bg-green-600">
                  <Wifi className="w-3 h-3 mr-1" />
                  Live
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <WifiOff className="w-3 h-3 mr-1" />
                  Offline
                </Badge>
              )}
              {isTracking && (
                <Badge variant="secondary">
                  <MapPin className="w-3 h-3 mr-1" />
                  GPS Active
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Store List */}
          <div className="lg:col-span-1">
            <Card className="bg-card border">
              <CardHeader>
                <CardTitle className="text-foreground text-lg">Available Chats ({availablePlaces.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {availablePlaces.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No stores nearby</p>
                    <p className="text-xs text-muted-foreground mt-2">Walk closer to stores to unlock chats</p>
                  </div>
                ) : (
                  availablePlaces.map((place) => (
                    <div
                      key={place.id}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        selectedPlace?.id === place.id
                          ? 'bg-primary/10 border border-primary'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                      onClick={() => setSelectedPlace(place)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-foreground font-medium text-sm">{place.name}</h3>
                        <Badge 
                          variant="secondary" 
                          className={isNearby(place) ? "bg-green-600 text-white" : "bg-orange-600 text-white"}
                        >
                          {isNearby(place) ? 'Unlocked' : 'Locked'}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>{Math.round(place.distance || 0)}m</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="w-3 h-3" />
                          <span>Live</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="bg-card border h-[600px] flex flex-col">
              <CardHeader className="border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground">
                      {selectedPlace ? selectedPlace.name : 'Select a Store'}
                    </CardTitle>
                    <p className="text-muted-foreground text-sm">
                      {selectedPlace && isNearby(selectedPlace) 
                        ? `🟢 Live chat • Within ${Math.round(selectedPlace.distance || 0)}m • Auto-unlocked`
                        : 'Move within 500m to auto-unlock chat'
                      }
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="outline" 
                      className={`${
                        selectedPlace && isNearby(selectedPlace)
                          ? 'border-green-500 text-green-600 dark:text-green-400' 
                          : 'border-red-500 text-red-600 dark:text-red-400'
                      }`}
                    >
                      {selectedPlace && isNearby(selectedPlace) ? '🔓 Unlocked' : '🔒 Locked'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 p-4 overflow-y-auto">
                {!selectedPlace || !isNearby(selectedPlace) ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-muted-foreground">
                      <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Chat Auto-Locked</h3>
                      <p className="text-sm">
                        {selectedPlace 
                          ? `Walk within 500m of ${selectedPlace.name} to auto-unlock chat`
                          : 'Select a nearby store to start chatting'
                        }
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        🎯 Real-time GPS monitoring • Chat unlocks automatically
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <p>No messages yet. Start the conversation!</p>
                        <p className="text-sm mt-1">🔥 You're within range - chat is live!</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div key={message.id} className={`p-3 rounded-lg ${getMessageStyle(message.message_type, message.is_promotion)}`}>
                          {message.message_type !== 'system' && (
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm flex items-center space-x-1">
                                {message.message_type === 'merchant' && <Crown className="w-3 h-3 text-yellow-500" />}
                                <span>{message.user_nickname || 'Anonymous'}</span>
                                {message.is_promotion && <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded">PROMO</span>}
                              </span>
                              <span className="text-xs opacity-70 flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{formatTime(message.created_at)}</span>
                              </span>
                            </div>
                          )}
                          <p className={message.message_type === 'system' ? 'text-xs' : 'text-sm'}>
                            {message.message}
                          </p>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </CardContent>

              {/* Message Input */}
              <div className="border-t border-border p-4">
                {isMerchant && selectedPlace && isNearby(selectedPlace) && (
                  <div className="mb-3">
                    <label className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={isPromotion}
                        onChange={(e) => setIsPromotion(e.target.checked)}
                        className="rounded"
                      />
                      <span>📢 Send as promotional message</span>
                    </label>
                  </div>
                )}
                <div className="flex space-x-3">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={
                      selectedPlace && isNearby(selectedPlace) && user
                        ? "Type your message..."
                        : !user
                        ? "Sign in to chat..."
                        : "Get closer to auto-unlock chat..."
                    }
                    disabled={!selectedPlace || !isNearby(selectedPlace) || !user}
                    className="flex-1 bg-background border-border text-foreground placeholder-muted-foreground"
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || !selectedPlace || !isNearby(selectedPlace) || !user}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center space-x-2">
                  <span>🎯 Real-time GPS • 500m auto-unlock • Live sync</span>
                  {isConnected && <Badge variant="outline" className="text-xs">Connected</Badge>}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeProximityChat;
