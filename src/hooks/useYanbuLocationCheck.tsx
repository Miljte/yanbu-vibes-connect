
import { useState, useEffect } from 'react';
import { useLocation } from './useLocation';

interface YanbuBounds {
  southwest: { lat: number; lng: number };
  northeast: { lat: number; lng: number };
}

export const useYanbuLocationCheck = () => {
  const [isInYanbu, setIsInYanbu] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const { location, loading } = useLocation();

  // Yanbu city boundaries
  const yanbuBounds: YanbuBounds = {
    southwest: { lat: 23.970000, lng: 38.060000 },
    northeast: { lat: 24.140000, lng: 38.200000 }
  };

  const checkLocationInBounds = (lat: number, lng: number) => {
    return (
      lat >= yanbuBounds.southwest.lat &&
      lat <= yanbuBounds.northeast.lat &&
      lng >= yanbuBounds.southwest.lng &&
      lng <= yanbuBounds.northeast.lng
    );
  };

  useEffect(() => {
    if (!loading) {
      if (location) {
        const inBounds = checkLocationInBounds(location.latitude, location.longitude);
        setIsInYanbu(inBounds);
      } else {
        // If no location available, assume outside Yanbu for safety
        setIsInYanbu(false);
      }
      setIsChecking(false);
    }
  }, [location, loading]);

  const recheckLocation = () => {
    setIsChecking(true);
    if (location) {
      const inBounds = checkLocationInBounds(location.latitude, location.longitude);
      setIsInYanbu(inBounds);
    } else {
      setIsInYanbu(false);
    }
    setIsChecking(false);
  };

  return {
    isInYanbu,
    loading: isChecking || loading,
    recheckLocation
  };
};
