
import React from 'react';
import { MapPin, RefreshCw, Calendar, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface LocationRestrictionScreenProps {
  onRetry: () => void;
  isChecking: boolean;
  onNavigateToEvents: () => void;
  onNavigateToProfile: () => void;
}

const LocationRestrictionScreen: React.FC<LocationRestrictionScreenProps> = ({ 
  onRetry, 
  isChecking, 
  onNavigateToEvents, 
  onNavigateToProfile 
}) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-card border">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Map Access Restricted</h2>
            <p className="text-muted-foreground">
              Map access is limited to users inside Yanbu. You can still access events and your profile.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                POP IN map features are currently available only within Yanbu city limits for the best local experience.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={onNavigateToEvents}
                variant="outline"
                className="w-full"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Events
              </Button>
              <Button 
                onClick={onNavigateToProfile}
                variant="outline"
                className="w-full"
              >
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
            </div>
            
            <Button 
              onClick={onRetry}
              disabled={isChecking}
              className="w-full"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Checking Location...
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 mr-2" />
                  Check Location Again
                </>
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Make sure location services are enabled and you're physically in Yanbu.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationRestrictionScreen;
