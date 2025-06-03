
import React, { useState, useRef, useEffect } from 'react';
import { Send, MapPin, Users, AlertCircle, Crown, Clock, MessageSquare, Lock, Navigation } from 'lucide-react';
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
    error: locationError,
    retryLocation 
  } = useEnhancedLocation();
  const { canSendMessage, getMuteMessage } = useChatValidation();

  // Auto-select first available place
  useEffect(() => {
    if (!selectedPlace && chatAvailablePlaces.size > 0) {
      const firstAvailablePlace = Array.from(chatAvailablePlaces)[0];
      setSelectedPlace(firstAvailablePlace);
      console.log('🎯 Auto-selected place for chat:', firstAvailablePlace);
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

  // CRITICAL: Show location error or out of bounds message
  if (locationError || isInJeddah === false) {
    return (
      <div className="min-h-screen bg-background p-4 pb-20">
        <div className="container mx-auto max-w-4xl">
          <Card className="bg-card/50 backdrop-blur border border-red-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <span>CRITICAL: Chat Unavailable</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-base font-medium">
                  {isInJeddah === false 
                    ? "🚫 OUTSIDE JEDDAH: Chat is only available within Jeddah city limits. Please move to Jeddah to access this feature."
                    : locationError || "🚫 GPS ERROR: Unable to access your location. Please enable high-accuracy GPS."
                  }
                </AlertDescription>
              </Alert>
              <Button onClick={retryLocation} className="w-full">
                <Navigation className="w-4 h-4 mr-2" />
                Retry High-Accuracy GPS
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // CRITICAL: Show no places available with clear message
  if (nearbyPlaces.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4 pb-20">
        <div className="container mx-auto max-w-4xl">
          <Card className="bg-card/50 backdrop-blur border border-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-orange-600">
                <MapPin className="w-5 h-5" />
                <span>CHAT DISABLED: No Stores Nearby</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="border-orange-500">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-base font-medium">
                  🔍 NO STORES FOUND: Move closer to stores in Jeddah to access proximity chat.
                  <br />
                  📍 GPS Accuracy: {locationAccuracy ? `±${Math.round(locationAccuracy)}m` : 'Unknown'}
                </AlertDescription>
              </Alert>
              <Button onClick={retryLocation} className="w-full mt-4">
                <Navigation className="w-4 h-4 mr-2" />
                Refresh Location
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="container mx-auto max-w-4xl space-y-6">
        {/* CRITICAL STATUS HEADER */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {chatAvailablePlaces.size > 0 ? '🟢 PROXIMITY CHAT ACTIVE' : '🔴 CHAT LOCKED'}
          </h1>
          <p className="text-muted-foreground">
            Chat unlocks within 500m • {nearbyPlaces.length} store{nearbyPlaces.length !== 1 ? 's' : ''} nearby
            {locationAccuracy && ` • GPS: ±${Math.round(locationAccuracy)}m`}
          </p>
        </div>

        {/* CRITICAL: Chat Status Indicator */}
        <ChatStatusIndicator
          isInRange={isWithinRange}
          isLocationAvailable={!!location}
          distance={selectedPlace ? getPlaceDistance(selectedPlace) : undefined}
          placeName={selectedPlace ? getPlaceName(selectedPlace) : undefined}
          locationAccuracy={locationAccuracy}
          isInJeddah={isInJeddah}
        />

        {/* CRITICAL: Place Selection with Clear Status */}
        <Card className="bg-card/50 backdrop-blur border">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Available Stores ({nearbyPlaces.length})</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant="outline" 
                  className={chatAvailablePlaces.size > 0 ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600'}
                >
                  {chatAvailablePlaces.size} ACTIVE
                </Badge>
                <Badge variant="outline" className="text-xs">
                  GPS: ±{locationAccuracy ? Math.round(locationAccuracy) : '?'}m
                </Badge>
              </div>
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
                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/10' 
                        : isChatAvailable
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    }`}
                  >
                    <div className="text-left">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-lg">{place.name}</span>
                        {isChatAvailable ? (
                          <Badge className="bg-green-600 text-white text-xs font-bold">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            CHAT ACTIVE
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-red-500 text-red-600 text-xs font-bold">
                            <Lock className="w-3 h-3 mr-1" />
                            CHAT LOCKED
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{place.type}</div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant="outline" 
                        className={`text-lg font-bold ${
                          place.distance <= 500 ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600'
                        }`}
                      >
                        {Math.round(place.distance)}m
                      </Badge>
                      {place.distance <= 500 ? (
                        <div className="text-xs text-green-600 mt-1 font-bold">✓ IN RANGE</div>
                      ) : (
                        <div className="text-xs text-red-600 mt-1 font-bold">
                          Need {Math.round(place.distance - 500)}m closer
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* CRITICAL: Chat Interface with Clear Status */}
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
                  className={`text-lg font-bold ${
                    isWithinRange ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600'
                  }`}
                >
                  {Math.round(getPlaceDistance(selectedPlace))}m away
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* CRITICAL: Moderation Status */}
              {!canSendMessage() && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="font-medium">
                    {getMuteMessage()}
                  </AlertDescription>
                </Alert>
              )}

              {/* CRITICAL: Messages with Clear Lock Status */}
              <div className="h-80 overflow-y-auto space-y-3 bg-muted/20 rounded-lg p-4">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-muted-foreground">Loading messages...</div>
                  </div>
                ) : !isWithinRange ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-muted-foreground">
                      <Lock className="w-24 h-24 mx-auto mb-4 text-red-500" />
                      <h3 className="text-2xl font-bold mb-2 text-red-600">CHAT LOCKED</h3>
                      <p className="text-lg mb-4">
                        Get within 500m of {getPlaceName(selectedPlace)} to unlock chat
                      </p>
                      <Badge variant="outline" className="text-red-600 border-red-500 text-lg font-bold">
                        Currently {Math.round(getPlaceDistance(selectedPlace))}m away
                      </Badge>
                      <p className="text-sm mt-4 text-red-600 font-medium">
                        Need to move {Math.round(getPlaceDistance(selectedPlace) - 500)}m closer
                      </p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-muted-foreground">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
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

              {/* CRITICAL: Message Input with Clear Status */}
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      !isWithinRange 
                        ? "🔒 MOVE CLOSER TO UNLOCK CHAT"
                        : !canSendMessage() 
                        ? "❌ YOU CANNOT SEND MESSAGES" 
                        : "✅ Type your message..."
                    }
                    disabled={!isWithinRange || !canSendMessage() || sending}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || !isWithinRange || !canSendMessage() || sending}
                    size="icon"
                    className={isWithinRange ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600'}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className={`text-sm font-bold ${isWithinRange ? 'text-green-600' : 'text-red-600'}`}>
                  {isWithinRange 
                    ? `🟢 CHAT ACTIVE • GPS: ±${locationAccuracy ? Math.round(locationAccuracy) : '?'}m • ${Math.round(getPlaceDistance(selectedPlace))}m from store`
                    : `🔴 CHAT LOCKED • Need to be within 500m • Currently ${Math.round(getPlaceDistance(selectedPlace))}m away`
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
