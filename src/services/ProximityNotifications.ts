
import { supabase } from '@/integrations/supabase/client';

interface Place {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
}

interface NotificationService {
  requestPermissions: () => Promise<boolean>;
  scheduleProximityNotification: (place: Place, distance: number) => Promise<void>;
  vibrate: () => Promise<void>;
  checkNearbyPlaces: (places: Place[], userLocation: { latitude: number; longitude: number }) => Promise<void>;
}

class ProximityNotificationService implements NotificationService {
  private notifiedPlaces = new Set<string>();
  private readonly PROXIMITY_THRESHOLD = 100; // 100 meters

  async requestPermissions(): Promise<boolean> {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  async scheduleProximityNotification(place: Place, distance: number): Promise<void> {
    if (this.notifiedPlaces.has(place.id)) return;

    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`🏪 ${place.name} Nearby!`, {
          body: `You're ${Math.round(distance)}m away from ${place.name}. Tap to explore!`,
          icon: '/favicon.ico',
          tag: `place-${place.id}`,
          requireInteraction: false
        });
      }

      this.notifiedPlaces.add(place.id);
      await this.vibrate();

      // Clear notification flag after 5 minutes
      setTimeout(() => {
        this.notifiedPlaces.delete(place.id);
      }, 5 * 60 * 1000);

    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  async vibrate(): Promise<void> {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }
    } catch (error) {
      console.error('Error with haptic feedback:', error);
    }
  }

  async checkNearbyPlaces(places: Place[], userLocation: { latitude: number; longitude: number }): Promise<void> {
    // Get current user ID for logging visits
    const { data: { user } } = await supabase.auth.getUser();
    
    for (const place of places) {
      const distance = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        place.latitude,
        place.longitude
      );

      if (distance <= this.PROXIMITY_THRESHOLD) {
        await this.scheduleProximityNotification(place, distance);
        
        // Log place visit if user is very close (within 50m) and authenticated
        if (distance <= 50 && user) {
          try {
            await supabase.rpc('log_place_visit', {
              p_user_id: user.id,
              p_place_id: place.id,
              p_distance: Math.round(distance)
            });
          } catch (error) {
            console.error('Error logging place visit:', error);
          }
        }
      }
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

export const proximityNotifications = new ProximityNotificationService();
