
import { useState, useEffect } from 'react';
import { useLocation } from './useLocation';

interface JeddahBounds {
  southwest: { lat: number; lng: number };
  northeast: { lat: number; lng: number };
}

export const useJeddahLocationCheck = () => {
  const [isInJeddah, setIsInJeddah] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const { location, loading, error, retryLocation } = useLocation();

  // Precise Jeddah city boundaries with buffer for accuracy
  const jeddahBounds: JeddahBounds = {
    southwest: { lat: 21.350000, lng: 39.050000 },
    northeast: { lat: 21.750000, lng: 39.350000 }
  };

  const checkLocationInBounds = (lat: number, lng: number) => {
    const inBounds = (
      lat >= jeddahBounds.southwest.lat &&
      lat <= jeddahBounds.northeast.lat &&
      lng >= jeddahBounds.southwest.lng &&
      lng <= jeddahBounds.northeast.lng
    );
    
    console.log('🔍 Location boundary check:', {
      coordinates: { lat, lng },
      bounds: jeddahBounds,
      result: inBounds ? 'INSIDE JEDDAH' : 'OUTSIDE JEDDAH'
    });
    
    return inBounds;
  };

  useEffect(() => {
    console.log('🌍 Jeddah location verification:', { location, loading, error });
    
    if (!loading) {
      if (location) {
        const inBounds = checkLocationInBounds(location.latitude, location.longitude);
        setIsInJeddah(inBounds);
        
        console.log('📍 Final location status:', {
          coordinates: {
            lat: location.latitude.toFixed(6),
            lng: location.longitude.toFixed(6)
          },
          accuracy: location.accuracy ? `${Math.round(location.accuracy)}m` : 'unknown',
          inJeddah: inBounds,
          status: inBounds ? '✅ VERIFIED IN JEDDAH' : '❌ NOT IN JEDDAH'
        });
      } else if (error) {
        console.warn('⚠️ Location detection failed:', error);
        setIsInJeddah(false);
      } else {
        console.log('📍 No location data available');
        setIsInJeddah(null);
      }
      setIsChecking(false);
    }
  }, [location, loading, error]);

  const recheckLocation = () => {
    console.log('🔄 Manually rechecking Jeddah location...');
    setIsChecking(true);
    setIsInJeddah(null);
    retryLocation();
  };

  return {
    isInJeddah,
    loading: isChecking || loading,
    recheckLocation,
    locationError: error,
    jeddahBounds
  };
};
