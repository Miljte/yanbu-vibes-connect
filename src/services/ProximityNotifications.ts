
import { LocalNotifications } from '@capacitor/local-notifications';
import { Geolocation } from '@capacitor/geolocation';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

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
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  async scheduleProximityNotification(place: Place, distance: number): Promise<void> {
    if (this.notifiedPlaces.has(place.id)) return;

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: `🏪 ${place.name} Nearby!`,
            body: `You're ${Math.round(distance)}m away from ${place.name}. Tap to explore!`,
            id: Date.now(),
            schedule: { at: new Date(Date.now() + 1000) },
            sound: 'default',
            attachments: undefined,
            actionTypeId: '',
            extra: {
              placeId: place.id,
              type: 'proximity'
            }
          }
        ]
      });

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
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      console.error('Error with haptic feedback:', error);
    }
  }

  async checkNearbyPlaces(places: Place[], userLocation: { latitude: number; longitude: number }): Promise<void> {
    for (const place of places) {
      const distance = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        place.latitude,
        place.longitude
      );

      if (distance <= this.PROXIMITY_THRESHOLD) {
        await this.scheduleProximityNotification(place, distance);
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
