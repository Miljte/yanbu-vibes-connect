
import { useState, useEffect } from 'react';
import { useLocation } from './useLocation';

interface JeddahBounds {
  southwest: { lat: number; lng: number };
  northeast: { lat: number; lng: number };
}

export const useJeddahLocationCheck = () => {
  const [isInJeddah, setIsInJeddah] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const { location, loading, error } = useLocation();

  // Accurate Jeddah city boundaries
  const jeddahBounds: JeddahBounds = {
    southwest: { lat: 21.200000, lng: 38.800000 },
    northeast: { lat: 21.800000, lng: 39.600000 }
  };

  const checkLocationInBounds = (lat: number, lng: number) => {
    return (
      lat >= jeddahBounds.southwest.lat &&
      lat <= jeddahBounds.northeast.lat &&
      lng >= jeddahBounds.southwest.lng &&
      lng <= jeddahBounds.northeast.lng
    );
  };

  useEffect(() => {
    console.log('🔍 Jeddah location check:', { location, loading, error });
    
    if (!loading) {
      if (location) {
        const inBounds = checkLocationInBounds(location.latitude, location.longitude);
        setIsInJeddah(inBounds);
        console.log('🌍 Location verification:', {
          lat: location.latitude,
          lng: location.longitude,
          inJeddah: inBounds,
          accuracy: location.accuracy + 'm'
        });
      } else if (error) {
        console.warn('⚠️ Location error, restricted access:', error);
        setIsInJeddah(false);
      } else {
        setIsInJeddah(null);
      }
      setIsChecking(false);
    }
  }, [location, loading, error]);

  const recheckLocation = () => {
    console.log('🔄 Rechecking Jeddah location...');
    setIsChecking(true);
    setIsInJeddah(null);
  };

  return {
    isInJeddah,
    loading: isChecking || loading,
    recheckLocation,
    locationError: error,
    jeddahBounds
  };
};
