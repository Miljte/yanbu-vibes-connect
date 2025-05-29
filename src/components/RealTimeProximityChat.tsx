
import React, { useState, useEffect, useRef } from 'react';
import { Send, MapPin, Users, MessageSquare, Volume2, VolumeX, AlertCircle, Loader2 } from 'lucide-react';
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
  message_type: 'user' | 'merchant' | 'system';
  is_promotion: boolean;
  user_id: string;
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
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
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
      setIsLoadingMessages(true);
      
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
        .limit(100);

      if (error) {
        console.error('❌ Error fetching messages:', error);
        toast.error('Failed to load messages');
        return;
      }

      const userIds = messagesData?.map(msg => msg.user_id).filter(Boolean) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', userIds);

      const messagesWithNicknames = messagesData?.map(msg => ({
        ...msg,
        user_nickname: profiles?.find(p => p.id === msg.user_id)?.nickname || 'Anonymous'
      })) || [];

      setMessages(messagesWithNicknames);
    } catch (error) {
      console.error('❌ Error in fetchMessages:', error);
      toast.error('Failed to load messages');
    } finally {
      setIsLoadingMessages(false);
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
          return distance <= 1000; // 1km for online status
        });

        setOnlineUsers(nearbyUsers.length);
      }
    } catch (error) {
      console.error('❌ Error fetching online users:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!selectedPlace) return;

    const channel = supabase
      .channel(`chat_${selectedPlace.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `place_id=eq.${selectedPlace.id}`
      }, () => {
        fetchMessages(); // Refresh messages when new one arrives
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!message.trim() || !selectedPlace || !user || isLoading) return;

    if (!canSendMessage()) {
      const muteMessage = getMuteMessage();
      if (muteMessage) {
        toast.error(muteMessage);
      }
      return;
    }

    try {
      setIsLoading(true);
      
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

      setMessage('');
      toast.success('Message sent!');
    } catch (error) {
      console.error('❌ Error in sendMessage:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
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
      return <Badge className="bg-green-600 text-white text-xs">🔓 Unlocked</Badge>;
    } else {
      return <Badge variant="secondary" className="text-xs">🔒 Locked</Badge>;
    }
  };

  const getChatStatusMessage = () => {
    if (!selectedPlace) return '';
    
    if (isPlaceUnlocked(selectedPlace)) {
      return `🟢 Live chat • ${formatDistance(selectedPlace.distance)} away`;
    } else {
      return `🔴 Chat locked • Move within 1km to unlock`;
    }
  };

  // Enhanced debug info when no nearby places
  if (nearbyPlaces.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-3">No Nearby Stores</h3>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              Move closer to stores to access proximity chat
            </p>
            {location && (
              <div className="text-xs text-muted-foreground space-y-2 bg-muted/50 p-4 rounded-lg">
                <p><strong>Debug Info:</strong></p>
                <p>📍 Your location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</p>
                <p>🎯 Searching within 10km radius</p>
                <p>💬 Chat unlocks within 1km of stores</p>
                <p className="text-blue-600">📱 Check console for detailed logs</p>
              </div>
            )}
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
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">📍 Proximity Chat</h1>
              <p className="text-muted-foreground">
                {nearbyPlaces.length} store{nearbyPlaces.length !== 1 ? 's' : ''} nearby
              </p>
            </div>
            
            <div className="grid gap-3">
              {nearbyPlaces.map((place) => (
                <Card 
                  key={place.id} 
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    isPlaceUnlocked(place) 
                      ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10' 
                      : 'border-border hover:border-muted-foreground'
                  }`}
                  onClick={() => setSelectedPlace(place)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{place.name}</h3>
                        <p className="text-muted-foreground text-sm capitalize mb-2">
                          {place.type} • {formatDistance(place.distance)}
                        </p>
                        <div className="flex items-center gap-2">
                          {getPlaceStatusBadge(place)}
                          <Badge variant="outline" className="text-xs">
                            {place.type}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col items-center space-y-2">
                        <MessageSquare className={`w-6 h-6 ${
                          isPlaceUnlocked(place) ? 'text-green-600' : 'text-muted-foreground'
                        }`} />
                        <span className="text-xs text-muted-foreground">
                          {isPlaceUnlocked(place) ? 'Available' : 'Locked'}
                        </span>
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
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span className="text-sm text-muted-foreground">{onlineUsers} nearby</span>
                </div>
                {getPlaceStatusBadge(selectedPlace)}
              </div>
            </div>

            <Card className="shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedPlace.name}</h3>
                    <p className="text-sm text-muted-foreground font-normal">
                      {getChatStatusMessage()}
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="h-96 overflow-y-auto border-b bg-muted/20">
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="ml-2">Loading messages...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-lg font-medium mb-1">No messages yet</p>
                      <p className="text-sm">Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-3 p-4">
                      {messages.map((msg) => (
                        <div key={msg.id} className="break-words">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-sm flex items-center space-x-1">
                              {msg.message_type === 'merchant' && (
                                <Badge className="bg-purple-600 text-white text-xs">MERCHANT</Badge>
                              )}
                              <span className="text-foreground">{msg.user_nickname}</span>
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {msg.is_promotion && (
                              <Badge className="bg-orange-600 text-white text-xs">PROMO</Badge>
                            )}
                          </div>
                          <p className="text-sm text-foreground bg-background/50 rounded-lg px-3 py-2">
                            {msg.message}
                          </p>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  {isMuted && (
                    <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <VolumeX className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-red-700 dark:text-red-300">
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
                      disabled={!isPlaceUnlocked(selectedPlace) || isMuted || isLoading}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      className="flex-1"
                    />
                    <Button 
                      onClick={sendMessage}
                      disabled={!message.trim() || !isPlaceUnlocked(selectedPlace) || isMuted || isLoading}
                      size="sm"
                      className="px-4"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  
                  {!isPlaceUnlocked(selectedPlace) && (
                    <p className="text-xs text-muted-foreground text-center">
                      Move within 1km of {selectedPlace.name} to unlock chat
                    </p>
                  )}
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
