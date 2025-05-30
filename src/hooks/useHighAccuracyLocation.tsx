
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface GeofenceResult {
  isInYanbu: boolean;
  distanceFromCenter: number;
  nearestBoundary: number;
}

export const useHighAccuracyLocation = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geofenceStatus, setGeofenceStatus] = useState<GeofenceResult | null>(null);
  const { user } = useAuth();
  
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Yanbu city geofence boundaries (more precise)
  const YANBU_CENTER = { lat: 24.0892, lng: 38.0618 };
  const YANBU_RADIUS_KM = 25; // 25km radius covers all of Yanbu
  
  // Yanbu polygon bounds for more accurate geofencing
  const YANBU_BOUNDS = [
    { lat: 24.200, lng: 37.950 }, // Northwest
    { lat: 24.200, lng: 38.300 }, // Northeast
    { lat: 23.900, lng: 38.300 }, // Southeast
    { lat: 23.900, lng: 37.950 }, // Southwest
  ];

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const isPointInPolygon = (lat: number, lng: number, polygon: Array<{lat: number, lng: number}>): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng, yi = polygon[i].lat;
      const xj = polygon[j].lng, yj = polygon[j].lat;
      
      if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  };

  const checkGeofence = (lat: number, lng: number): GeofenceResult => {
    // Check if within Yanbu polygon bounds
    const inPolygon = isPointInPolygon(lat, lng, YANBU_BOUNDS);
    
    // Calculate distance from Yanbu center
    const distanceFromCenter = calculateDistance(lat, lng, YANBU_CENTER.lat, YANBU_CENTER.lng);
    
    // Calculate distance to nearest boundary (approximate)
    const nearestBoundary = Math.min(
      ...YANBU_BOUNDS.map(point => calculateDistance(lat, lng, point.lat, point.lng))
    );
    
    const isInYanbu = inPolygon && distanceFromCenter <= YANBU_RADIUS_KM;
    
    return {
      isInYanbu,
      distanceFromCenter: distanceFromCenter * 1000, // Convert to meters
      nearestBoundary: nearestBoundary * 1000 // Convert to meters
    };
  };

  const updateLocationInDB = async (locationData: LocationData) => {
    if (!user) return;
    
    try {
      await supabase
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
      
      console.log('✅ Location updated in database');
    } catch (error) {
      console.error('❌ Failed to update location:', error);
    }
  };

  const handleLocationUpdate = async (position: GeolocationPosition) => {
    const now = Date.now();
    
    // Throttle updates to max once per 5 seconds for performance
    if (now - lastUpdateRef.current < 5000) return;
    lastUpdateRef.current = now;

    const locationData: LocationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: now
    };

    console.log('📍 High-accuracy GPS update:', {
      ...locationData,
      accuracy: `${locationData.accuracy}m`
    });

    // Perform geofence check
    const geofence = checkGeofence(locationData.latitude, locationData.longitude);
    setGeofenceStatus(geofence);

    if (!geofence.isInYanbu) {
      console.warn('❌ Location outside Yanbu geofence');
      setError(`Outside Yanbu area (${(geofence.distanceFromCenter / 1000).toFixed(1)}km from center)`);
    } else {
      console.log('✅ Location confirmed within Yanbu geofence');
      setError(null);
    }

    setLocation(locationData);
    await updateLocationInDB(locationData);
  };

  const handleLocationError = (error: GeolocationPositionError) => {
    console.error('❌ GPS Error:', error.message);
    
    let errorMessage = '';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
        toast.error('Location permission required');
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'GPS signal unavailable. Please check your connection and try again.';
        toast.error('GPS unavailable');
        break;
      case error.TIMEOUT:
        errorMessage = 'GPS timeout. Trying again...';
        console.log('⏰ GPS timeout, retrying...');
        break;
      default:
        errorMessage = 'Unknown location error occurred.';
        break;
    }
    
    setError(errorMessage);
  };

  const startHighAccuracyTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    if (isTracking) return;

    console.log('🌍 Starting high-accuracy GPS tracking...');
    setIsTracking(true);
    setError(null);

    // High accuracy options for best GPS performance
    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000, // 15 seconds
      maximumAge: 10000 // Accept 10-second-old positions
    };

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      handleLocationUpdate,
      handleLocationError,
      options
    );

    // Start continuous tracking
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleLocationUpdate,
      handleLocationError,
      options
    );

    console.log('🔄 Continuous high-accuracy tracking started');
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    console.log('🛑 GPS tracking stopped');
  };

  const checkProximityToPlace = (placeLocation: { latitude: number; longitude: number }): number => {
    if (!location) return Infinity;
    
    return calculateDistance(
      location.latitude,
      location.longitude,
      placeLocation.latitude,
      placeLocation.longitude
    ) * 1000; // Convert to meters
  };

  const canAccessChat = (placeLocation: { latitude: number; longitude: number }): boolean => {
    if (!location || !geofenceStatus?.isInYanbu) return false;
    
    const distance = checkProximityToPlace(placeLocation);
    return distance <= 500; // 500m radius for chat access
  };

  useEffect(() => {
    if (user) {
      startHighAccuracyTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  return {
    location,
    isTracking,
    error,
    geofenceStatus,
    startHighAccuracyTracking,
    stopTracking,
    checkProximityToPlace,
    canAccessChat,
    calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => 
      calculateDistance(lat1, lon1, lat2, lon2) * 1000 // Return in meters
  };
};
