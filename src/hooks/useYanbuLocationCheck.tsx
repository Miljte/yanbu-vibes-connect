import { useState, useEffect } from 'react';
import { useLocation } from './useLocation';

interface JeddahBounds {
  southwest: { lat: number; lng: number };
  northeast: { lat: number; lng: number };
}

export const useYanbuLocationCheck = () => {
  const [isInYanbu, setIsInYanbu] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const { location, loading } = useLocation();

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
    if (!loading) {
      if (location) {
        const inBounds = checkLocationInBounds(location.latitude, location.longitude);
        setIsInYanbu(inBounds);
        console.log('🌍 Location check:', {
          lat: location.latitude,
          lng: location.longitude,
          inJeddah: inBounds
        });
      } else {
        // If no location available, keep checking instead of assuming outside
        setIsInYanbu(null);
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
      setIsInYanbu(null);
    }
    setIsChecking(false);
  };

  return {
    isInYanbu,
    loading: isChecking || loading,
    recheckLocation
  };
};
