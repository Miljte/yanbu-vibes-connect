
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, RefreshCw } from 'lucide-react';

interface LocationRestrictionProps {
  onRetry: () => void;
  isChecking: boolean;
}

const LocationRestriction: React.FC<LocationRestrictionProps> = ({ onRetry, isChecking }) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <MapPin className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-foreground">Location Restricted</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            This app is only available in Yanbu, Saudi Arabia. Please make sure you're in the correct location.
          </p>
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
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Location Again
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationRestriction;
