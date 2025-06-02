
import React, { useState, useRef, useEffect } from 'react';
import { Send, MapPin, Users, AlertCircle, Crown, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOptimizedChat } from '@/hooks/useOptimizedChat';
import { useChatValidation } from '@/hooks/useChatValidation';
import { useEnhancedLocation } from '@/hooks/useEnhancedLocation';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import ChatStatusIndicator from './ChatStatusIndicator';

const EnhancedProximityChat: React.FC = () => {
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const { hasPermission } = useRoles();
  const { 
    location, 
    nearbyPlaces, 
    chatAvailablePlaces, 
    isInJeddah, 
    locationAccuracy,
    error: locationError 
  } = useEnhancedLocation();
  const { canSendMessage, getMuteMessage } = useChatValidation();

  // Auto-select first available place
  useEffect(() => {
    if (!selectedPlace && chatAvailablePlaces.size > 0) {
      const firstAvailablePlace = Array.from(chatAvailablePlaces)[0];
      setSelectedPlace(firstAvailablePlace);
    }
  }, [chatAvailablePlaces, selectedPlace]);

  const isWithinRange = selectedPlace ? chatAvailablePlaces.has(selectedPlace) : false;
  
  const {
    messages,
    loading,
    sending,
    sendMessage,
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
    if (!newMessage.trim() || !canSendMessage() || !isWithinRange) return;
    
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

  const canDeleteMessage = (messageUserId: string) => {
    return hasPermission('admin_dashboard') || messageUserId === user?.id;
  };

  // Show location error or out of bounds message
  if (locationError || isInJeddah === false) {
    return (
      <div className="min-h-screen bg-background p-4 pb-20">
        <div className="container mx-auto max-w-4xl">
          <Card className="bg-card/50 backdrop-blur border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <span>Chat Unavailable</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {isInJeddah === false 
                    ? "Chat is only available within Jeddah city limits. Please move to Jeddah to access this feature."
                    : locationError || "Unable to access your location. Please enable location services."
                  }
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show no places available
  if (nearbyPlaces.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4 pb-20">
        <div className="container mx-auto max-w-4xl">
          <Card className="bg-card/50 backdrop-blur border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Proximity Chat</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No stores found nearby. Move closer to stores in Jeddah to access proximity chat.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="container mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Proximity Chat</h1>
          <p className="text-muted-foreground">
            Chat unlocks within 500m of stores • {nearbyPlaces.length} store{nearbyPlaces.length !== 1 ? 's' : ''} nearby
          </p>
        </div>

        {/* Chat Status Indicator */}
        <ChatStatusIndicator
          isInRange={isWithinRange}
          isLocationAvailable={!!location}
          distance={selectedPlace ? getPlaceDistance(selectedPlace) : undefined}
          placeName={selectedPlace ? getPlaceName(selectedPlace) : undefined}
          locationAccuracy={locationAccuracy}
          isInJeddah={isInJeddah}
        />

        {/* Place Selection */}
        <Card className="bg-card/50 backdrop-blur border">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Available Stores ({nearbyPlaces.length})</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {chatAvailablePlaces.size} chat{chatAvailablePlaces.size !== 1 ? 's' : ''} unlocked
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
              {nearbyPlaces.map(place => {
                const isChatAvailable = chatAvailablePlaces.has(place.id);
                const isSelected = selectedPlace === place.id;
                
                return (
                  <button
                    key={place.id}
                    onClick={() => setSelectedPlace(place.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="text-left">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{place.name}</span>
                        {isChatAvailable ? (
                          <Badge className="bg-green-600 text-white text-xs">Chat Active</Badge>
                        ) : (
                          <Badge variant="outline" className="border-orange-500 text-orange-600 text-xs">
                            Chat Locked
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{place.type}</div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{Math.round(place.distance)}m</Badge>
                      {place.distance <= 500 && (
                        <div className="text-xs text-green-600 mt-1">In Range</div>
                      )}
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
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>{getPlaceName(selectedPlace)}</span>
                </div>
                <Badge 
                  variant="outline" 
                  className={isWithinRange ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600'}
                >
                  {Math.round(getPlaceDistance(selectedPlace))}m away
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Moderation Status */}
              {!canSendMessage() && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {getMuteMessage()}
                  </AlertDescription>
                </Alert>
              )}

              {/* Messages */}
              <div className="h-80 overflow-y-auto space-y-3 bg-muted/20 rounded-lg p-4">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-muted-foreground">Loading messages...</div>
                  </div>
                ) : !isWithinRange ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-muted-foreground">
                      <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Chat Locked</h3>
                      <p className="text-sm">
                        Get within 500m of {getPlaceName(selectedPlace)} to unlock chat
                      </p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-muted-foreground">No messages yet. Start the conversation!</div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm flex items-center space-x-1">
                            {message.message_type === 'merchant' && <Crown className="w-3 h-3 text-purple-400" />}
                            <span>{message.user?.nickname || 'Unknown User'}</span>
                          </span>
                          {message.message_type === 'merchant' && (
                            <Badge className="bg-purple-600 text-xs">Merchant</Badge>
                          )}
                          {message.is_promotion && (
                            <Badge className="bg-orange-600 text-xs">Promotion</Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(message.created_at)}</span>
                          </span>
                          {canDeleteMessage(message.user_id) && !message.is_deleted && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-auto p-1 text-xs text-red-500 hover:text-red-700"
                              onClick={() => {
                                // Implementation would go here for admin delete
                                console.log('Delete message:', message.id);
                              }}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className={`text-sm p-3 rounded-lg ${
                        message.is_deleted 
                          ? 'bg-red-100 text-red-800 line-through'
                          : message.message_type === 'merchant'
                          ? 'bg-purple-100 border-l-4 border-purple-500'
                          : message.is_promotion
                          ? 'bg-orange-100 border-l-4 border-orange-500'
                          : 'bg-background/50'
                      }`}>
                        {message.is_deleted ? 'Message deleted' : message.message}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      !isWithinRange 
                        ? "Move closer to unlock chat"
                        : !canSendMessage() 
                        ? "You cannot send messages" 
                        : "Type your message..."
                    }
                    disabled={!isWithinRange || !canSendMessage() || sending}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || !isWithinRange || !canSendMessage() || sending}
                    size="icon"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {isWithinRange 
                    ? `Chat active • Live GPS • ${Math.round(getPlaceDistance(selectedPlace))}m from store`
                    : `Chat locked • Need to be within 500m • Currently ${Math.round(getPlaceDistance(selectedPlace))}m away`
                  }
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EnhancedProximityChat;
