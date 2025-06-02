
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export const useLocation = () => {
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const { user } = useAuth();

  const maxRetryAttempts = 3;

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setLoading(false);
      return;
    }

    console.log('🌍 Starting enhanced GPS tracking for Jeddah...');

    let watchId: number | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;

    const updateLocationInDB = async (newLocation: Location) => {
      if (user) {
        try {
          await supabase
            .from('user_locations')
            .upsert({
              user_id: user.id,
              latitude: newLocation.latitude,
              longitude: newLocation.longitude,
              accuracy: newLocation.accuracy,
              updated_at: new Date().toISOString(),
            });
          console.log('✅ Location updated in database');
        } catch (error) {
          console.error('❌ Error updating location:', error);
        }
      }
    };

    const processPosition = async (position: GeolocationPosition) => {
      const newLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
      
      console.log('📍 GPS location received:', {
        ...newLocation,
        accuracy: newLocation.accuracy + 'm'
      });

      setLocation(newLocation);
      setError(null);
      setLoading(false);
      setRetryAttempts(0); // Reset retry attempts on successful location
      
      await updateLocationInDB(newLocation);
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error('❌ GPS error:', error.message);
      
      let errorMessage = 'Location error: ';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage += 'Location permission denied. Please enable location permissions in your browser settings.';
          setLoading(false);
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage += 'GPS signal unavailable. Please ensure you have a clear view of the sky.';
          retryLocationRequest();
          break;
        case error.TIMEOUT:
          errorMessage += 'GPS timeout. Retrying...';
          retryLocationRequest();
          break;
        default:
          errorMessage += 'Unknown error occurred. Retrying...';
          retryLocationRequest();
          break;
      }
      
      setError(errorMessage);
    };

    const retryLocationRequest = () => {
      if (retryAttempts < maxRetryAttempts) {
        const nextAttempt = retryAttempts + 1;
        setRetryAttempts(nextAttempt);
        console.log(`🔄 Retrying location request (${nextAttempt}/${maxRetryAttempts})...`);
        
        retryTimeout = setTimeout(() => {
          requestLocation();
        }, 2000 * nextAttempt); // Exponential backoff
      } else {
        setError('Failed to get location after multiple attempts. Please check your GPS settings and try again.');
        setLoading(false);
      }
    };

    const requestLocation = () => {
      // High accuracy options for better real-time tracking
      const options = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 1000, // Very fresh positions for real-time updates
      };

      // Get initial position
      navigator.geolocation.getCurrentPosition(
        processPosition,
        handleError,
        options
      );

      // Start continuous tracking with aggressive settings for real-time updates
      watchId = navigator.geolocation.watchPosition(
        processPosition,
        (error) => {
          console.warn('🔄 Watch position error:', error.message);
          // Don't set error state for watch failures, keep last known location
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 500, // Very fresh for smooth tracking
        }
      );

      console.log('🔄 Continuous real-time tracking started');
    };

    requestLocation();

    // Cleanup function
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        console.log('🛑 GPS tracking stopped');
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [user, retryAttempts]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c * 1000; // Distance in meters
    return Math.round(distance);
  };

  const retryLocation = () => {
    setLoading(true);
    setError(null);
    setRetryAttempts(0);
    // The useEffect will trigger automatically due to retryAttempts change
  };

  return {
    location,
    error,
    loading,
    calculateDistance,
    retryLocation,
  };
};
