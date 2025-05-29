
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

  const isLocationReasonable = (newLoc: LocationData, prevLoc: LocationData | null): boolean => {
    if (!prevLoc) return true;
    
    const distance = calculateDistance(
      prevLoc.latitude, prevLoc.longitude,
      newLoc.latitude, newLoc.longitude
    );
    
    // More lenient for driving - allow up to 10km jumps if accuracy is reasonable
    const maxJump = newLoc.accuracy && newLoc.accuracy < 50 ? 10000 : 5000;
    
    if (distance > maxJump) {
      console.warn(`🚫 Location jump detected: ${distance}m - rejecting (max: ${maxJump}m)`);
      return false;
    }
    
    return true;
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

      console.log(`📊 Found ${places?.length || 0} total active places in database`);

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
      }).filter(place => place.distance <= 5000) // Increased range to 5km for better detection
      .sort((a, b) => a.distance - b.distance) || [];

      console.log(`✅ Found ${placesWithDistance.length} places within 5km`);
      
      // Log all places with distances for debugging
      placesWithDistance.forEach(place => {
        console.log(`📍 ${place.name}: ${place.distance}m away (${place.distance <= 500 ? 'UNLOCKED' : 'locked'})`);
      });

      setNearbyPlaces(placesWithDistance);

      // Auto-unlock chat for places within 500m
      const unlockedPlaceIds = new Set(
        placesWithDistance
          .filter(place => place.distance <= 500)
          .map(place => place.id)
      );
      setChatUnlockedPlaces(unlockedPlaceIds);
      
      console.log(`🔓 Chat auto-unlocked for ${unlockedPlaceIds.size} places within 500m`);
      
      if (unlockedPlaceIds.size > 0) {
        console.log('🎉 Unlocked place IDs:', Array.from(unlockedPlaceIds));
      }
    } catch (error) {
      console.error('❌ Error in fetchNearbyPlaces:', error);
    }
  };

  const updateOnlineStatus = async (isOnline: boolean) => {
    if (!user) return;
    
    try {
      if (!isOnline) {
        console.log('🔴 Marking user as OFFLINE');
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

      console.log('🌍 Starting GPS tracking for user:', user.id);
      setIsTracking(true);

      const options = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      };

      const updateLocation = async (position: GeolocationPosition) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        // More lenient accuracy check - accept locations up to 1000m accuracy
        if (newLocation.accuracy && newLocation.accuracy > 1000) {
          console.warn('⚠️ Very poor GPS accuracy:', newLocation.accuracy + 'm - skipping update');
          return;
        }

        if (!isLocationReasonable(newLocation, location)) {
          return;
        }

        console.log('📍 GPS update:', newLocation, 'accuracy:', newLocation.accuracy + 'm');

        const withinYanbu = isWithinYanbu(newLocation.latitude, newLocation.longitude);
        setIsInYanbu(withinYanbu);

        if (!withinYanbu) {
          const errorMsg = `🚫 Outside Yanbu city limits - Map access restricted`;
          setError(errorMsg);
          console.warn('❌ User outside Yanbu bounds:', newLocation);
          setLocation(newLocation);
          return;
        }

        console.log('✅ Location confirmed within Yanbu bounds');
        setLocation(newLocation);
        setError(null);

        // Always fetch nearby places when location updates
        try {
          await fetchNearbyPlaces(newLocation);
        } catch (error) {
          console.error('❌ Error fetching nearby places:', error);
        }

        // Update location in database
        try {
          await supabase
            .from('user_locations')
            .upsert({
              user_id: user.id,
              latitude: newLocation.latitude,
              longitude: newLocation.longitude,
              accuracy: newLocation.accuracy,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id'
            });

          console.log('✅ Location updated in DB - user marked as ONLINE');
        } catch (error) {
          console.error('❌ Failed to update location in DB:', error);
        }
      };

      const handleError = (error: GeolocationPositionError) => {
        console.warn('⚠️ GPS error:', error.message);
        
        setTimeout(() => {
          if (!location) {
            let errorMessage = 'GPS issue: ';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage += 'Please enable location permissions.';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage += 'GPS signal weak. Trying again...';
                break;
              case error.TIMEOUT:
                errorMessage += 'GPS timeout. Continuing with network location.';
                break;
              default:
                errorMessage += 'Using last known location.';
                break;
            }
            setError(errorMessage);
          }
        }, 2000);
      };

      // Get immediate position
      navigator.geolocation.getCurrentPosition(
        updateLocation,
        handleError,
        options
      );

      // Start continuous tracking
      watchId = navigator.geolocation.watchPosition(
        updateLocation,
        handleError,
        options
      );

      // Update every 60 seconds to maintain online status
      updateInterval = setInterval(async () => {
        if (location) {
          try {
            await supabase
              .from('user_locations')
              .update({ updated_at: new Date().toISOString() })
              .eq('user_id', user.id);
            
            console.log('🔄 Online status refreshed');
          } catch (err) {
            console.error('❌ Online status update failed:', err);
          }
        }
      }, 60000);
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
        console.log('📱 App hidden - stopping location tracking');
        stopTracking();
      } else {
        console.log('📱 App visible - starting location tracking');
        startTracking();
      }
    };

    const handleBeforeUnload = () => {
      console.log('👋 User leaving app - marking offline');
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
