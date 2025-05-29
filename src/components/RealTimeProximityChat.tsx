import React, { useState, useEffect, useRef } from 'react';
import { Send, MapPin, Users, MessageSquare, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeLocation } from '@/hooks/useRealtimeLocation';
import { useChatValidation } from '@/hooks/useChatValidation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  message: string;
  user_nickname: string;
  created_at: string;
  message_type: 'user' | 'merchant';
  is_promotion: boolean;
}

interface Place {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  distance: number;
}

const RealTimeProximityChat = () => {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const { nearbyPlaces, chatUnlockedPlaces, calculateDistance, location } = useRealtimeLocation();
  const { isMuted, canSendMessage, getMuteMessage, checkMuteStatus } = useChatValidation();

  useEffect(() => {
    if (selectedPlace) {
      fetchMessages();
      fetchOnlineUsers();
      setupRealtimeSubscription();
    }
  }, [selectedPlace]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    checkMuteStatus();
  }, [user]);

  const fetchMessages = async () => {
    if (!selectedPlace) return;

    try {
      console.log('📨 Fetching messages for place:', selectedPlace.name);
      
      const { data: messagesData, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          message,
          created_at,
          message_type,
          is_promotion,
          user_id
        `)
        .eq('place_id', selectedPlace.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('❌ Error fetching messages:', error);
        return;
      }

      const userIds = messagesData?.map(msg => msg.user_id).filter(Boolean) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', userIds);

      const messagesWithNicknames = messagesData?.map(msg => ({
        ...msg,
        user_nickname: profiles?.find(p => p.id === msg.user_id)?.nickname || 'Unknown User'
      })) || [];

      setMessages(messagesWithNicknames);
      console.log(`✅ Fetched ${messagesWithNicknames.length} messages`);
    } catch (error) {
      console.error('❌ Error in fetchMessages:', error);
    }
  };

  const fetchOnlineUsers = async () => {
    if (!selectedPlace || !location) return;

    try {
      const { data: locations } = await supabase
        .from('user_locations')
        .select('user_id, latitude, longitude')
        .gte('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

      if (locations) {
        const nearbyUsers = locations.filter(loc => {
          const distance = calculateDistance(
            selectedPlace.latitude,
            selectedPlace.longitude,
            loc.latitude,
            loc.longitude
          );
          return distance <= 500;
        });

        setOnlineUsers(nearbyUsers.length);
      }
    } catch (error) {
      console.error('❌ Error fetching online users:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!selectedPlace) return;

    console.log('📡 Setting up chat subscription for place:', selectedPlace.name);
    
    const channel = supabase
      .channel(`chat_${selectedPlace.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `place_id=eq.${selectedPlace.id}`
      }, (payload) => {
        console.log('📨 New message received:', payload);
        fetchMessages();
      })
      .subscribe((status) => {
        console.log('📡 Chat subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!message.trim() || !selectedPlace || !user) return;

    if (!canSendMessage()) {
      const muteMessage = getMuteMessage();
      if (muteMessage) {
        toast.error(muteMessage);
      }
      return;
    }

    try {
      console.log('📤 Sending message to:', selectedPlace.name);
      
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          message: message.trim(),
          user_id: user.id,
          place_id: selectedPlace.id,
          message_type: 'user',
          is_promotion: false
        });

      if (error) {
        console.error('❌ Error sending message:', error);
        toast.error('Failed to send message');
        return;
      }

      console.log('✅ Message sent successfully');
      setMessage('');
      toast.success('Message sent!');
    } catch (error) {
      console.error('❌ Error in sendMessage:', error);
      toast.error('Failed to send message');
    }
  };

  const isPlaceUnlocked = (place: Place) => {
    return chatUnlockedPlaces.has(place.id);
  };

  const formatDistance = (distance: number) => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  };

  const getPlaceStatusBadge = (place: Place) => {
    if (isPlaceUnlocked(place)) {
      return <Badge className="bg-green-600 text-white">🔓 Unlocked</Badge>;
    } else {
      return <Badge variant="secondary">🔒 Locked</Badge>;
    }
  };

  const getChatStatusMessage = () => {
    if (!selectedPlace) return '';
    
    if (isPlaceUnlocked(selectedPlace)) {
      return `🟢 Live chat • Within ${formatDistance(selectedPlace.distance)} • Auto-unlocked`;
    } else {
      return `🔴 Chat locked • ${formatDistance(selectedPlace.distance)} away • Move closer`;
    }
  };

  if (nearbyPlaces.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Nearby Stores</h3>
            <p className="text-muted-foreground">
              Move closer to stores to access proximity chat
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl p-4 pb-20">
        {!selectedPlace ? (
          <div>
            <h1 className="text-2xl font-bold mb-6 text-center">📍 Proximity Chat</h1>
            
            <div className="grid gap-4">
              {nearbyPlaces.map((place) => (
                <Card 
                  key={place.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isPlaceUnlocked(place) ? 'border-green-500' : 'border-gray-300'
                  }`}
                  onClick={() => setSelectedPlace(place)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{place.name}</h3>
                        <p className="text-muted-foreground capitalize">
                          {place.type} • {formatDistance(place.distance)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        {getPlaceStatusBadge(place)}
                        <MessageSquare className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                onClick={() => setSelectedPlace(null)}
                className="text-sm"
              >
                ← Back to Places
              </Button>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span className="text-sm text-muted-foreground">{onlineUsers} nearby</span>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg">{selectedPlace.name}</h3>
                    <p className="text-sm text-muted-foreground font-normal">
                      {getChatStatusMessage()}
                    </p>
                  </div>
                  {getPlaceStatusBadge(selectedPlace)}
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                <div className="h-96 overflow-y-auto border rounded-lg p-4 mb-4 bg-muted/30">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg) => (
                        <div key={msg.id} className="break-words">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-sm flex items-center space-x-1">
                              {msg.message_type === 'merchant' && (
                                <Badge className="bg-purple-600 text-white text-xs">MERCHANT</Badge>
                              )}
                              <span>{msg.user_nickname}</span>
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.created_at).toLocaleTimeString()}
                            </span>
                            {msg.is_promotion && (
                              <Badge className="bg-orange-600 text-white text-xs">PROMO</Badge>
                            )}
                          </div>
                          <p className="text-sm text-foreground pl-1">{msg.message}</p>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {isMuted && (
                    <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <VolumeX className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-red-700">
                        You are muted and cannot send messages
                      </span>
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={
                        !isPlaceUnlocked(selectedPlace) 
                          ? "Move closer to unlock chat..." 
                          : isMuted
                            ? "You are muted..."
                            : "Type your message..."
                      }
                      disabled={!isPlaceUnlocked(selectedPlace) || isMuted}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      className="flex-1"
                    />
                    <Button 
                      onClick={sendMessage}
                      disabled={!message.trim() || !isPlaceUnlocked(selectedPlace) || isMuted}
                      size="sm"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealTimeProximityChat;
