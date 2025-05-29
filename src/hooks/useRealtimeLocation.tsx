import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export const useRealtimeLocation = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    let watchId: number | null = null;
    let updateInterval: NodeJS.Timeout | null = null;

    const startTracking = () => {
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by this browser.');
        return;
      }

      console.log('🌍 Starting location tracking for user:', user.id);
      setIsTracking(true);

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // 1 minute
      };

      const updateLocation = async (position: GeolocationPosition) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        setLocation(newLocation);
        setError(null);

        try {
          // Update user location in database (this marks them as online)
          const { error: locationError } = await supabase
            .from('user_locations')
            .upsert({
              user_id: user.id,
              latitude: newLocation.latitude,
              longitude: newLocation.longitude,
              accuracy: newLocation.accuracy,
              updated_at: new Date().toISOString()
            });

          if (locationError) {
            console.error('❌ Error updating location:', locationError);
          } else {
            console.log('✅ Location updated - user is now marked as online');
          }
        } catch (error) {
          console.error('❌ Failed to update location:', error);
        }
      };

      const handleError = (error: GeolocationPositionError) => {
        console.error('❌ Geolocation error:', error);
        setError(`Location error: ${error.message}`);
        setIsTracking(false);
      };

      // Start watching position
      watchId = navigator.geolocation.watchPosition(
        updateLocation,
        handleError,
        options
      );

      // Also update location every 30 seconds to keep user marked as online
      updateInterval = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          updateLocation,
          handleError,
          options
        );
      }, 30000); // Update every 30 seconds
    };

    const stopTracking = () => {
      console.log('🛑 Stopping location tracking');
      setIsTracking(false);
      
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      
      if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
      }
    };

    // Start tracking when component mounts
    startTracking();

    // Handle app visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('📱 App hidden - stopping location tracking');
        stopTracking();
      } else {
        console.log('📱 App visible - starting location tracking');
        startTracking();
      }
    };

    // Handle page unload (user closes app)
    const handleBeforeUnload = async () => {
      console.log('👋 User leaving app - marking offline');
      // Don't await this to avoid blocking the unload
      supabase
        .from('user_locations')
        .update({ updated_at: new Date(Date.now() - 11 * 60 * 1000).toISOString() }) // Mark as 11 minutes ago (offline)
        .eq('user_id', user.id);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function
    return () => {
      stopTracking();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Mark user as offline when component unmounts
      if (user) {
        supabase
          .from('user_locations')
          .update({ updated_at: new Date(Date.now() - 11 * 60 * 1000).toISOString() })
          .eq('user_id', user.id);
      }
    };
  }, [user]);

  return {
    location,
    error,
    isTracking,
  };
};
