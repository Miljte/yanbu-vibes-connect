
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RealtimeLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface NearbyPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance: number;
  isWithinChatRange: boolean;
}

export const useRealtimeLocation = () => {
  const [location, setLocation] = useState<RealtimeLocation | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [chatUnlockedPlaces, setChatUnlockedPlaces] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const { user } = useAuth();

  // Yanbu city center as fallback
  const yanbuCenter = { latitude: 24.0892, longitude: 38.0618, accuracy: 1000 };

  // Haversine formula for precise distance calculation
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in meters
  }, []);

  // Update user location in database and check nearby places
  const updateLocationAndCheckPlaces = useCallback(async (newLocation: RealtimeLocation) => {
    if (!user) return;

    try {
      // Update user location in database
      await supabase
        .from('user_locations')
        .upsert({
          user_id: user.id,
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          accuracy: newLocation.accuracy,
          updated_at: new Date().toISOString(),
        });

      // Fetch all active places
      const { data: places, error } = await supabase
        .from('places')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      // Calculate distances and check chat unlock status
      const placesWithDistance = places?.map(place => {
        const distance = calculateDistance(
          newLocation.latitude,
          newLocation.longitude,
          place.latitude,
          place.longitude
        );

        const isWithinChatRange = distance <= 500; // 500m chat range

        return {
          id: place.id,
          name: place.name,
          latitude: place.latitude,
          longitude: place.longitude,
          distance: Math.round(distance),
          isWithinChatRange
        };
      }) || [];

      setNearbyPlaces(placesWithDistance);

      // Update chat unlocked places
      const newChatUnlockedPlaces = new Set<string>();
      const previouslyUnlocked = new Set(chatUnlockedPlaces);

      placesWithDistance.forEach(place => {
        if (place.isWithinChatRange) {
          newChatUnlockedPlaces.add(place.id);
          
          // Show notification if newly unlocked
          if (!previouslyUnlocked.has(place.id)) {
            toast.success(`🔓 Chat unlocked for ${place.name}!`);
          }
        } else {
          // Show notification if chat was locked
          if (previouslyUnlocked.has(place.id)) {
            toast.info(`🔒 Chat locked for ${place.name} (moved too far)`);
          }
        }
      });

      setChatUnlockedPlaces(newChatUnlockedPlaces);

    } catch (error) {
      console.error('Error updating location:', error);
    }
  }, [user, calculateDistance, chatUnlockedPlaces]);

  // Start real-time GPS tracking
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setLocation(yanbuCenter);
      return;
    }

    let watchId: number;

    const startTracking = () => {
      console.log('🎯 Starting real-time GPS tracking...');
      setIsTracking(true);

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000 // Update every 5 seconds
      };

      // Get initial position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };

          // Verify location is within Yanbu bounds
          const isInYanbu = 
            newLocation.latitude >= 23.9 && newLocation.latitude <= 24.3 &&
            newLocation.longitude >= 37.9 && newLocation.longitude <= 38.4;

          if (isInYanbu) {
            setLocation(newLocation);
            updateLocationAndCheckPlaces(newLocation);
            setError(null);
          } else {
            console.log('📍 Location outside Yanbu, using city center');
            setLocation(yanbuCenter);
            updateLocationAndCheckPlaces(yanbuCenter);
          }
        },
        (error) => {
          console.error('GPS error:', error);
          setError(`GPS error: ${error.message}`);
          setLocation(yanbuCenter);
          updateLocationAndCheckPlaces(yanbuCenter);
        },
        options
      );

      // Set up continuous tracking
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };

          // Verify location is within Yanbu bounds
          const isInYanbu = 
            newLocation.latitude >= 23.9 && newLocation.latitude <= 24.3 &&
            newLocation.longitude >= 37.9 && newLocation.longitude <= 38.4;

          if (isInYanbu && newLocation.accuracy < 100) {
            setLocation(newLocation);
            updateLocationAndCheckPlaces(newLocation);
            setError(null);
          }
        },
        (error) => {
          console.error('Watch position error:', error);
          // Don't update error state for watch failures
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 3000 // More frequent updates
        }
      );
    };

    startTracking();

    // Cleanup
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        console.log('🛑 GPS tracking stopped');
      }
      setIsTracking(false);
    };
  }, [updateLocationAndCheckPlaces]);

  return {
    location,
    nearbyPlaces,
    chatUnlockedPlaces,
    error,
    isTracking,
    calculateDistance,
  };
};
