
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface PlaceData {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  distance: number;
  is_active: boolean;
  merchant_id: string;
}

export const useEnhancedLocation = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceData[]>([]);
  const [chatAvailablePlaces, setChatAvailablePlaces] = useState<Set<string>>(new Set());
  const [isInJeddah, setIsInJeddah] = useState<boolean | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const placesCache = useRef<Map<string, PlaceData[]>>(new Map());
  
  const { user } = useAuth();

  // Calculate distance between two points
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Check if location is in Jeddah
  const checkJeddahBounds = useCallback((lat: number, lng: number) => {
    // Jeddah approximate bounds
    const jeddahBounds = {
      north: 21.8,
      south: 21.2,
      east: 39.4,
      west: 38.8
    };
    
    return lat >= jeddahBounds.south && 
           lat <= jeddahBounds.north && 
           lng >= jeddahBounds.west && 
           lng <= jeddahBounds.east;
  }, []);

  // Fetch nearby places with caching
  const fetchNearbyPlaces = useCallback(async (userLocation: LocationData) => {
    const cacheKey = `${Math.round(userLocation.latitude * 1000)}-${Math.round(userLocation.longitude * 1000)}`;
    const cached = placesCache.current.get(cacheKey);
    
    if (cached) {
      console.log('📍 Using cached places data');
      setNearbyPlaces(cached);
      return cached;
    }

    try {
      console.log('🔄 Fetching nearby places...');
      
      const { data: places, error } = await supabase
        .from('places')
        .select('id, name, type, latitude, longitude, is_active, merchant_id')
        .eq('is_active', true)
        .limit(50);

      if (error) throw error;

      const placesWithDistance = (places || [])
        .map(place => ({
          ...place,
          distance: calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            place.latitude,
            place.longitude
          )
        }))
        .filter(place => place.distance <= 5000) // Within 5km
        .sort((a, b) => a.distance - b.distance);

      placesCache.current.set(cacheKey, placesWithDistance);
      setNearbyPlaces(placesWithDistance);
      
      console.log('✅ Found nearby places:', placesWithDistance.length);
      return placesWithDistance;
    } catch (error) {
      console.error('❌ Error fetching places:', error);
      setError('Failed to load nearby places');
      return [];
    }
  }, [calculateDistance]);

  // Update user location in database
  const updateUserLocation = useCallback(async (locationData: LocationData) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_locations')
        .upsert({
          user_id: user.id,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('❌ Error updating location:', error);
      }
    } catch (error) {
      console.error('❌ Location update failed:', error);
    }
  }, [user]);

  // Get high-accuracy location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      setLoading(false);
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000
    };

    const handleSuccess = async (position: GeolocationPosition) => {
      const newLocation: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      console.log('📍 Location updated:', newLocation);
      
      setLocation(newLocation);
      setLocationAccuracy(newLocation.accuracy);
      setError(null);
      setLoading(false);
      
      // Check Jeddah bounds
      const inJeddah = checkJeddahBounds(newLocation.latitude, newLocation.longitude);
      setIsInJeddah(inJeddah);
      
      if (inJeddah) {
        // Fetch nearby places and update database
        const places = await fetchNearbyPlaces(newLocation);
        updateUserLocation(newLocation);
        
        // Update chat available places (within 500m)
        const chatPlaces = new Set(
          places
            .filter(place => place.distance <= 500)
            .map(place => place.id)
        );
        setChatAvailablePlaces(chatPlaces);
        
        console.log('✅ Chat available at:', chatPlaces.size, 'places');
      } else {
        console.log('❌ Outside Jeddah bounds');
        setNearbyPlaces([]);
        setChatAvailablePlaces(new Set());
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error('❌ Location error:', error);
      let errorMessage = 'Location access failed';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Location permission denied. Please enable location access.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Location information unavailable. Please check GPS.';
          break;
        case error.TIMEOUT:
          errorMessage = 'Location request timed out. Please try again.';
          break;
      }
      
      setError(errorMessage);
      setLoading(false);
      setIsInJeddah(false);
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);
  }, [checkJeddahBounds, fetchNearbyPlaces, updateUserLocation]);

  // Start location tracking
  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    };

    const handlePosition = async (position: GeolocationPosition) => {
      const now = Date.now();
      if (now - lastUpdateRef.current < 10000) return; // Throttle to 10 seconds
      lastUpdateRef.current = now;

      const newLocation: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      setLocation(newLocation);
      setLocationAccuracy(newLocation.accuracy);
      
      const inJeddah = checkJeddahBounds(newLocation.latitude, newLocation.longitude);
      setIsInJeddah(inJeddah);
      
      if (inJeddah) {
        const places = await fetchNearbyPlaces(newLocation);
        updateUserLocation(newLocation);
        
        const chatPlaces = new Set(
          places
            .filter(place => place.distance <= 500)
            .map(place => place.id)
        );
        setChatAvailablePlaces(chatPlaces);
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error('❌ Location tracking error:', error);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      options
    );
  }, [checkJeddahBounds, fetchNearbyPlaces, updateUserLocation]);

  // Initialize location
  useEffect(() => {
    getCurrentLocation();
    startLocationTracking();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [getCurrentLocation, startLocationTracking]);

  const retryLocation = useCallback(() => {
    setLoading(true);
    setError(null);
    getCurrentLocation();
  }, [getCurrentLocation]);

  return {
    location,
    nearbyPlaces,
    chatAvailablePlaces,
    isInJeddah,
    locationAccuracy,
    error,
    loading,
    calculateDistance,
    retryLocation
  };
};
