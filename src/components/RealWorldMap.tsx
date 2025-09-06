import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Calendar, Users, Clock, Star, Navigation, Zap, Coffee, ShoppingBag, Music, Utensils, Locate, Filter, X, ChevronUp, Settings, MapIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';
import MapErrorBoundary from './MapErrorBoundary';

// Use Supabase types
type Place = Database['public']['Tables']['places']['Row'] & { distance?: number };
type Event = Database['public']['Tables']['events']['Row'] & { 
  distance?: number;
  place?: Place;
  latitude?: number;
  longitude?: number;
};

interface MapMarker {
  id: string;
  type: 'place' | 'event';
  latitude: number;
  longitude: number;
  name: string;
  data: Place | Event;
}

interface AppCenter {
  name: string;
  lat: number;
  lng: number;
  country: string;
}

// Map component that will be conditionally rendered
const MapComponent = React.lazy(() => import('./RealLeafletMap'));

const RealWorldMap: React.FC = () => {
  const [isClient, setIsClient] = useState(false);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [filter, setFilter] = useState<'all' | 'places' | 'events'>('all');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [mapView, setMapView] = useState<'list' | 'map'>('map');
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showCenterEditor, setShowCenterEditor] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const { user } = useAuth();
  const watchId = useRef<number | null>(null);

  // Default app center (can be changed by user)
  const [appCenter, setAppCenter] = useState<AppCenter>(() => {
    const saved = localStorage.getItem('appCenter');
    if (saved) {
      return JSON.parse(saved);
    }
    return { name: 'Yanbu', lat: 24.0889, lng: 38.0618, country: 'Saudi Arabia' };
  });

  // Popular world locations for quick selection
  const popularLocations: AppCenter[] = [
    { name: 'Yanbu', lat: 24.0889, lng: 38.0618, country: 'Saudi Arabia' },
    { name: 'Riyadh', lat: 24.7136, lng: 46.6753, country: 'Saudi Arabia' },
    { name: 'Jeddah', lat: 21.4858, lng: 39.1925, country: 'Saudi Arabia' },
    { name: 'Mecca', lat: 21.3891, lng: 39.8579, country: 'Saudi Arabia' },
    { name: 'Dubai', lat: 25.2048, lng: 55.2708, country: 'UAE' },
    { name: 'London', lat: 51.5074, lng: -0.1278, country: 'UK' },
    { name: 'New York', lat: 40.7128, lng: -74.0060, country: 'USA' },
    { name: 'Tokyo', lat: 35.6762, lng: 139.6503, country: 'Japan' },
    { name: 'Paris', lat: 48.8566, lng: 2.3522, country: 'France' },
    { name: 'Sydney', lat: -33.8688, lng: 151.2093, country: 'Australia' }
  ];

  // Mock data for demonstration
  const mockPlaces: Place[] = [
    {
      id: '1',
      name: 'Coral Beach Resort',
      type: 'beach',
      latitude: appCenter.lat + 0.0003,
      longitude: appCenter.lng + 0.0003,
      description: 'Beautiful coral reef beach with crystal clear waters',
      address: 'Coral Beach Road',
      created_at: new Date().toISOString(),
      crowd_level: 'medium',
      female_percentage: 45,
      male_percentage: 55,
      image_urls: [],
      images: [],
      is_active: true,
      merchant_id: null,
      updated_at: new Date().toISOString(),
      working_hours: null
    },
    {
      id: '2',
      name: 'Traditional Local Cuisine',
      type: 'restaurant',
      latitude: appCenter.lat - 0.0004,
      longitude: appCenter.lng - 0.0003,
      description: 'Authentic local flavors and traditional dishes',
      address: 'Old Town Market',
      created_at: new Date().toISOString(),
      crowd_level: 'high',
      female_percentage: 50,
      male_percentage: 50,
      image_urls: [],
      images: [],
      is_active: true,
      merchant_id: null,
      updated_at: new Date().toISOString(),
      working_hours: null
    },
    {
      id: '3',
      name: 'Heritage Cafe',
      type: 'cafe',
      latitude: appCenter.lat + 0.0005,
      longitude: appCenter.lng + 0.0007,
      description: 'Modern cafe with traditional coffee',
      address: 'Heritage District',
      created_at: new Date().toISOString(),
      crowd_level: 'low',
      female_percentage: 60,
      male_percentage: 40,
      image_urls: [],
      images: [],
      is_active: true,
      merchant_id: null,
      updated_at: new Date().toISOString(),
      working_hours: null
    }
  ];

  const mockEvents: Event[] = [
    {
      id: '1',
      title: 'Beach Volleyball Tournament',
      description: 'Join us for a fun beach volleyball competition',
      start_time: '2025-09-04T16:00:00Z',
      end_time: '2025-09-04T20:00:00Z',
      place_id: '1',
      latitude: appCenter.lat + 0.0002,
      longitude: appCenter.lng + 0.0002,
      current_attendees: 24,
      max_attendees: 50,
      organizer_id: 'user1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      image_url: null,
      is_active: true
    }
  ];

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
    // Give some time for dynamic imports to load
    setTimeout(() => setMapReady(true), 1000);
  }, []);

  // Save app center to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('appCenter', JSON.stringify(appCenter));
  }, [appCenter]);

  // Calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Load places and events
  useEffect(() => {
    if (!isClient) return;
    
    const loadData = async () => {
      try {
        const [placesResult, eventsResult] = await Promise.all([
          supabase.from('places').select('*'),
          supabase.from('events').select('*, places(latitude, longitude, name)')
        ]);

        let places = placesResult.data || [];
        let events = eventsResult.data || [];

        // Use mock data if no real data exists (with app center coordinates)
        if (places.length === 0) {
          const simplePlaces = mockPlaces.map(place => ({
            ...place,
            distance: 0
          }));
          places = simplePlaces;
        }
        
        if (events.length === 0) {
          const simpleEvents = mockEvents.map(event => ({
            ...event,
            places: event.place_id ? { 
              latitude: event.latitude || 0, 
              longitude: event.longitude || 0, 
              name: `${appCenter.name} Location` 
            } : null
          }));
          events = simpleEvents as any;
        }

        // Create markers array
        const allMarkers: MapMarker[] = [
          ...places.map(place => ({
            id: `place_${place.id}`,
            type: 'place' as const,
            latitude: place.latitude,
            longitude: place.longitude,
            name: place.name,
            data: place
          })),
          ...events.map(event => {
            const place = (event as any).places;
            const lat = (event as any).latitude || place?.latitude || appCenter.lat;
            const lng = (event as any).longitude || place?.longitude || appCenter.lng;
            
            return {
              id: `event_${event.id}`,
              type: 'event' as const,
              latitude: lat,
              longitude: lng,
              name: event.title,
              data: {
                ...event,
                latitude: lat,
                longitude: lng
              }
            };
          })
        ];

        setMarkers(allMarkers);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load map data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isClient, appCenter]);

  // Start location tracking
  useEffect(() => {
    if (!isClient) return;
    
    if (typeof window !== 'undefined' && navigator.geolocation) {
      const options = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(newLocation);
          setLocationError(null);
          updateMarkersWithDistance(newLocation);
        },
        (error) => {
          console.warn('Initial location failed:', error.message);
        },
        { timeout: 5000, maximumAge: 300000 }
      );

      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(newLocation);
          setLocationError(null);
          updateMarkersWithDistance(newLocation);
        },
        (error) => {
          console.error('Location error:', error);
          setLocationError(`Location access denied. Using ${appCenter.name} center.`);
          setUserLocation(appCenter);
          updateMarkersWithDistance(appCenter);
        },
        options
      );

      return () => {
        if (watchId.current) {
          navigator.geolocation.clearWatch(watchId.current);
        }
      };
    } else {
      setLocationError(`Geolocation not supported. Using ${appCenter.name} center.`);
      setUserLocation(appCenter);
      updateMarkersWithDistance(appCenter);
    }
  }, [isClient, appCenter]);

  const updateMarkersWithDistance = (location: {lat: number, lng: number}) => {
    setMarkers(prevMarkers => 
      prevMarkers.map(marker => ({
        ...marker,
        data: {
          ...marker.data,
          distance: calculateDistance(
            location.lat,
            location.lng,
            marker.latitude,
            marker.longitude
          )
        }
      }))
    );
  };

  // Filter markers
  const filteredMarkers = markers.filter(marker => {
    if (filter === 'all') return true;
    if (filter === 'places') return marker.type === 'place';
    if (filter === 'events') return marker.type === 'event';
    return true;
  });

  const sortedMarkers = filteredMarkers.sort((a, b) => {
    const aDistance = (a.data as any).distance || 0;
    const bDistance = (b.data as any).distance || 0;
    return aDistance - bDistance;
  });

  const getFilterCount = (filterType: 'all' | 'places' | 'events') => {
    if (filterType === 'all') return markers.length;
    if (filterType === 'places') return markers.filter(m => m.type === 'place').length;
    if (filterType === 'events') return markers.filter(m => m.type === 'event').length;
    return 0;
  };

  const formatDistance = (distance: number | undefined) => {
    if (!distance) return '';
    if (distance < 1000) return `${Math.round(distance)}m`;
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const handleCenterChange = (newCenter: AppCenter) => {
    setAppCenter(newCenter);
    setShowCenterEditor(false);
    toast.success(`App center changed to ${newCenter.name}`);
  };

  if (!isClient || loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-primary-light/10 via-background to-accent-vibrant/10 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-light/20 rounded-full blur-3xl animate-float" />
          <div className="absolute top-3/4 right-1/4 w-48 h-48 bg-accent-vibrant/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/4 left-1/2 w-32 h-32 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-2xl animate-pulse" />
        </div>
        
        <div className="text-center space-y-6 z-10 animate-scale-in">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-r-accent-vibrant rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent-vibrant bg-clip-text text-transparent">
              Loading Real World Map
            </h2>
            <p className="text-muted-foreground text-lg font-medium animate-pulse">Initializing interactive map...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative bg-gradient-to-br from-primary-light/10 via-background to-accent-vibrant/10 overflow-hidden">
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-r from-primary-light/10 to-accent-vibrant/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-gradient-to-r from-accent-vibrant/10 to-primary-light/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-card/95 backdrop-blur-sm border-b border-border/50 shadow-lg">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapIcon className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold bg-gradient-to-r from-primary to-accent-vibrant bg-clip-text text-transparent">
                Discover {appCenter.name}
              </h2>
              <Badge variant="outline" className="text-xs border-primary/20 text-primary">
                {sortedMarkers.length} nearby
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCenterEditor(true)}
                className="h-8 border-primary/20 hover:border-primary/40"
              >
                <Settings className="h-3 w-3 mr-1" />
                Location
              </Button>
              <Button
                variant={mapView === 'map' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMapView('map')}
                className="h-8"
              >
                Map
              </Button>
              <Button
                variant={mapView === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMapView('list')}
                className="h-8"
              >
                List
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className="whitespace-nowrap"
            >
              All ({getFilterCount('all')})
            </Button>
            <Button
              variant={filter === 'places' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('places')}
              className="whitespace-nowrap"
            >
              Places ({getFilterCount('places')})
            </Button>
            <Button
              variant={filter === 'events' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('events')}
              className="whitespace-nowrap"
            >
              Events ({getFilterCount('events')})
            </Button>
          </div>
        </div>
      </div>

      {/* Real Map View */}
      {mapView === 'map' && mapReady && (
        <div className="h-full pt-32 relative z-10">
          <React.Suspense fallback={
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading map...</p>
              </div>
            </div>
          }>
            <MapErrorBoundary>
              <MapComponent
                center={appCenter}
                userLocation={userLocation}
                markers={sortedMarkers}
                onMarkerClick={setSelectedMarker}
              />
            </MapErrorBoundary>
          </React.Suspense>
        </div>
      )}

      {/* List View - same as before but with app center context */}
      {mapView === 'list' && (
        <div className="h-full pt-32 pb-20 overflow-y-auto relative z-10">
          <div className="p-4 space-y-3">
            {sortedMarkers.map((marker) => (
              <Card key={marker.id} className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-card/90 backdrop-blur-sm border-border/50 hover:border-primary/30"
                    onClick={() => setSelectedMarker(marker)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-foreground">{marker.name}</h3>
                        {marker.type === 'place' ? (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        ) : (
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {marker.type === 'place' 
                          ? (marker.data as Place).description 
                          : (marker.data as Event).description}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={marker.type === 'place' ? 'default' : 'secondary'} className="text-xs">
                          {marker.type === 'place' ? (marker.data as Place).type : 'event'}
                        </Badge>
                        {(marker.data as any).distance && (
                          <Badge variant="outline" className="text-xs border-primary/20 text-primary">
                            📍 {formatDistance((marker.data as any).distance)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
                      marker.type === 'place' 
                        ? 'bg-gradient-to-r from-primary to-primary-light' 
                        : 'bg-gradient-to-r from-purple-500 to-purple-600'
                    }`}>
                      {marker.type === 'place' ? (
                        <MapPin className="h-6 w-6 text-white" />
                      ) : (
                        <Calendar className="h-6 w-6 text-white" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Location Center Editor Modal */}
      {showCenterEditor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-border/50 w-full max-w-md max-h-[80vh] overflow-y-auto animate-scale-in">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold bg-gradient-to-r from-primary to-accent-vibrant bg-clip-text text-transparent">
                  Change App Center
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCenterEditor(false)}
                  className="h-8 w-8 p-0 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Current Center</Label>
                  <div className="bg-muted/50 rounded-xl p-3">
                    <div className="font-medium">{appCenter.name}, {appCenter.country}</div>
                    <div className="text-sm text-muted-foreground">
                      {appCenter.lat.toFixed(4)}, {appCenter.lng.toFixed(4)}
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Popular Locations</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                    {popularLocations.map((location) => (
                      <Button
                        key={`${location.name}-${location.country}`}
                        variant={location.name === appCenter.name ? 'default' : 'outline'}
                        className="justify-start h-auto p-3"
                        onClick={() => handleCenterChange(location)}
                      >
                        <div className="text-left">
                          <div className="font-medium">{location.name}</div>
                          <div className="text-xs opacity-70">{location.country}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground text-center">
                    Changing the center will update mock locations and default coordinates
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Marker Modal - same as before */}
      {selectedMarker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-end md:items-center justify-center p-4 animate-fade-in">
          <div className="bg-card/95 backdrop-blur-sm rounded-t-3xl md:rounded-2xl shadow-2xl border border-border/50 w-full max-w-lg max-h-[80vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                    selectedMarker.type === 'place' 
                      ? 'bg-gradient-to-r from-primary to-primary-light' 
                      : 'bg-gradient-to-r from-purple-500 to-purple-600'
                  }`}>
                    {selectedMarker.type === 'place' ? (
                      <MapPin className="h-5 w-5 text-white" />
                    ) : (
                      <Calendar className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{selectedMarker.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedMarker.type === 'place' ? 'Place' : 'Event'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMarker(null)}
                  className="h-8 w-8 p-0 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-muted-foreground">
                {selectedMarker.type === 'place' 
                  ? (selectedMarker.data as Place).description 
                  : (selectedMarker.data as Event).description}
              </p>
              
              <div className="flex gap-2 pt-2">
                <Button className="flex-1 bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-primary">
                  <Navigation className="h-4 w-4 mr-2" />
                  Get Directions
                </Button>
                <Button variant="outline" className="flex-1">
                  <Users className="h-4 w-4 mr-2" />
                  Join Chat
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Indicators */}
      {userLocation && !locationError && (
        <div className="absolute bottom-20 left-4 z-[1000] animate-fade-in">
          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-lg">
            <Locate className="h-3 w-3 mr-1 animate-pulse" />
            GPS Active
          </Badge>
        </div>
      )}

      {locationError && (
        <div className="absolute bottom-20 left-4 z-[1000] animate-fade-in">
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg">
            <Navigation className="h-3 w-3 mr-1" />
            Using {appCenter.name}
          </Badge>
        </div>
      )}
    </div>
  );
};

export default RealWorldMap;
