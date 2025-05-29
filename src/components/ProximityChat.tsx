
import React, { useState, useRef, useEffect } from 'react';
import { Send, MapPin, Users, Clock, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
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
}

const ProximityChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { location, calculateDistance } = useLocation();

  useEffect(() => {
    fetchNearbyPlaces();
  }, [location]);

  useEffect(() => {
    if (selectedPlace) {
      fetchMessages();
      setupRealtimeSubscription();
    }
  }, [selectedPlace]);

  const fetchNearbyPlaces = async () => {
    if (!location) return;

    try {
      const { data, error } = await supabase
        .from('places')
        .select('id, name, latitude, longitude')
        .eq('is_active', true);

      if (error) throw error;

      const placesWithDistance = data?.map(place => ({
        ...place,
        distance: calculateDistance(
          location.latitude,
          location.longitude,
          place.latitude,
          place.longitude
        )
      })).filter(place => place.distance <= 500) || [];

      setNearbyPlaces(placesWithDistance);
      
      if (placesWithDistance.length > 0 && !selectedPlace) {
        setSelectedPlace(placesWithDistance[0]);
      }
    } catch (error) {
      console.error('Error fetching places:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedPlace) return;

    try {
      // First get messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('place_id', selectedPlace.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(50);

      if (messagesError) throw messagesError;

      // Then get user profiles separately
      const userIds = [...new Set(messagesData?.map(msg => msg.user_id).filter(Boolean) || [])];
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine messages with nicknames
      const messagesWithNicknames = messagesData?.map(msg => ({
        ...msg,
        user_nickname: profilesData?.find(profile => profile.id === msg.user_id)?.nickname || 'Anonymous'
      })) || [];

      setMessages(messagesWithNicknames);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!selectedPlace) return;

    const channel = supabase
      .channel(`chat_${selectedPlace.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `place_id=eq.${selectedPlace.id}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, { ...newMessage, user_nickname: 'User' }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedPlace || !user) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          message: newMessage,
          place_id: selectedPlace.id,
          message_type: 'user',
          is_promotion: false
        });

      if (error) throw error;

      setNewMessage('');
      toast.success('Message sent!');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
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
      return 'bg-orange-600/20 border-l-4 border-orange-500 text-orange-100';
    }
    switch (messageType) {
      case 'merchant':
        return 'bg-purple-600/20 border-l-4 border-purple-500 text-purple-100';
      case 'system':
        return 'bg-slate-700/30 text-slate-400 text-center text-sm';
      default:
        return 'bg-slate-700/50 text-white';
    }
  };

  const isNearby = (place: Place) => {
    return place.distance !== undefined && place.distance <= 500;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 flex items-center justify-center pb-20">
        <div className="text-white text-lg">Loading nearby chats...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pb-20">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">Proximity Chat</h2>
          <p className="text-slate-300">Chat unlocks within 500m of locations</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Location List */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-lg">Available Chats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {nearbyPlaces.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">
                    <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No chats nearby</p>
                    <p className="text-xs text-slate-500 mt-2">Get within 500m of a location</p>
                  </div>
                ) : (
                  nearbyPlaces.map((place) => (
                    <div
                      key={place.id}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        selectedPlace?.id === place.id
                          ? 'bg-cyan-600/30 border border-cyan-500'
                          : 'bg-slate-700/30 hover:bg-slate-700/50'
                      }`}
                      onClick={() => setSelectedPlace(place)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white font-medium text-sm">{place.name}</h3>
                        <Badge variant="secondary" className="bg-green-600 text-white text-xs">
                          Available
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-slate-400">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>{Math.round(place.distance || 0)}m</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="w-3 h-3" />
                          <span>{messages.length}</span>
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
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm h-[600px] flex flex-col">
              <CardHeader className="border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">
                      {selectedPlace ? selectedPlace.name : 'Select a Location'}
                    </CardTitle>
                    <p className="text-slate-400 text-sm">
                      {selectedPlace && isNearby(selectedPlace) 
                        ? `${messages.length} messages • Within range`
                        : 'Get closer to join chat'
                      }
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="outline" 
                      className={`${
                        selectedPlace && isNearby(selectedPlace)
                          ? 'border-green-500 text-green-400' 
                          : 'border-red-500 text-red-400'
                      }`}
                    >
                      {selectedPlace && isNearby(selectedPlace) ? 'In Range' : 'Too Far'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 p-4 overflow-y-auto">
                {!selectedPlace || !isNearby(selectedPlace) ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-slate-400">
                      <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Chat Locked</h3>
                      <p className="text-sm">
                        {selectedPlace 
                          ? `Get within 500m of ${selectedPlace.name} to unlock chat`
                          : 'Select a nearby location to start chatting'
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-slate-400 py-8">
                        <p>No messages yet. Be the first to say hello!</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div key={message.id} className={`p-3 rounded-lg ${getMessageStyle(message.message_type, message.is_promotion)}`}>
                          {message.message_type !== 'system' && (
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">
                                {message.message_type === 'merchant' ? '🏪 ' : ''}
                                {message.user_nickname || 'Anonymous'}
                                {message.is_promotion && ' 📢'}
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
              <div className="border-t border-slate-700 p-4">
                <div className="flex space-x-3">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={
                      selectedPlace && isNearby(selectedPlace) && user
                        ? "Type your message..."
                        : !user
                        ? "Sign in to chat..."
                        : "Get closer to chat..."
                    }
                    disabled={!selectedPlace || !isNearby(selectedPlace) || !user}
                    className="flex-1 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || !selectedPlace || !isNearby(selectedPlace) || !user}
                    className="bg-cyan-600 hover:bg-cyan-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Anonymous chat • Location-based • Be respectful
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProximityChat;
