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
  const { user } = useAuth();

  // Yanbu city center as fallback
  const yanbuCenter = {
    latitude: 24.0892,
    longitude: 38.0618,
    accuracy: 1000
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setLocation(yanbuCenter);
      setLoading(false);
      return;
    }

    console.log('🌍 Starting optimized GPS tracking...');

    // Progressive accuracy options - start with lower accuracy for faster response
    const quickOptions = {
      enableHighAccuracy: false, // Start with network/WiFi location
      timeout: 5000, // Shorter timeout for quick fix
      maximumAge: 30000, // Allow cached positions
    };

    const preciseOptions = {
      enableHighAccuracy: true, // High accuracy GPS
      timeout: 10000, // Longer timeout for GPS
      maximumAge: 5000,
    };

    let watchId: number | null = null;

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
      
      // Verify location is within reasonable Yanbu bounds
      const isInYanbu = 
        newLocation.latitude >= 23.9 && newLocation.latitude <= 24.3 &&
        newLocation.longitude >= 37.9 && newLocation.longitude <= 38.4;

      if (!isInYanbu) {
        console.log('📍 Location outside Yanbu bounds, using city center');
        setLocation(yanbuCenter);
      } else {
        console.log('📍 Valid GPS location:', newLocation);
        setLocation(newLocation);
      }
      
      setError(null);
      setLoading(false);
      await updateLocationInDB(newLocation);
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error('❌ GPS error:', error.message);
      let errorMessage = 'Location error: ';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage += 'Please enable location permissions and try again.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage += 'GPS unavailable. Using Yanbu center location.';
          break;
        case error.TIMEOUT:
          errorMessage += 'GPS timeout. Using network location.';
          break;
        default:
          errorMessage += 'Using fallback location.';
          break;
      }
      
      setError(errorMessage);
      setLocation(yanbuCenter); // Always provide a location
      setLoading(false);
    };

    // Strategy 1: Quick network-based location first
    navigator.geolocation.getCurrentPosition(
      processPosition,
      (error) => {
        console.log('⚡ Quick location failed, trying GPS...');
        
        // Strategy 2: If quick fails, try high-accuracy GPS
        navigator.geolocation.getCurrentPosition(
          processPosition,
          handleError,
          preciseOptions
        );
      },
      quickOptions
    );

    // Set up continuous tracking with reasonable settings
    const startTracking = () => {
      watchId = navigator.geolocation.watchPosition(
        processPosition,
        (error) => {
          console.warn('🔄 Watch position error:', error.message);
          // Don't set error state for watch failures, keep last known location
        },
        {
          enableHighAccuracy: true,
          timeout: 15000, // Reasonable timeout
          maximumAge: 60000, // Allow 1-minute old positions for stability
        }
      );
      console.log('🔄 Continuous tracking started');
    };

    // Start tracking after initial position is obtained
    setTimeout(startTracking, 2000);

    // Cleanup function
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        console.log('🛑 GPS tracking stopped');
      }
    };
  }, [user]);

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

  return {
    location,
    error,
    loading,
    calculateDistance,
  };
};
