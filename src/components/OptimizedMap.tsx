
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, MessageSquare, Navigation, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Place {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  merchant_id: string;
  distance?: number;
  count?: number;
  places?: Place[];
}

interface MapComponentProps {
  center: google.maps.LatLngLiteral;
  zoom: number;
  places: Place[];
  userLocation: { latitude: number; longitude: number } | null;
  onPlaceClick: (place: Place) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({
  center,
  zoom,
  places,
  userLocation,
  onPlaceClick,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const userMarkerRef = useRef<google.maps.Marker | null>(null);

  // Optimized map style
  const optimizedMapStyle = [
    {
      "featureType": "poi",
      "stylers": [{ "visibility": "off" }]
    },
    {
      "featureType": "road",
      "elementType": "labels",
      "stylers": [{ "visibility": "simplified" }]
    }
  ];

  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new google.maps.Map(ref.current, {
        center,
        zoom,
        styles: optimizedMapStyle,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'cooperative',
        backgroundColor: '#f5f5f5',
        restriction: {
          latLngBounds: {
            north: 24.2,
            south: 23.9,
            west: 38.0,
            east: 38.3,
          },
        },
      });
      
      setMap(newMap);
    }
  }, [ref, map, center, zoom]);

  // Simple marker management - just show all active places
  const updateMarkers = useCallback(() => {
    if (!map) return;

    console.log('📍 Updating markers for places:', places.length);

    const existingMarkers = markersRef.current;
    const activePlaces = places.filter(place => place.is_active);
    
    console.log('📍 Active places to show:', activePlaces.length);

    // Clear existing store markers
    existingMarkers.forEach((marker, id) => {
      if (id !== 'user-location') {
        marker.setMap(null);
        existingMarkers.delete(id);
      }
    });

    // Add markers for all active places
    activePlaces.forEach(place => {
      console.log('🎯 Creating marker for:', place.name, 'at', place.latitude, place.longitude);
      
      const marker = new google.maps.Marker({
        position: { lat: place.latitude, lng: place.longitude },
        map,
        title: place.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#FF6B35',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
          scale: 18,
        },
        zIndex: 500,
        optimized: true,
      });

      marker.addListener('click', () => {
        console.log('📍 Marker clicked:', place.name);
        onPlaceClick(place);
        map.panTo({ lat: place.latitude, lng: place.longitude });
      });

      existingMarkers.set(place.id, marker);
    });

    console.log('📍 Total markers on map:', existingMarkers.size);
  }, [map, places, onPlaceClick]);

  // Update user location marker
  useEffect(() => {
    if (!map || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition({
        lat: userLocation.latitude,
        lng: userLocation.longitude
      });
    } else {
      userMarkerRef.current = new google.maps.Marker({
        position: { lat: userLocation.latitude, lng: userLocation.longitude },
        map,
        title: "Your Location",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#1E90FF',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 4,
          scale: 12,
        },
        zIndex: 1000,
        optimized: true,
      });
      
      markersRef.current.set('user-location', userMarkerRef.current);
    }
  }, [map, userLocation]);

  // Update markers when places change
  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  return <div ref={ref} className="w-full h-full" style={{ minHeight: '100vh' }} />;
};

const render = (status: Status) => {
  switch (status) {
    case Status.LOADING:
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-foreground text-lg">Loading Optimized Map...</div>
        </div>
      );
    case Status.FAILURE:
      return (
        <div className="min-h-screen bg-background p-4">
          <div className="container mx-auto max-w-2xl">
            <Card className="bg-card border">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-foreground mb-4">Map Error</h2>
                <p className="text-muted-foreground">Failed to load map. Please refresh the page.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    default:
      return null;
  }
};

const OptimizedMap = () => {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const googleMapsApiKey = 'AIzaSyCnHJ_b9LBpxdSOdE8jmVMmJd6Vdmm5u8o';
  const jeddahCenter: google.maps.LatLngLiteral = { lat: 21.5433, lng: 39.1728 };

  useEffect(() => {
    fetchActivePlaces();
    startLocationTracking();
  }, []);

  // Add real-time subscription for place changes
  useEffect(() => {
    console.log('🔔 Setting up real-time subscription for places...');
    
    const placesSubscription = supabase
      .channel('places-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'places' }, 
        (payload) => {
          console.log('🔄 Real-time places update:', payload);
          fetchActivePlaces(); // Refetch when places change
        }
      )
      .subscribe();

    return () => {
      console.log('🔔 Cleaning up real-time subscription');
      supabase.removeChannel(placesSubscription);
    };
  }, []);

  const fetchActivePlaces = async () => {
    try {
      console.log('🔄 Fetching ALL active places for map...');
      
      // Fetch ALL active places from ALL merchants, not just current user
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      
      console.log('✅ Active places loaded for map:', data?.length || 0, data);
      setPlaces(data || []);
    } catch (error) {
      console.error('❌ Error fetching places for map:', error);
      toast.error('Failed to load stores on map');
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation) return;

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    };

    navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => console.error('Location error:', error),
      options
    );
  };

  const centerOnUser = () => {
    if (userLocation) {
      toast.success('Centered on your location');
    } else {
      toast.error('Location not available');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <div className="text-foreground text-lg">Loading stores...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Performance stats */}
      <div className="absolute top-4 left-4 z-10">
        <Card className="bg-background/90 backdrop-blur-sm">
          <CardContent className="p-2">
            <div className="text-xs text-muted-foreground">
              <div>Total Places: {places.length}</div>
              <div>Active: {places.filter(p => p.is_active).length}</div>
              <div>Status: {loading ? 'Loading...' : 'Ready'}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Center on user button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          onClick={centerOnUser}
          size="sm"
          className="bg-primary hover:bg-primary/90 shadow-lg"
        >
          <Navigation className="w-4 h-4" />
        </Button>
      </div>

      <Wrapper apiKey={googleMapsApiKey} render={render} libraries={['places']}>
        <MapComponent
          center={userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : jeddahCenter}
          zoom={13}
          places={places}
          userLocation={userLocation}
          onPlaceClick={setSelectedPlace}
        />
      </Wrapper>

      {/* Place info popup */}
      {selectedPlace && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <Card className="bg-background/95 backdrop-blur-sm border shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-foreground">
                  {selectedPlace.name}
                </h3>
                <button
                  onClick={() => setSelectedPlace(null)}
                  className="text-muted-foreground hover:text-foreground text-xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">
                    {selectedPlace.distance 
                      ? `${Math.round(selectedPlace.distance)}m away`
                      : 'Distance unknown'
                    }
                  </span>
                </div>

                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Join Chat
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OptimizedMap;
