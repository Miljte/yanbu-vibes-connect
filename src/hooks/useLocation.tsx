
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

    // High accuracy GPS options for Yanbu area
    const highAccuracyOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000, // Cache for 5 seconds for better performance
    };

    console.log('Initializing GPS tracking for Yanbu area...');

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      async (position) => {
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
          console.log('Location outside Yanbu, using Yanbu center');
          setLocation(yanbuCenter);
        } else {
          console.log('GPS location in Yanbu:', newLocation);
          setLocation(newLocation);
        }
        
        setError(null);
        setLoading(false);

        // Update location in database
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
        console.error('GPS error, using Yanbu center:', error);
        setError(`Using default Yanbu location: ${error.message}`);
        setLocation(yanbuCenter);
        setLoading(false);
      },
      highAccuracyOptions
    );

    // Set up continuous tracking for better accuracy
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        
        // Verify location is within Yanbu bounds
        const isInYanbu = 
          newLocation.latitude >= 23.9 && newLocation.latitude <= 24.3 &&
          newLocation.longitude >= 37.9 && newLocation.longitude <= 38.4;

        if (isInYanbu && newLocation.accuracy < 100) { // Only update if accurate and in Yanbu
          setLocation(newLocation);
          setError(null);

          // Update database with real location
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
        }
      },
      (error) => {
        console.error('Watch position error:', error);
        // Don't set error state for watch failures, keep the last known location
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 10000, // Allow 10 second old positions for stability
      }
    );

    console.log('GPS watch started for Yanbu area with ID:', watchId);

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
    return Math.round(distance);
  };

  return {
    location,
    error,
    loading,
    calculateDistance,
  };
};
