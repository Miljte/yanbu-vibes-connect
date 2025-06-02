
import { useState, useEffect } from 'react';
import { useLocation } from './useLocation';

interface JeddahBounds {
  southwest: { lat: number; lng: number };
  northeast: { lat: number; lng: number };
}

export const useYanbuLocationCheck = () => {
  const [isInYanbu, setIsInYanbu] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const { location, loading, error } = useLocation();

  // Jeddah city boundaries (expanded to cover greater Jeddah area)
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
    console.log('🔍 Location check status:', { location, loading, error });
    
    if (!loading) {
      if (location) {
        const inBounds = checkLocationInBounds(location.latitude, location.longitude);
        setIsInYanbu(inBounds);
        console.log('🌍 Location check:', {
          lat: location.latitude,
          lng: location.longitude,
          inJeddah: inBounds,
          accuracy: location.accuracy
        });
      } else if (error) {
        // If there's a location error, allow access but show warning
        console.warn('⚠️ Location error, allowing limited access:', error);
        setIsInYanbu(null);
      } else {
        // Still trying to get location
        setIsInYanbu(null);
      }
      setIsChecking(false);
    }
  }, [location, loading, error]);

  const recheckLocation = () => {
    console.log('🔄 Rechecking location...');
    setIsChecking(true);
    setIsInYanbu(null);
    
    // The useLocation hook will handle the retry
    setTimeout(() => {
      if (location) {
        const inBounds = checkLocationInBounds(location.latitude, location.longitude);
        setIsInYanbu(inBounds);
      }
      setIsChecking(false);
    }, 2000);
  };

  return {
    isInYanbu,
    loading: isChecking || loading,
    recheckLocation,
    locationError: error
  };
};
