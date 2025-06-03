
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useLocationTracking = () => {
  const { user } = useAuth();
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!user) return;

    const updateUserLocation = async (latitude: number, longitude: number, accuracy: number) => {
      // Throttle updates to prevent duplicate key violations
      const now = Date.now();
      if (now - lastUpdateRef.current < 5000) return; // 5 second throttle
      
      lastUpdateRef.current = now;

      try {
        console.log('🔄 Updating user location:', { latitude, longitude, accuracy });
        
        // Use upsert to handle duplicates gracefully
        const { error } = await supabase
          .from('user_locations')
          .upsert({
            user_id: user.id,
            latitude,
            longitude,
            accuracy,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('❌ Location update error:', error);
        } else {
          console.log('✅ Location updated successfully');
        }
      } catch (error) {
        console.error('❌ Location update failed:', error);
      }
    };

    let watchId: number;

    const startTracking = () => {
      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            updateUserLocation(latitude, longitude, accuracy);
          },
          (error) => {
            console.error('❌ Geolocation error:', error);
          },
          {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 30000
          }
        );
      }
    };

    startTracking();

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [user]);
};
