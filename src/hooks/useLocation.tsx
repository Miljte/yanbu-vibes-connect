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

  const maxRetryAttempts = 5; // Increased retry attempts
  let watchId: number | null = null;

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('GPS not supported by this device');
      setLoading(false);
      return;
    }

    console.log('🌍 Starting enhanced GPS tracking for Jeddah...');
    let mounted = true;

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
      if (!mounted) return;
      
      const newLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
      
      console.log('📍 GPS location received:', {
        ...newLocation,
        accuracy: newLocation.accuracy + 'm',
        timestamp: new Date().toLocaleTimeString()
      });

      // Validate location is reasonable (within Saudi Arabia bounds)
      if (newLocation.latitude >= 16 && newLocation.latitude <= 32 && 
          newLocation.longitude >= 34 && newLocation.longitude <= 56) {
        setLocation(newLocation);
        setError(null);
        setLoading(false);
        setRetryAttempts(0);
        
        await updateLocationInDB(newLocation);
      } else {
        console.warn('⚠️ GPS coordinates outside Saudi Arabia bounds, retrying...');
        retryLocationRequest();
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      if (!mounted) return;
      
      console.error('❌ GPS error:', error.message, 'Code:', error.code);
      
      let errorMessage = 'GPS Error: ';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage += 'Location access denied. Please enable location permissions in your browser settings.';
          setLoading(false);
          setError(errorMessage);
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage += 'GPS signal unavailable. Trying enhanced detection...';
          retryLocationRequest();
          break;
        case error.TIMEOUT:
          errorMessage += 'GPS timeout. Retrying with different settings...';
          retryLocationRequest();
          break;
        default:
          errorMessage += 'Unknown GPS error. Retrying...';
          retryLocationRequest();
          break;
      }
    };

    const retryLocationRequest = () => {
      if (retryAttempts < maxRetryAttempts) {
        const nextAttempt = retryAttempts + 1;
        setRetryAttempts(nextAttempt);
        console.log(`🔄 GPS retry attempt ${nextAttempt}/${maxRetryAttempts}...`);
        
        setTimeout(() => {
          if (mounted) {
            requestLocation(nextAttempt);
          }
        }, 1000 * nextAttempt);
      } else {
        setError('Unable to detect your location after multiple attempts. Please check your GPS settings and try again.');
        setLoading(false);
      }
    };

    const requestLocation = (attempt: number = 0) => {
      // Progressive GPS options - start strict, get more lenient
      const baseOptions = {
        enableHighAccuracy: true,
        timeout: attempt < 2 ? 15000 : 25000, // Longer timeout on retries
        maximumAge: attempt < 2 ? 30000 : 60000, // Allow older positions on retries
      };

      console.log(`📡 GPS request attempt ${attempt + 1} with options:`, baseOptions);

      // Get current position with progressive settings
      navigator.geolocation.getCurrentPosition(
        processPosition,
        handleError,
        baseOptions
      );

      // Start continuous tracking for real-time updates
      if (attempt === 0) {
        watchId = navigator.geolocation.watchPosition(
          processPosition,
          (error) => {
            console.warn('🔄 Watch position error:', error.message);
            // Don't set error state for watch failures, keep last known location
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000, // Fresher positions for real-time tracking
          }
        );

        console.log('🔄 Continuous GPS tracking started');
      }
    };

    requestLocation();

    // Cleanup function
    return () => {
      mounted = false;
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        console.log('🛑 GPS tracking stopped');
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
  };

  return {
    location,
    error,
    loading,
    calculateDistance,
    retryLocation,
  };
};
