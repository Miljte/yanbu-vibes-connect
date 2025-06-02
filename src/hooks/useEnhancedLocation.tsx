
import { useState, useEffect, useCallback } from 'react';
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

export const useEnhancedLocation = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<Place[]>([]);
  const [chatAvailablePlaces, setChatAvailablePlaces] = useState<Set<string>>(new Set());
  const [isInJeddah, setIsInJeddah] = useState<boolean | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const { user } = useAuth();

  // Precise Jeddah boundaries
  const jeddahBounds = {
    southwest: { lat: 21.350000, lng: 39.050000 },
    northeast: { lat: 21.750000, lng: 39.350000 }
  };

  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 1000); // Distance in meters
  }, []);

  const isWithinJeddah = useCallback((lat: number, lng: number): boolean => {
    return (
      lat >= jeddahBounds.southwest.lat &&
      lat <= jeddahBounds.northeast.lat &&
      lng >= jeddahBounds.southwest.lng &&
      lng <= jeddahBounds.northeast.lng
    );
  }, [jeddahBounds]);

  const fetchNearbyPlaces = useCallback(async (currentLocation: LocationData) => {
    if (!currentLocation || !isWithinJeddah(currentLocation.latitude, currentLocation.longitude)) {
      setNearbyPlaces([]);
      setChatAvailablePlaces(new Set());
      return;
    }

    try {
      console.log('🏪 Fetching nearby places for location:', {
        lat: currentLocation.latitude.toFixed(6),
        lng: currentLocation.longitude.toFixed(6),
        accuracy: currentLocation.accuracy
      });

      const { data: places, error } = await supabase
        .from('places')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      if (!places || places.length === 0) {
        console.log('⚠️ No active places found');
        setNearbyPlaces([]);
        setChatAvailablePlaces(new Set());
        return;
      }

      const placesWithDistance = places.map(place => {
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
      })
      .filter(place => place.distance <= 2000) // Show places within 2km
      .sort((a, b) => a.distance - b.distance);

      console.log(`✅ Found ${placesWithDistance.length} places within 2km`);
      setNearbyPlaces(placesWithDistance);

      // Chat becomes available within 500m (strict proximity requirement)
      const chatEnabledPlaces = new Set(
        placesWithDistance
          .filter(place => place.distance <= 500)
          .map(place => place.id)
      );
      
      setChatAvailablePlaces(chatEnabledPlaces);
      
      console.log(`🔓 Chat enabled for ${chatEnabledPlaces.size} places within 500m:`);
      placesWithDistance.forEach(place => {
        const status = place.distance <= 500 ? '🔓 CHAT ENABLED' : '🔒 chat locked';
        console.log(`  - ${place.name}: ${place.distance}m (${status})`);
      });

    } catch (error) {
      console.error('❌ Error fetching places:', error);
      setError('Failed to load nearby places');
    }
  }, [calculateDistance, isWithinJeddah]);

  useEffect(() => {
    if (!user || !navigator.geolocation) {
      setError('Location services not available');
      return;
    }

    let watchId: number | null = null;
    setIsTracking(true);
    setError(null);

    console.log('🌍 Starting enhanced location tracking for Jeddah...');

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000
    };

    const handleSuccess = (position: GeolocationPosition) => {
      const newLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      console.log('📍 Location update:', {
        lat: newLocation.latitude.toFixed(6),
        lng: newLocation.longitude.toFixed(6),
        accuracy: newLocation.accuracy ? `${Math.round(newLocation.accuracy)}m` : 'unknown'
      });

      setLocation(newLocation);
      setLocationAccuracy(newLocation.accuracy || null);
      
      const withinJeddah = isWithinJeddah(newLocation.latitude, newLocation.longitude);
      setIsInJeddah(withinJeddah);

      if (withinJeddah) {
        console.log('✅ Location confirmed within Jeddah bounds');
        fetchNearbyPlaces(newLocation);
        setError(null);
      } else {
        console.warn('❌ Location outside Jeddah bounds');
        setError('Location outside Jeddah city limits');
        setNearbyPlaces([]);
        setChatAvailablePlaces(new Set());
      }

      // Update location in database
      if (user) {
        supabase
          .from('user_locations')
          .upsert({
            user_id: user.id,
            latitude: newLocation.latitude,
            longitude: newLocation.longitude,
            accuracy: newLocation.accuracy,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' })
          .then(() => console.log('✅ Location updated in database'))
          .catch(err => console.error('❌ Failed to update location:', err));
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error('❌ Location error:', error.message);
      let errorMessage = 'Location error: ';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage += 'Please enable location access in your browser settings';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage += 'GPS signal unavailable';
          break;
        case error.TIMEOUT:
          errorMessage += 'Location request timed out';
          break;
        default:
          errorMessage += 'Unknown location error';
      }
      
      setError(errorMessage);
      setIsTracking(false);
    };

    // Get initial position
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);

    // Start watching position
    watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, options);

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      setIsTracking(false);
    };
  }, [user, fetchNearbyPlaces, isWithinJeddah]);

  const retryLocation = useCallback(() => {
    setError(null);
    setLocation(null);
    // The useEffect will handle restarting location tracking
  }, []);

  return {
    location,
    error,
    isTracking,
    nearbyPlaces,
    chatAvailablePlaces,
    isInJeddah,
    locationAccuracy,
    calculateDistance,
    retryLocation
  };
};
