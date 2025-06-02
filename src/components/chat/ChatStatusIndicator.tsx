
import React from 'react';
import { MapPin, MessageSquare, Lock, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface ChatStatusIndicatorProps {
  isInRange: boolean;
  isLocationAvailable: boolean;
  distance?: number;
  placeName?: string;
  locationAccuracy?: number | null;
  isInJeddah?: boolean | null;
}

const ChatStatusIndicator: React.FC<ChatStatusIndicatorProps> = ({
  isInRange,
  isLocationAvailable,
  distance,
  placeName,
  locationAccuracy,
  isInJeddah
}) => {
  const getStatusColor = () => {
    if (!isLocationAvailable || isInJeddah === false) return 'bg-red-500';
    if (isInRange) return 'bg-green-500';
    return 'bg-orange-500';
  };

  const getStatusText = () => {
    if (!isLocationAvailable) return 'Location Unavailable';
    if (isInJeddah === false) return 'Outside Jeddah';
    if (isInRange) return 'Chat Available';
    return 'Chat Locked';
  };

  const getStatusIcon = () => {
    if (!isLocationAvailable || isInJeddah === false) return <WifiOff className="w-4 h-4" />;
    if (isInRange) return <MessageSquare className="w-4 h-4" />;
    return <Lock className="w-4 h-4" />;
  };

  return (
    <Card className="mb-4 border-l-4" style={{ borderLeftColor: getStatusColor().replace('bg-', '#') }}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <div>
              <div className="font-medium text-sm">{getStatusText()}</div>
              {placeName && (
                <div className="text-xs text-muted-foreground">
                  {placeName} • {distance ? `${Math.round(distance)}m away` : 'Distance unknown'}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge 
              variant="outline" 
              className={`text-xs ${
                isInRange ? 'border-green-500 text-green-600' : 
                !isLocationAvailable || isInJeddah === false ? 'border-red-500 text-red-600' :
                'border-orange-500 text-orange-600'
              }`}
            >
              {isInRange ? 'In Range' : 'Out of Range'}
            </Badge>
            
            {locationAccuracy && (
              <Badge variant="secondary" className="text-xs">
                <Wifi className="w-3 h-3 mr-1" />
                ±{Math.round(locationAccuracy)}m
              </Badge>
            )}
          </div>
        </div>
        
        {!isInRange && isLocationAvailable && isInJeddah !== false && (
          <div className="mt-2 text-xs text-muted-foreground">
            Move within 500m of {placeName || 'a store'} to unlock chat
          </div>
        )}
        
        {isInJeddah === false && (
          <div className="mt-2 text-xs text-red-600">
            Chat is only available within Jeddah city limits
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChatStatusIndicator;
