
import React, { useState, useRef, useEffect } from 'react';
import { Send, MapPin, Users, Clock, Crown, ArrowLeft, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useOptimizedChat } from '@/hooks/useOptimizedChat';
import { useEnhancedLocation } from '@/hooks/useEnhancedLocation';
import { useRoles } from '@/hooks/useRoles';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MerchantChatRoomProps {
  placeId: string;
  onBack?: () => void;
}

interface PlaceInfo {
  id: string;
  name: string;
  type: string;
  merchant_id: string;
  latitude: number;
  longitude: number;
}

const MerchantChatRoom: React.FC<MerchantChatRoomProps> = ({ placeId, onBack }) => {
  const [newMessage, setNewMessage] = useState('');
  const [placeInfo, setPlaceInfo] = useState<PlaceInfo | null>(null);
  const [isPromotion, setIsPromotion] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const { location, calculateDistance } = useEnhancedLocation();
  const { isMerchant } = useRoles();

  // Calculate real-time distance and proximity
  const distance = placeInfo && location 
    ? calculateDistance(location.latitude, location.longitude, placeInfo.latitude, placeInfo.longitude)
    : null;
  const isWithinRange = distance !== null && distance <= 500;

  // Use optimized chat hook with real-time proximity checking
  const { messages, loading: chatLoading, sending, sendMessage, canSendMessage, getMuteMessage } = useOptimizedChat({
    placeId,
    isWithinRange,
    messageLimit: 50
  });

  // Fetch place information
  useEffect(() => {
    const fetchPlaceInfo = async () => {
      if (!placeId) return;

      try {
        console.log('🔄 Fetching place info for:', placeId);
        
        const { data, error } = await supabase
          .from('places')
          .select('id, name, type, merchant_id, latitude, longitude')
          .eq('id', placeId)
          .eq('is_active', true)
          .single();

        if (error) {
          console.error('❌ Error fetching place info:', error);
          toast.error('Failed to load chat room');
          return;
        }

        console.log('✅ Place info loaded:', data);
        setPlaceInfo(data);
      } catch (error) {
        console.error('❌ Error:', error);
        toast.error('Failed to load chat room');
      } finally {
        setLoading(false);
      }
    };

    fetchPlaceInfo();
  }, [placeId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !isWithinRange) return;

    try {
      const success = await sendMessage(newMessage);
      if (success) {
        setNewMessage('');
        setIsPromotion(false);
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  // Handle enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Get message styling based on type
  const getMessageStyle = (messageType: string, isPromotion: boolean, isOwnMessage: boolean) => {
    if (isPromotion) {
      return 'bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 border-l-4 border-orange-500';
    }
    
    if (isOwnMessage) {
      return 'bg-primary/10 border-l-4 border-primary ml-8';
    }
    
    switch (messageType) {
      case 'merchant':
        return 'bg-purple-100 dark:bg-purple-900/30 border-l-4 border-purple-500';
      case 'system':
        return 'bg-muted text-muted-foreground text-center text-sm';
      default:
        return 'bg-muted mr-8';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
          <div className="text-foreground text-lg">Loading chat room...</div>
        </div>
      </div>
    );
  }

  if (!placeInfo) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="bg-card border max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <h2 className="text-xl font-bold text-foreground">Chat Room Not Found</h2>
            <p className="text-muted-foreground">This chat room is no longer available.</p>
            {onBack && (
              <Button onClick={onBack} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Map
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Chat Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onBack && (
              <Button onClick={onBack} variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <h1 className="text-xl font-bold text-foreground">{placeInfo.name}</h1>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>{distance ? `${Math.round(distance)}m away` : 'Distance unknown'}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{messages.length} messages</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge 
              variant="outline" 
              className={`${
                isWithinRange
                  ? 'border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20' 
                  : 'border-red-500 text-red-600 bg-red-50 dark:bg-red-900/20'
              }`}
            >
              {isWithinRange ? '🟢 In Range' : '🔴 Out of Range'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        {!isWithinRange ? (
          <div className="flex items-center justify-center h-full">
            <Card className="bg-card border max-w-md">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
                  <MapPin className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-medium text-foreground">Out of Range</h3>
                <p className="text-muted-foreground">
                  You need to be within 500m of {placeInfo.name} to access this chat.
                </p>
                <p className="text-sm text-red-600">
                  {distance ? `Currently ${Math.round(distance)}m away` : 'Distance unknown'}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {chatLoading && messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p>Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Start the Conversation</h3>
                <p>Be the first to send a message in this chat room!</p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwnMessage = message.user_id === user?.id;
                return (
                  <div 
                    key={message.id} 
                    className={`p-4 rounded-lg ${getMessageStyle(message.message_type, message.is_promotion, isOwnMessage)}`}
                  >
                    {message.message_type !== 'system' && (
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {message.message_type === 'merchant' && <Crown className="w-4 h-4 text-yellow-500" />}
                          <span className="font-medium text-sm">
                            {isOwnMessage ? 'You' : (message.user?.nickname || 'Anonymous')}
                          </span>
                          {message.is_promotion && (
                            <Badge className="bg-orange-500 text-white text-xs">
                              PROMO
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(message.created_at)}</span>
                        </div>
                      </div>
                    )}
                    <p className={`${message.message_type === 'system' ? 'text-xs text-center' : 'text-sm'}`}>
                      {message.message}
                    </p>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="bg-card border-t border-border p-4">
        <div className="max-w-4xl mx-auto">
          {/* Merchant promotion toggle */}
          {isMerchant && isWithinRange && (
            <div className="mb-3">
              <label className="flex items-center space-x-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={isPromotion}
                  onChange={(e) => setIsPromotion(e.target.checked)}
                  className="rounded"
                />
                <span>Send as promotion/advertisement</span>
              </label>
            </div>
          )}
          
          <div className="flex space-x-3">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                !user
                  ? "Sign in to chat..."
                  : !isWithinRange
                  ? "Get within 500m to chat..."
                  : !canSendMessage()
                  ? getMuteMessage() || "You cannot send messages"
                  : "Type your message..."
              }
              disabled={!user || !isWithinRange || !canSendMessage() || sending}
              className="flex-1 bg-background border-border text-foreground placeholder-muted-foreground"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !user || !isWithinRange || !canSendMessage() || sending}
              className="bg-primary hover:bg-primary/90"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground mt-2 text-center">
            {isWithinRange ? (
              `✅ Chat active • ${distance ? Math.round(distance) : '?'}m from ${placeInfo.name}`
            ) : (
              `🚫 Get within 500m of ${placeInfo.name} to chat • Currently ${distance ? Math.round(distance) : '?'}m away`
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerchantChatRoom;
