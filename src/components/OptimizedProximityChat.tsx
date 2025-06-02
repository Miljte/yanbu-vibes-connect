
import React, { useState, useRef, useEffect } from 'react';
import { Send, MapPin, Users, AlertCircle, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOptimizedChat } from '@/hooks/useOptimizedChat';
import { useAuth } from '@/hooks/useAuth';

interface Place {
  id: string;
  name: string;
  distance: number;
  type: string;
}

interface OptimizedProximityChatProps {
  nearbyPlaces: Place[];
  chatUnlockedPlaces: Set<string>;
  userLocation?: { latitude: number; longitude: number };
}

const OptimizedProximityChat: React.FC<OptimizedProximityChatProps> = ({
  nearbyPlaces,
  chatUnlockedPlaces,
  userLocation
}) => {
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Auto-select first unlocked place
  useEffect(() => {
    if (!selectedPlace && chatUnlockedPlaces.size > 0) {
      const firstUnlockedPlace = Array.from(chatUnlockedPlaces)[0];
      setSelectedPlace(firstUnlockedPlace);
    }
  }, [chatUnlockedPlaces, selectedPlace]);

  const isWithinRange = selectedPlace ? chatUnlockedPlaces.has(selectedPlace) : false;
  
  const {
    messages,
    loading,
    sending,
    sendMessage,
    canSendMessage,
    getMuteMessage
  } = useOptimizedChat({
    placeId: selectedPlace,
    isWithinRange,
    messageLimit: 50
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !canSendMessage()) return;
    
    const success = await sendMessage(newMessage);
    if (success) {
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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

  // Show info if no places are unlocked
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
              No Nearby Stores Available
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
                  <Badge variant="outline">{Math.round(place.distance)}m away</Badge>
                </div>
              ))}
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
            <span>Available Chat Rooms ({chatUnlockedPlaces.size})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
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
                  <Badge variant="outline">{Math.round(place.distance)}m</Badge>
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
              <Badge variant="outline">{Math.round(getPlaceDistance(selectedPlace))}m away</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Moderation Status */}
            {!canSendMessage() && (
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
                disabled={!canSendMessage() || sending}
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || !canSendMessage() || sending}
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {!canSendMessage() && (
              <div className="text-sm text-muted-foreground">
                {getMuteMessage()}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OptimizedProximityChat;
