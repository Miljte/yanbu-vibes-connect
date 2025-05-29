
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

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setLoading(false);
      return;
    }

    // Maximum accuracy GPS options for real-time tracking
    const highAccuracyOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0, // Always get fresh location
    };

    console.log('Initializing high-accuracy GPS tracking...');

    // Get initial position with maximum accuracy
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        
        console.log('High-accuracy GPS location:', newLocation);
        setLocation(newLocation);
        setError(null);
        setLoading(false);

        // Update location in database for real-time tracking
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
            console.log('Location updated in database');
          } catch (error) {
            console.error('Error updating location:', error);
          }
        }
      },
      (error) => {
        console.error('High-accuracy geolocation error:', error);
        setError(`GPS access required for proximity features: ${error.message}`);
        setLoading(false);
        
        // Set default Yanbu location if GPS fails
        setLocation({
          latitude: 24.0892,
          longitude: 38.0618,
          accuracy: 1000
        });
      },
      highAccuracyOptions
    );

    // Set up continuous real-time tracking with maximum accuracy
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        
        console.log('Real-time GPS update:', newLocation);
        setLocation(newLocation);
        setError(null);

        // Update location in database for live tracking
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
          } catch (error) {
            console.error('Error updating real-time location:', error);
          }
        }
      },
      (error) => {
        console.error('Watch position error:', error);
        // Don't set error state for watch failures, keep the last known location
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 2000, // Fresh location every 2 seconds for maximum accuracy
      }
    );

    console.log('GPS watch started with ID:', watchId);

    // Cleanup function
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        console.log('GPS tracking stopped');
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
    return Math.round(distance); // Round to nearest meter for accuracy
  };

  return {
    location,
    error,
    loading,
    calculateDistance,
  };
};
