import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Users, Clock, Star, Navigation, Zap, Coffee, ShoppingBag, Music, Utensils } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Place {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  description?: string;
  rating?: number;
  distance?: number;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  place_id?: string;
  latitude?: number;
  longitude?: number;
  place_name?: string;
  attendees: number;
  category: string;
  organizer_name?: string;
}

interface MapMarker {
  id: string;
  type: 'place' | 'event';
  latitude: number;
  longitude: number;
  name: string;
  data: Place | Event;
}

const UnifiedDiscoveryMap: React.FC = () => {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [filter, setFilter] = useState<'all' | 'places' | 'events'>('all');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const { user } = useAuth();

  // Mock Yanbu coordinates
  const yanbuCenter = { lat: 24.0895, lng: 38.0568 };

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          // Fallback to Yanbu center
          setUserLocation(yanbuCenter);
        }
      );
    } else {
      setUserLocation(yanbuCenter);
    }

    fetchPlacesAndEvents();
  }, []);

  const fetchPlacesAndEvents = async () => {
    try {
      // Fetch places
      const { data: places, error: placesError } = await supabase
        .from('places')
        .select('*')
        .eq('is_active', true);

      if (placesError) throw placesError;

      // Fetch events
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          place:places(name, latitude, longitude)
        `)
        .eq('is_active', true)
        .gte('start_time', new Date().toISOString());

      if (eventsError) throw eventsError;

      // Combine into markers
      const placeMarkers: MapMarker[] = (places || []).map(place => ({
        id: `place-${place.id}`,
        type: 'place' as const,
        latitude: place.latitude,
        longitude: place.longitude,
        name: place.name,
        data: place
      }));

      const eventMarkers: MapMarker[] = (events || []).map(event => ({
        id: `event-${event.id}`,
        type: 'event' as const,
        latitude: event.place?.latitude || yanbuCenter.lat,
        longitude: event.place?.longitude || yanbuCenter.lng,
        name: event.title,
        data: {
          ...event,
          place_name: event.place?.name,
          latitude: event.place?.latitude,
          longitude: event.place?.longitude,
          attendees: event.current_attendees || 0,
          category: event.title.toLowerCase().includes('coffee') ? 'food' : 
                   event.title.toLowerCase().includes('music') ? 'entertainment' : 'social'
        }
      }));

      setMarkers([...placeMarkers, ...eventMarkers]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load map data');
    }
  };

  const getMarkerIcon = (marker: MapMarker) => {
    if (marker.type === 'event') {
      const event = marker.data as Event;
      if (event.category === 'food') return Coffee;
      if (event.category === 'entertainment') return Music;
      return Calendar;
    } else {
      const place = marker.data as Place;
      if (place.type === 'restaurant') return Utensils;
      if (place.type === 'shop') return ShoppingBag;
      if (place.type === 'cafe') return Coffee;
      return MapPin;
    }
  };

  const getMarkerColor = (marker: MapMarker) => {
    if (marker.type === 'event') {
      return 'from-purple-500 to-pink-500';
    } else {
      const place = marker.data as Place;
      if (place.type === 'restaurant') return 'from-orange-500 to-red-500';
      if (place.type === 'shop') return 'from-blue-500 to-indigo-500';
      if (place.type === 'cafe') return 'from-amber-500 to-orange-500';
      return 'from-green-500 to-teal-500';
    }
  };

  const filteredMarkers = markers.filter(marker => {
    if (filter === 'all') return true;
    if (filter === 'places') return marker.type === 'place';
    if (filter === 'events') return marker.type === 'event';
    return true;
  });

  const formatEventTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Discover Yanbu
            </h1>
            <p className="text-muted-foreground text-sm">Places and events near you</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => {
              if (userLocation) {
                toast.success('Centered on your location');
              }
            }}
          >
            <Navigation className="w-4 h-4" />
            My Location
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'All', icon: Zap },
            { id: 'places', label: 'Places', icon: MapPin },
            { id: 'events', label: 'Events', icon: Calendar }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                filter === tab.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map Area */}
      <div className="relative p-4 space-y-4">
        {/* Interactive Map Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMarkers.map((marker) => {
            const IconComponent = getMarkerIcon(marker);
            const isEvent = marker.type === 'event';
            const data = marker.data;

            return (
              <Card
                key={marker.id}
                className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-0 bg-background/90 backdrop-blur-sm"
                onClick={() => setSelectedMarker(marker)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Marker Icon */}
                    <div className={`
                      w-12 h-12 rounded-xl bg-gradient-to-r ${getMarkerColor(marker)} 
                      flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200
                    `}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors duration-200 line-clamp-2">
                          {marker.name}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {isEvent ? 'Event' : 'Place'}
                        </Badge>
                      </div>

                      {isEvent ? (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {formatEventTime((data as Event).start_time)}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="w-3 h-3" />
                            {(data as Event).attendees} attending
                          </div>
                          {(data as Event).place_name && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              {(data as Event).place_name}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {(data as Place).description || 'Local business in Yanbu'}
                          </p>
                          {(data as Place).rating && (
                            <div className="flex items-center gap-1 text-xs">
                              <Star className="w-3 h-3 text-yellow-500 fill-current" />
                              <span className="text-muted-foreground">{(data as Place).rating}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-2 text-xs text-primary font-medium">
                        Tap to explore →
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredMarkers.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
              <MapPin className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">No {filter === 'all' ? 'items' : filter} found</h3>
              <p className="text-muted-foreground">Check back later for new discoveries</p>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedMarker && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full max-h-[80vh] overflow-hidden animate-scale-in">
            <CardContent className="p-0">
              {/* Header */}
              <div className={`
                relative p-6 bg-gradient-to-r ${getMarkerColor(selectedMarker)} text-white
              `}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {React.createElement(getMarkerIcon(selectedMarker), {
                      className: "w-8 h-8 text-white"
                    })}
                    <div>
                      <h2 className="text-xl font-bold">{selectedMarker.name}</h2>
                      <Badge className="bg-white/20 text-white border-white/30 mt-1">
                        {selectedMarker.type === 'event' ? 'Event' : 'Place'}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMarker(null)}
                    className="text-white hover:bg-white/20 w-8 h-8 rounded-full p-0"
                  >
                    ×
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {selectedMarker.type === 'event' ? (
                  <div className="space-y-3">
                    <p className="text-muted-foreground">
                      {(selectedMarker.data as Event).description || 'Join this exciting event in Yanbu!'}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-primary" />
                          <span className="font-medium">Time</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatEventTime((selectedMarker.data as Event).start_time)}
                        </p>
                      </div>
                      
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="w-4 h-4 text-primary" />
                          <span className="font-medium">Attendees</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(selectedMarker.data as Event).attendees} going
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button className="flex-1">
                        <Calendar className="w-4 h-4 mr-2" />
                        Join Event
                      </Button>
                      <Button variant="outline">
                        <Navigation className="w-4 h-4 mr-2" />
                        Directions
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-muted-foreground">
                      {(selectedMarker.data as Place).description || 'A great place to visit in Yanbu'}
                    </p>
                    
                    {(selectedMarker.data as Place).rating && (
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="font-medium">{(selectedMarker.data as Place).rating}</span>
                        <span className="text-muted-foreground text-sm">rating</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button className="flex-1">
                        <MapPin className="w-4 h-4 mr-2" />
                        Visit Place
                      </Button>
                      <Button variant="outline">
                        <Navigation className="w-4 h-4 mr-2" />
                        Directions
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UnifiedDiscoveryMap;
