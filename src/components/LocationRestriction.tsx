
import React from 'react';
import { MapPin, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface LocationRestrictionProps {
  onRetry: () => void;
  isChecking: boolean;
}

const LocationRestriction: React.FC<LocationRestrictionProps> = ({ onRetry, isChecking }) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-card border">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              You are currently outside Yanbu. Access to the map and chat is only available within the city.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                POP IN is currently available only within Yanbu city limits for the best local experience.
              </p>
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

export default LocationRestriction;
