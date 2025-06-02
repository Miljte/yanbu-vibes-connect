import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { proximityNotifications } from '@/services/ProximityNotifications';

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
  const [isInJeddah, setIsInJeddah] = useState<boolean | null>(null);
  const { user } = useAuth();

  // Jeddah city boundaries - Expanded for better coverage
  const jeddahBounds = {
    southwest: { lat: 21.200000, lng: 38.800000 },
    northeast: { lat: 21.800000, lng: 39.600000 }
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

  const isWithinJeddah = (lat: number, lng: number): boolean => {
    return (
      lat >= jeddahBounds.southwest.lat &&
      lat <= jeddahBounds.northeast.lat &&
      lng >= jeddahBounds.southwest.lng &&
      lng <= jeddahBounds.northeast.lng
    );
  };

  // Enhanced smoothing algorithm for real-time movement
  const smoothLocation = (newLoc: LocationData, prevLoc: LocationData | null): LocationData => {
    if (!prevLoc) return newLoc;
    
    const distance = calculateDistance(
      prevLoc.latitude, prevLoc.longitude,
      newLoc.latitude, newLoc.longitude
    );
    
    // More permissive for real-time tracking during movement
    if (distance > 5000 && newLoc.accuracy && newLoc.accuracy > 200) {
      console.log('🔧 Smoothing large location jump:', distance + 'm');
      return {
        latitude: (prevLoc.latitude * 0.3 + newLoc.latitude * 0.7), // Weighted average favoring new location
        longitude: (prevLoc.longitude * 0.3 + newLoc.longitude * 0.7),
        accuracy: newLoc.accuracy
      };
    }
    
    // Allow larger movements for vehicles/fast movement with good accuracy
    if (distance > 10000 && (!newLoc.accuracy || newLoc.accuracy > 100)) {
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

      console.log('🌍 Starting enhanced real-time GPS tracking for Jeddah:', user.id);
      setIsTracking(true);

      const updateLocation = async (position: GeolocationPosition) => {
        const rawLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        console.log('📍 Real-time GPS update:', {
          ...rawLocation,
          accuracy: rawLocation.accuracy + 'm',
          speed: position.coords.speed ? position.coords.speed + 'm/s' : 'unknown'
        });

        // Apply smoothing for real-time movement
        const smoothedLocation = smoothLocation(rawLocation, location);
        
        const withinJeddah = isWithinJeddah(smoothedLocation.latitude, smoothedLocation.longitude);
        setIsInJeddah(withinJeddah);

        if (!withinJeddah) {
          console.warn('❌ Location outside Jeddah bounds');
          setError('Outside Jeddah city limits - Limited functionality');
          setLocation(smoothedLocation);
          return;
        }

        console.log('✅ Location confirmed within Jeddah bounds');
        setLocation(smoothedLocation);
        setError(null);

        // Always fetch nearby places when location updates
        await fetchNearbyPlaces(smoothedLocation);

        // Update location in database with higher frequency for real-time tracking
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

          console.log('✅ Real-time location updated in database');
        } catch (error) {
          console.error('❌ Failed to update location in DB:', error);
        }
      };

      const handleError = (error: GeolocationPositionError) => {
        console.warn('⚠️ Real-time GPS error:', error.message);
        
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

      // Aggressive tracking settings for real-time movement
      const realtimeOptions = {
        enableHighAccuracy: true,
        timeout: 8000, // Shorter timeout for real-time
        maximumAge: 500, // Very fresh positions
      };

      // Get initial position quickly
      navigator.geolocation.getCurrentPosition(
        updateLocation,
        handleError,
        realtimeOptions
      );

      // Start aggressive continuous tracking for real-time updates
      watchId = navigator.geolocation.watchPosition(
        updateLocation,
        handleError,
        {
          enableHighAccuracy: true,
          timeout: 5000, // Quick timeout for continuous updates
          maximumAge: 200, // Ultra-fresh for smooth real-time tracking
        }
      );

      // More frequent online status updates for real-time tracking
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
      }, 15000); // Every 15 seconds for real-time apps
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
    isInJeddah,
  };
};
