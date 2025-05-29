
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
  const [isInYanbu, setIsInYanbu] = useState<boolean | null>(null);
  const { user } = useAuth();

  // Yanbu city boundaries - Relaxed for better coverage
  const yanbuBounds = {
    southwest: { lat: 23.900000, lng: 38.000000 },
    northeast: { lat: 24.200000, lng: 38.250000 }
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

  // Smoothing algorithm to prevent jumps
  const smoothLocation = (newLoc: LocationData, prevLoc: LocationData | null): LocationData => {
    if (!prevLoc) return newLoc;
    
    const distance = calculateDistance(
      prevLoc.latitude, prevLoc.longitude,
      newLoc.latitude, newLoc.longitude
    );
    
    // If jump is too large and accuracy is poor, smooth it
    if (distance > 2000 && newLoc.accuracy && newLoc.accuracy > 100) {
      console.log('🔧 Smoothing large location jump:', distance + 'm');
      return {
        latitude: (prevLoc.latitude + newLoc.latitude) / 2,
        longitude: (prevLoc.longitude + newLoc.longitude) / 2,
        accuracy: newLoc.accuracy
      };
    }
    
    // For driving scenarios, allow larger movements if accuracy is good
    if (distance > 5000 && (!newLoc.accuracy || newLoc.accuracy > 50)) {
      console.warn('🚫 Rejecting suspicious location jump:', distance + 'm, accuracy:', newLoc.accuracy);
      return prevLoc;
    }
    
    return newLoc;
  };

  const fetchNearbyPlaces = async (currentLocation: LocationData) => {
    try {
      console.log('🏪 Fetching places for location:', {
        lat: currentLocation.latitude.toFixed(6),
        lng: currentLocation.longitude.toFixed(6),
        accuracy: currentLocation.accuracy
      });
      
      const { data: places, error: placesError } = await supabase
        .from('places')
        .select('*')
        .eq('is_active', true);

      if (placesError) {
        console.error('❌ Database error:', placesError);
        return;
      }

      console.log(`📊 Found ${places?.length || 0} active places in database`);

      if (!places || places.length === 0) {
        console.warn('⚠️ No active places found in database');
        setNearbyPlaces([]);
        setChatUnlockedPlaces(new Set());
        return;
      }

      const placesWithDistance = places.map(place => {
        const distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          place.latitude,
          place.longitude
        );
        console.log(`📍 ${place.name}: ${distance}m away`);
        return {
          id: place.id,
          name: place.name,
          latitude: place.latitude,
          longitude: place.longitude,
          distance,
          type: place.type
        };
      })
      .filter(place => place.distance <= 10000) // 10km radius for detection
      .sort((a, b) => a.distance - b.distance);

      console.log(`✅ Found ${placesWithDistance.length} places within 10km`);
      setNearbyPlaces(placesWithDistance);

      // Auto-unlock chat for places within 1km (more generous)
      const unlockedPlaceIds = new Set(
        placesWithDistance
          .filter(place => place.distance <= 1000)
          .map(place => place.id)
      );
      setChatUnlockedPlaces(unlockedPlaceIds);
      
      console.log(`🔓 Chat unlocked for ${unlockedPlaceIds.size} places within 1km`);
      
      if (placesWithDistance.length > 0) {
        placesWithDistance.forEach(place => {
          const status = place.distance <= 1000 ? '🔓 UNLOCKED' : '🔒 locked';
          console.log(`  - ${place.name}: ${place.distance}m (${status})`);
        });
      }
    } catch (error) {
      console.error('❌ Error in fetchNearbyPlaces:', error);
    }
  };

  const updateOnlineStatus = async (isOnline: boolean) => {
    if (!user) return;
    
    try {
      if (!isOnline) {
        await supabase
          .from('user_locations')
          .update({ 
            updated_at: new Date(Date.now() - 11 * 60 * 1000).toISOString() 
          })
          .eq('user_id', user.id);
      }
    } catch (error) {
      console.error('❌ Error updating online status:', error);
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

      console.log('🌍 Starting enhanced GPS tracking for user:', user.id);
      setIsTracking(true);

      // Progressive options for better accuracy
      const highAccuracyOptions = {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 10000,
      };

      const fastOptions = {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 30000,
      };

      const updateLocation = async (position: GeolocationPosition) => {
        const rawLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        console.log('📍 Raw GPS update:', {
          ...rawLocation,
          accuracy: rawLocation.accuracy + 'm'
        });

        // Apply smoothing to prevent jumps
        const smoothedLocation = smoothLocation(rawLocation, location);
        
        const withinYanbu = isWithinYanbu(smoothedLocation.latitude, smoothedLocation.longitude);
        setIsInYanbu(withinYanbu);

        if (!withinYanbu) {
          console.warn('❌ Location outside Yanbu bounds');
          setError('Outside Yanbu city limits - Limited functionality');
          setLocation(smoothedLocation);
          return;
        }

        console.log('✅ Location confirmed within Yanbu bounds');
        setLocation(smoothedLocation);
        setError(null);

        // Always fetch nearby places when location updates
        await fetchNearbyPlaces(smoothedLocation);

        // Update location in database
        try {
          await supabase
            .from('user_locations')
            .upsert({
              user_id: user.id,
              latitude: smoothedLocation.latitude,
              longitude: smoothedLocation.longitude,
              accuracy: smoothedLocation.accuracy,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id'
            });

          console.log('✅ Location updated in database');
        } catch (error) {
          console.error('❌ Failed to update location in DB:', error);
        }
      };

      const handleError = (error: GeolocationPositionError) => {
        console.warn('⚠️ GPS error:', error.message);
        
        let errorMessage = 'GPS issue: ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Location permission denied. Please enable location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'GPS signal unavailable. Trying alternative methods...';
            break;
          case error.TIMEOUT:
            errorMessage += 'GPS timeout. Using last known location.';
            break;
          default:
            errorMessage += 'Using network location.';
            break;
        }
        
        if (!location) {
          setError(errorMessage);
        }
      };

      // Quick position first, then high accuracy
      navigator.geolocation.getCurrentPosition(
        updateLocation,
        () => {
          // If quick fails, try high accuracy
          navigator.geolocation.getCurrentPosition(
            updateLocation,
            handleError,
            highAccuracyOptions
          );
        },
        fastOptions
      );

      // Start continuous tracking with optimal settings
      watchId = navigator.geolocation.watchPosition(
        updateLocation,
        handleError,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000, // Allow some caching for stability
        }
      );

      // Refresh online status every 30 seconds
      updateInterval = setInterval(async () => {
        if (location && user) {
          try {
            await supabase
              .from('user_locations')
              .update({ updated_at: new Date().toISOString() })
              .eq('user_id', user.id);
          } catch (err) {
            console.error('❌ Online status update failed:', err);
          }
        }
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

      updateOnlineStatus(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('📱 App backgrounded - maintaining tracking');
        // Don't stop tracking when app goes to background
      } else {
        console.log('📱 App foregrounded - ensuring tracking active');
        if (!isTracking) {
          startTracking();
        }
      }
    };

    const handleBeforeUnload = () => {
      updateOnlineStatus(false);
    };

    startTracking();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      stopTracking();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  return {
    location,
    error,
    isTracking,
    nearbyPlaces,
    chatUnlockedPlaces,
    calculateDistance,
    isInYanbu,
  };
};
