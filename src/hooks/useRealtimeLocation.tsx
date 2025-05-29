
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface Place {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance: number;
  type: string;
}

export const useRealtimeLocation = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<Place[]>([]);
  const [chatUnlockedPlaces, setChatUnlockedPlaces] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  // Yanbu city boundaries - STRICT enforcement
  const yanbuBounds = {
    southwest: { lat: 23.970000, lng: 38.060000 },
    northeast: { lat: 24.140000, lng: 38.200000 }
  };

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

  const isWithinYanbu = (lat: number, lng: number): boolean => {
    return (
      lat >= yanbuBounds.southwest.lat &&
      lat <= yanbuBounds.northeast.lat &&
      lng >= yanbuBounds.southwest.lng &&
      lng <= yanbuBounds.northeast.lng
    );
  };

  const fetchNearbyPlaces = async (currentLocation: LocationData) => {
    try {
      console.log('🏪 Fetching nearby places for location:', currentLocation);
      
      const { data: places, error: placesError } = await supabase
        .from('places')
        .select('*')
        .eq('is_active', true);

      if (placesError) {
        console.error('❌ Error fetching places:', placesError);
        return;
      }

      const placesWithDistance = places?.map(place => {
        const distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          place.latitude,
          place.longitude
        );
        return {
          id: place.id,
          name: place.name,
          latitude: place.latitude,
          longitude: place.longitude,
          distance,
          type: place.type
        };
      }).filter(place => place.distance <= 2000) // Show places within 2km
      .sort((a, b) => a.distance - b.distance) || [];

      console.log(`✅ Found ${placesWithDistance.length} nearby places`);
      setNearbyPlaces(placesWithDistance);

      // Update chat unlocked places (within 500m)
      const unlockedPlaceIds = new Set(
        placesWithDistance
          .filter(place => place.distance <= 500)
          .map(place => place.id)
      );
      setChatUnlockedPlaces(unlockedPlaceIds);
      
      console.log(`🔓 Chat unlocked for ${unlockedPlaceIds.size} places`);
    } catch (error) {
      console.error('❌ Error in fetchNearbyPlaces:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      console.log('👤 No user - stopping location tracking');
      return;
    }

    let watchId: number | null = null;
    let updateInterval: NodeJS.Timeout | null = null;

    const startTracking = () => {
      if (!navigator.geolocation) {
        const errorMsg = 'Geolocation is not supported by this browser.';
        setError(errorMsg);
        console.error('❌ Geolocation not supported');
        return;
      }

      console.log('🌍 Starting HIGH-ACCURACY location tracking for user:', user.id);
      setIsTracking(true);

      const options = {
        enableHighAccuracy: true, // Force GPS for maximum accuracy
        timeout: 15000,
        maximumAge: 0, // No cache - always get fresh location
      };

      const updateLocation = async (position: GeolocationPosition) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        console.log('📍 Raw GPS location:', newLocation);
        console.log('📏 GPS accuracy:', newLocation.accuracy, 'meters');

        // STRICT Yanbu boundary check
        if (!isWithinYanbu(newLocation.latitude, newLocation.longitude)) {
          const errorMsg = `🚫 Access restricted: You are outside Yanbu city limits. Current location: ${newLocation.latitude.toFixed(6)}, ${newLocation.longitude.toFixed(6)}`;
          setError(errorMsg);
          console.error('❌ User outside Yanbu bounds:', newLocation);
          setIsTracking(false);
          return;
        }

        console.log('✅ Location confirmed within Yanbu bounds');
        setLocation(newLocation);
        setError(null);

        // Fetch nearby places based on current location
        await fetchNearbyPlaces(newLocation);

        try {
          // Update user location in database (marks as online)
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
            console.error('❌ Error updating location in DB:', locationError);
          } else {
            console.log('✅ Location updated in DB - user marked as ONLINE');
          }
        } catch (error) {
          console.error('❌ Failed to update location in DB:', error);
        }
      };

      const handleError = (error: GeolocationPositionError) => {
        console.error('❌ HIGH-ACCURACY GPS error:', error);
        let errorMessage = 'Location error: ';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information unavailable. Please check GPS settings.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage += error.message;
            break;
        }
        
        setError(errorMessage);
        setIsTracking(false);
      };

      // Start high-accuracy GPS tracking
      watchId = navigator.geolocation.watchPosition(
        updateLocation,
        handleError,
        options
      );

      // Get immediate position
      navigator.geolocation.getCurrentPosition(
        updateLocation,
        handleError,
        options
      );

      // Update every 30 seconds to maintain online status
      updateInterval = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          updateLocation,
          handleError,
          options
        );
      }, 30000);
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
      if (user) {
        // Mark user as offline (11 minutes ago = offline)
        await supabase
          .from('user_locations')
          .update({ updated_at: new Date(Date.now() - 11 * 60 * 1000).toISOString() })
          .eq('user_id', user.id);
      }
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
    nearbyPlaces,
    chatUnlockedPlaces,
    calculateDistance,
  };
};
