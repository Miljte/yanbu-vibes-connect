
import React, { useState, useEffect, useRef } from 'react';
import { Send, MapPin, Users, AlertCircle, Volume2, VolumeX, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useChatValidation } from '@/hooks/useChatValidation';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  message: string;
  user_id: string;
  place_id: string;
  created_at: string;
  is_deleted: boolean;
  message_type: 'user' | 'merchant' | 'system';
  is_promotion: boolean;
  user?: {
    nickname: string;
  };
}

interface Place {
  id: string;
  name: string;
  distance: number;
  type: string;
}

interface RealTimeProximityChatProps {
  nearbyPlaces: Place[];
  chatUnlockedPlaces: Set<string>;
  userLocation?: { latitude: number; longitude: number };
}

const RealTimeProximityChat: React.FC<RealTimeProximityChatProps> = ({
  nearbyPlaces,
  chatUnlockedPlaces,
  userLocation
}) => {
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const { canSendMessage, getMuteMessage, isMuted, isBanned } = useChatValidation();

  // Auto-select first unlocked place
  useEffect(() => {
    if (!selectedPlace && chatUnlockedPlaces.size > 0) {
      const firstUnlockedPlace = Array.from(chatUnlockedPlaces)[0];
      setSelectedPlace(firstUnlockedPlace);
      console.log('🎯 Auto-selected first unlocked place:', firstUnlockedPlace);
    }
  }, [chatUnlockedPlaces, selectedPlace]);

  // Fetch messages when place changes
  useEffect(() => {
    if (selectedPlace) {
      fetchMessages();
      setupRealtimeSubscription();
    }
  }, [selectedPlace]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    if (!selectedPlace) return;
    
    setLoading(true);
    try {
      console.log('📬 Fetching messages for place:', selectedPlace);
      
      const { data: messagesData, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          message,
          user_id,
          place_id,
          created_at,
          is_deleted,
          message_type,
          is_promotion
        `)
        .eq('place_id', selectedPlace)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('❌ Error fetching messages:', error);
        return;
      }

      // Fetch user nicknames separately
      const messagesWithUsers = await Promise.all(
        (messagesData || []).map(async (message) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('nickname')
            .eq('id', message.user_id)
            .single();

          return {
            ...message,
            user: profileData ? { nickname: profileData.nickname } : { nickname: 'Unknown User' }
          };
        })
      );

      console.log('✅ Fetched messages:', messagesWithUsers.length);
      setMessages(messagesWithUsers);
    } catch (error) {
      console.error('❌ Error in fetchMessages:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!selectedPlace) return;

    const channel = supabase
      .channel(`chat_${selectedPlace}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `place_id=eq.${selectedPlace}`
      }, (payload) => {
        console.log('📨 New message received:', payload.new);
        fetchMessages(); // Refresh to get user data
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `place_id=eq.${selectedPlace}`
      }, (payload) => {
        console.log('📝 Message updated (possibly deleted):', payload.new);
        fetchMessages(); // Refresh to handle deletions
      })
      .subscribe();

    return () => {
      console.log('🔌 Unsubscribing from chat channel');
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedPlace || !user || !canSendMessage() || sendingMessage) {
      if (!canSendMessage()) {
        toast.error(getMuteMessage() || 'You cannot send messages');
      }
      return;
    }

    setSendingMessage(true);
    try {
      console.log('📤 Sending message:', newMessage);
      
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          message: newMessage.trim(),
          user_id: user.id,
          place_id: selectedPlace,
          message_type: 'user',
          is_promotion: false
        });

      if (error) {
        console.error('❌ Error sending message:', error);
        toast.error('Failed to send message: ' + error.message);
        return;
      }

      console.log('✅ Message sent successfully');
      setNewMessage('');
    } catch (error) {
      console.error('❌ Error in sendMessage:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlaceName = (placeId: string) => {
    const place = nearbyPlaces.find(p => p.id === placeId);
    return place?.name || 'Unknown Place';
  };

  const getPlaceDistance = (placeId: string) => {
    const place = nearbyPlaces.find(p => p.id === placeId);
    return place?.distance || 0;
  };

  // Show debug info if no places are unlocked
  if (chatUnlockedPlaces.size === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="w-5 h-5" />
            <span>Proximity Chat</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No Nearby Stores
              <br />
              Move closer to stores to access proximity chat
            </AlertDescription>
          </Alert>

          {nearbyPlaces.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Nearby Places:</h4>
              {nearbyPlaces.slice(0, 3).map(place => (
                <div key={place.id} className="flex justify-between items-center text-sm">
                  <span>{place.name}</span>
                  <Badge variant="outline">{place.distance}m away</Badge>
                </div>
              ))}
            </div>
          )}

          {userLocation && (
            <div className="text-xs text-muted-foreground">
              📍 Your location: {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Place Selection */}
      <Card className="bg-card/50 backdrop-blur border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="w-5 h-5" />
            <span>Chat Rooms</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2">
            {Array.from(chatUnlockedPlaces).map(placeId => {
              const place = nearbyPlaces.find(p => p.id === placeId);
              if (!place) return null;
              
              return (
                <button
                  key={placeId}
                  onClick={() => setSelectedPlace(placeId)}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    selectedPlace === placeId 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-left">
                    <div className="font-medium">{place.name}</div>
                    <div className="text-sm text-muted-foreground">{place.type}</div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{place.distance}m</Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      {selectedPlace && (
        <Card className="bg-card/50 backdrop-blur border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>{getPlaceName(selectedPlace)}</span>
              </div>
              <Badge variant="outline">{getPlaceDistance(selectedPlace)}m away</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Moderation Status */}
            {(isMuted || isBanned) && (
              <Alert variant="destructive">
                <Ban className="h-4 w-4" />
                <AlertDescription>
                  {getMuteMessage()}
                </AlertDescription>
              </Alert>
            )}

            {/* Messages */}
            <div className="h-64 overflow-y-auto space-y-3 bg-muted/20 rounded-lg p-3">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-muted-foreground">Loading messages...</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-muted-foreground">No messages yet. Start the conversation!</div>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">
                        {message.user?.nickname || 'Unknown User'}
                      </span>
                      {message.message_type === 'merchant' && (
                        <Badge className="bg-purple-600 text-xs">Merchant</Badge>
                      )}
                      {message.is_promotion && (
                        <Badge className="bg-orange-600 text-xs">Promotion</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatTime(message.created_at)}
                      </span>
                    </div>
                    <div className="text-sm bg-background/50 rounded p-2">
                      {message.message}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="flex space-x-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  !canSendMessage() 
                    ? "You cannot send messages" 
                    : "Type your message..."
                }
                disabled={!canSendMessage() || sendingMessage}
                className="flex-1"
              />
              <Button 
                onClick={sendMessage}
                disabled={!newMessage.trim() || !canSendMessage() || sendingMessage}
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {!canSendMessage() && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                {isMuted && <VolumeX className="w-4 h-4" />}
                {isBanned && <Ban className="w-4 h-4" />}
                <span>{getMuteMessage()}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RealTimeProximityChat;
