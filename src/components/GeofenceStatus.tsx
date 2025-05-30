
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface GeofenceStatusProps {
  geofenceStatus: {
    isInYanbu: boolean;
    distanceFromCenter: number;
    nearestBoundary: number;
  } | null;
  isTracking: boolean;
  error: string | null;
  accuracy?: number;
}

const GeofenceStatus: React.FC<GeofenceStatusProps> = ({
  geofenceStatus,
  isTracking,
  error,
  accuracy
}) => {
  const getStatusColor = () => {
    if (error) return 'destructive';
    if (!geofenceStatus) return 'secondary';
    return geofenceStatus.isInYanbu ? 'default' : 'destructive';
  };

  const getStatusIcon = () => {
    if (error) return <XCircle className="w-4 h-4" />;
    if (!geofenceStatus) return <AlertCircle className="w-4 h-4" />;
    return geofenceStatus.isInYanbu ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (error) return 'Location Error';
    if (!geofenceStatus) return 'Checking Location...';
    return geofenceStatus.isInYanbu ? 'In Yanbu' : 'Outside Yanbu';
  };

  const formatDistance = (distance: number) => {
    if (distance < 1000) return `${Math.round(distance)}m`;
    return `${(distance / 1000).toFixed(1)}km`;
  };

  return (
    <Card className="bg-background/95 backdrop-blur-sm border shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Location Status</span>
          </div>
          
          <Badge variant={getStatusColor()} className="flex items-center space-x-1">
            {getStatusIcon()}
            <span>{getStatusText()}</span>
          </Badge>
        </div>

        {geofenceStatus && !error && (
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <div>Distance from center: {formatDistance(geofenceStatus.distanceFromCenter)}</div>
            {accuracy && (
              <div>GPS accuracy: {formatDistance(accuracy)}</div>
            )}
            {!geofenceStatus.isInYanbu && (
              <div className="text-orange-600 font-medium">
                Move to Yanbu city to access all features
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-2 text-xs text-red-600">
            {error}
          </div>
        )}

        <div className="mt-2 flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-xs text-muted-foreground">
            {isTracking ? 'GPS Active' : 'GPS Inactive'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default GeofenceStatus;
