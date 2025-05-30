
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
  private LocalNotifications: any = null;
  private Haptics: any = null;

  constructor() {
    this.initializeCapacitorPlugins();
  }

  private async initializeCapacitorPlugins() {
    try {
      // Dynamically import Capacitor plugins to avoid errors in web environment
      if (typeof window !== 'undefined' && 'Capacitor' in window) {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        this.LocalNotifications = LocalNotifications;
        this.Haptics = { Haptics, ImpactStyle };
      }
    } catch (error) {
      console.log('Capacitor plugins not available in web environment');
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      if (this.LocalNotifications) {
        const result = await this.LocalNotifications.requestPermissions();
        return result.display === 'granted';
      } else {
        // Fallback to web notifications
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          return permission === 'granted';
        }
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
      if (this.LocalNotifications) {
        // Use Capacitor notifications
        await this.LocalNotifications.schedule({
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
      } else if ('Notification' in window && Notification.permission === 'granted') {
        // Fallback to web notifications
        new Notification(`🏪 ${place.name} Nearby!`, {
          body: `You're ${Math.round(distance)}m away from ${place.name}. Tap to explore!`,
          icon: '/favicon.ico'
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
      if (this.Haptics?.Haptics) {
        await this.Haptics.Haptics.impact({ style: this.Haptics.ImpactStyle.Light });
      } else if ('vibrate' in navigator) {
        // Fallback to web vibration API
        navigator.vibrate(200);
      }
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
