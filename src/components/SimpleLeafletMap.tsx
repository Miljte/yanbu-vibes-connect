import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Calendar, Users, Clock, Star, Navigation, Zap, Coffee, ShoppingBag, Music, Utensils, Locate, Filter, X, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

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

const LeafletMapWrapper: React.FC = () => {
  const [isClient, setIsClient] = useState(false);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [filter, setFilter] = useState<'all' | 'places' | 'events'>('all');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [mapView, setMapView] = useState<'list' | 'map'>('map');
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { user } = useAuth();
  const watchId = useRef<number | null>(null);
  const mapRef = useRef<any>(null);

  // Yanbu coordinates as default center
  const YANBU_CENTER = { lat: 24.0889, lng: 38.0618 };

  // Mock data for demonstration
  const mockPlaces: Place[] = [
    {
      id: '1',
      name: 'Coral Beach Resort',
      type: 'beach',
      latitude: 24.0892,
      longitude: 38.0621,
      description: 'Beautiful coral reef beach with crystal clear waters',
      address: 'Coral Beach Road, Yanbu',
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
      name: 'Traditional Saudi Cuisine',
      type: 'restaurant',
      latitude: 24.0886,
      longitude: 38.0615,
      description: 'Authentic local flavors and traditional dishes',
      address: 'Old Town Market, Yanbu',
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
      name: 'Yanbu Heritage Cafe',
      type: 'cafe',
      latitude: 24.0895,
      longitude: 38.0625,
      description: 'Modern cafe with traditional Saudi coffee',
      address: 'Heritage District, Yanbu',
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
      latitude: 24.0890,
      longitude: 38.0620,
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
  }, []);

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

        // Use mock data if no real data exists (simplified for type safety)
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
              name: 'Yanbu Location' 
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
            // Get coordinates from the related place or use fallback
            const place = (event as any).places;
            const lat = (event as any).latitude || place?.latitude || 24.0889;
            const lng = (event as any).longitude || place?.longitude || 38.0618;
            
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
  }, [isClient]);

  // Start location tracking
  useEffect(() => {
    if (!isClient) return;
    
    if (typeof window !== 'undefined' && navigator.geolocation) {
      const options = {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout
        maximumAge: 300000 // 5 minutes cache
      };

      // First try to get immediate position
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
          // Don't set error immediately, try watching
        },
        { timeout: 5000, maximumAge: 300000 }
      );

      // Then start watching for updates
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
          setLocationError(`Location access denied. Using Yanbu center.`);
          // Use Yanbu center as fallback
          setUserLocation(YANBU_CENTER);
          updateMarkersWithDistance(YANBU_CENTER);
        },
        options
      );

      return () => {
        if (watchId.current) {
          navigator.geolocation.clearWatch(watchId.current);
        }
      };
    } else {
      setLocationError('Geolocation not supported. Using Yanbu center.');
      setUserLocation(YANBU_CENTER);
      updateMarkersWithDistance(YANBU_CENTER);
    }
  }, [isClient]);

  // Helper function to update markers with distance
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

  // Sort by distance if user location is available
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

  if (!isClient || loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-primary-light/10 via-background to-accent-vibrant/10 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-light/20 rounded-full blur-3xl animate-float" />
          <div className="absolute top-3/4 right-1/4 w-48 h-48 bg-accent-vibrant/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/4 left-1/2 w-32 h-32 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-2xl animate-pulse" />
        </div>
        
        {/* Loading Content */}
        <div className="text-center space-y-6 z-10 animate-scale-in">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-r-accent-vibrant rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent-vibrant bg-clip-text text-transparent">
              Discover Yanbu
            </h2>
            <p className="text-muted-foreground text-lg font-medium animate-pulse">Loading interactive map...</p>
            <div className="flex justify-center space-x-1 mt-4">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-primary-light rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-accent-vibrant rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
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
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-conic from-primary/5 via-accent-vibrant/5 to-primary/5 rounded-full blur-3xl animate-breath" />
      </div>
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-card/95 backdrop-blur-sm border-b border-border/50 shadow-lg">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold bg-gradient-to-r from-primary to-accent-vibrant bg-clip-text text-transparent">
                Discover Yanbu
              </h2>
              <Badge variant="outline" className="text-xs border-primary/20 text-primary">
                {sortedMarkers.length} nearby
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={mapView === 'map' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMapView('map')}
                className="h-8 bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-primary"
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

      {/* Map View - Enhanced placeholder with modern design */}
      {mapView === 'map' && (
        <div className="h-full pt-32 relative z-10">
          <div className="h-full w-full flex items-center justify-center p-4">
            <div className="text-center p-8 bg-card/90 backdrop-blur-sm rounded-2xl shadow-xl border border-border/50 max-w-2xl w-full animate-scale-in">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-primary to-accent-vibrant rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <MapPin className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              
              <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent-vibrant bg-clip-text text-transparent mb-2">
                Interactive Discovery Map
              </h3>
              <p className="text-muted-foreground mb-6">
                Exploring {sortedMarkers.length} locations in Yanbu with live GPS tracking
              </p>
              
              {/* Location Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {sortedMarkers.slice(0, 4).map((marker) => (
                  <div key={marker.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted/70 transition-colors cursor-pointer"
                       onClick={() => setSelectedMarker(marker)}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      marker.type === 'place' 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                        : 'bg-gradient-to-r from-purple-500 to-purple-600'
                    }`}>
                      {marker.type === 'place' ? (
                        <Coffee className="h-5 w-5 text-white" />
                      ) : (
                        <Calendar className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="font-medium text-sm truncate">{marker.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {(marker.data as any).distance 
                          ? formatDistance((marker.data as any).distance)
                          : 'Calculating...'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* GPS Status */}
              {userLocation && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <Locate className="h-4 w-4 animate-pulse" />
                    <span className="text-sm font-medium">Live GPS Active</span>
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    📍 {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                  </div>
                </div>
              )}
              
              {locationError && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-center gap-2 text-amber-700">
                    <Navigation className="h-4 w-4" />
                    <span className="text-sm font-medium">Using Default Location</span>
                  </div>
                  <div className="text-xs text-amber-600 mt-1">
                    {locationError}
                  </div>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground">
                Real map integration available • Tap locations to explore
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List View */}
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
                        {marker.type === 'event' && (
                          <Badge variant="outline" className="text-xs border-purple-200 text-purple-700">
                            👥 {(marker.data as Event).current_attendees || 0} attending
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
            
            {sortedMarkers.length === 0 && (
              <div className="text-center py-12">
                <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">No locations found</h3>
                <p className="text-sm text-muted-foreground">Try adjusting your filters or check back later</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Location Status */}
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
            Default Location
          </Badge>
        </div>
      )}
      
      {/* Selected Marker Modal */}
      {selectedMarker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-end md:items-center justify-center p-4 animate-fade-in">
          <div className="bg-card/95 backdrop-blur-sm rounded-t-3xl md:rounded-2xl shadow-2xl border border-border/50 w-full max-w-lg max-h-[80vh] overflow-y-auto animate-slide-up">
            {/* Modal Header */}
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

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {selectedMarker.type === 'place' ? (
                <div>
                  <p className="text-muted-foreground mb-4">
                    {(selectedMarker.data as Place).description}
                  </p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-muted/50 rounded-xl p-3">
                      <div className="text-xs text-muted-foreground mb-1">Type</div>
                      <div className="font-medium capitalize">{(selectedMarker.data as Place).type}</div>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-3">
                      <div className="text-xs text-muted-foreground mb-1">Distance</div>
                      <div className="font-medium">
                        {(selectedMarker.data as any).distance 
                          ? formatDistance((selectedMarker.data as any).distance)
                          : 'Calculating...'}
                      </div>
                    </div>
                  </div>
                  {(selectedMarker.data as Place).address && (
                    <div className="bg-muted/50 rounded-xl p-3">
                      <div className="text-xs text-muted-foreground mb-1">Address</div>
                      <div className="font-medium">{(selectedMarker.data as Place).address}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-muted-foreground mb-4">
                    {(selectedMarker.data as Event).description}
                  </p>
                  <div className="grid grid-cols-1 gap-3 mb-4">
                    <div className="bg-muted/50 rounded-xl p-3">
                      <div className="text-xs text-muted-foreground mb-1">Date & Time</div>
                      <div className="font-medium">
                        {new Date((selectedMarker.data as Event).start_time).toLocaleString()}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/50 rounded-xl p-3">
                        <div className="text-xs text-muted-foreground mb-1">Attending</div>
                        <div className="font-medium">
                          {(selectedMarker.data as Event).current_attendees || 0} people
                        </div>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-3">
                        <div className="text-xs text-muted-foreground mb-1">Distance</div>
                        <div className="font-medium">
                          {(selectedMarker.data as any).distance 
                            ? formatDistance((selectedMarker.data as any).distance)
                            : 'Calculating...'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
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
    </div>
  );
};

export default LeafletMapWrapper;
