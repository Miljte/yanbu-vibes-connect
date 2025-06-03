
import React, { useState, useEffect } from 'react';
import { MessageSquare, Users, Crown, MapPin, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useEnhancedLocation } from '@/hooks/useEnhancedLocation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Place {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance: number;
  type: string;
}

const MerchantEngagementPanel = () => {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const { user } = useAuth();
  const { 
    location, 
    nearbyPlaces, 
    chatAvailablePlaces, 
    isInJeddah,
    calculateDistance 
  } = useEnhancedLocation();

  // Auto-select first available place
  useEffect(() => {
    if (!selectedPlace && nearbyPlaces.length > 0) {
      setSelectedPlace(nearbyPlaces[0]);
    }
  }, [nearbyPlaces, selectedPlace]);

  const handleJoinChat = (place: Place) => {
    if (!location) {
      toast.error('Location not available');
      return;
    }

    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      place.latitude,
      place.longitude
    );

    if (distance > 500) {
      toast.error(`You need to be within 500m to chat. Currently ${Math.round(distance)}m away.`);
      return;
    }

    // Navigate to chat page with place context
    const chatUrl = new URL(window.location.origin);
    chatUrl.searchParams.set('section', 'chat');
    chatUrl.searchParams.set('placeId', place.id);
    window.location.href = chatUrl.toString();
  };

  const getButtonState = (place: Place) => {
    if (!location) return { disabled: true, text: 'Loading...', color: 'bg-gray-400' };
    
    const distance = place.distance || 0;
    const isWithinRange = distance <= 500;
    
    return {
      disabled: !isWithinRange,
      text: isWithinRange ? 'Join Chat' : 'Move Closer',
      color: isWithinRange ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
    };
  };

  if (!isInJeddah) {
    return (
      <Card className="bg-card border">
        <CardContent className="py-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium text-foreground mb-2">Chat Unavailable</h3>
          <p className="text-muted-foreground">Chat is only available within Jeddah city limits</p>
        </CardContent>
      </Card>
    );
  }

  if (nearbyPlaces.length === 0) {
    return (
      <Card className="bg-card border">
        <CardContent className="py-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Nearby Stores</h3>
          <p className="text-muted-foreground">Move closer to stores to access proximity chat</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Customer Engagement</span>
            <Badge variant="outline" className="ml-auto">
              {chatAvailablePlaces.size} Active Chats
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {nearbyPlaces.map((place) => {
              const isChatAvailable = chatAvailablePlaces.has(place.id);
              const distance = place.distance || 0;
              const buttonState = getButtonState(place);
              
              return (
                <div
                  key={place.id}
                  className={`p-4 rounded-lg border transition-all ${
                    selectedPlace?.id === place.id
                      ? 'border-primary bg-primary/10'
                      : isChatAvailable
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-foreground">{place.name}</h4>
                      <p className="text-sm text-muted-foreground">{place.type}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant="outline" 
                        className={`${
                          distance <= 500 
                            ? 'border-green-500 text-green-600 bg-green-50' 
                            : 'border-red-500 text-red-600 bg-red-50'
                        }`}
                      >
                        {Math.round(distance)}m
                      </Badge>
                      {isChatAvailable && (
                        <Badge className="bg-green-600 text-white">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm">
                      <MapPin className="w-4 h-4" />
                      <span className={`${
                        distance <= 500 
                          ? 'text-green-600 font-medium' 
                          : 'text-red-600'
                      }`}>
                        {distance <= 500 
                          ? '✓ Within chat range' 
                          : `${Math.round(distance - 500)}m too far`
                        }
                      </span>
                    </div>
                    
                    <Button
                      onClick={() => handleJoinChat(place)}
                      disabled={buttonState.disabled}
                      size="sm"
                      className={`${buttonState.color} text-white transition-all duration-200`}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      {buttonState.text}
                      {!buttonState.disabled && <ExternalLink className="w-3 h-3 ml-1" />}
                    </Button>
                  </div>

                  {distance <= 500 && (
                    <div className="mt-3 text-xs text-green-600 font-medium flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                      Chat available - Click "Join Chat" to start messaging customers
                    </div>
                  )}

                  {distance > 500 && (
                    <div className="mt-3 text-xs text-red-600 font-medium flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      Move {Math.round(distance - 500)}m closer to unlock chat
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedPlace && chatAvailablePlaces.has(selectedPlace.id) && (
        <Card className="bg-card border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Crown className="w-5 h-5 text-purple-500" />
              <span>Merchant Features</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground mb-4">
              As a merchant, you can send promotional messages and engage with customers near your store.
            </div>
            
            <Button
              onClick={() => handleJoinChat(selectedPlace)}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <Crown className="w-4 h-4 mr-2" />
              Access Merchant Chat
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
            
            <div className="text-xs text-purple-600 font-medium text-center">
              Join the chat to send promotions and engage with nearby customers
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MerchantEngagementPanel;
