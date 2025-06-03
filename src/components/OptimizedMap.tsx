
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation } from 'lucide-react';
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

  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new google.maps.Map(ref.current, {
        center,
        zoom,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'cooperative',
      });
      
      setMap(newMap);
      console.log('🗺️ Map initialized');
    }
  }, [ref, map, center, zoom]);

  // Clear all markers and add only store markers
  useEffect(() => {
    if (!map) return;

    console.log('🏪 Adding store markers:', places.length);

    // Clear all existing markers
    markersRef.current.forEach((marker) => {
      marker.setMap(null);
    });
    markersRef.current.clear();

    // Add user location marker if available
    if (userLocation) {
      const userMarker = new google.maps.Marker({
        position: { lat: userLocation.latitude, lng: userLocation.longitude },
        map,
        title: "Your Location",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
          scale: 10,
        },
        zIndex: 1000,
      });
      markersRef.current.set('user-location', userMarker);
    }

    // Add store markers
    places.forEach(place => {
      if (!place.is_active) return;

      console.log('📍 Adding store marker:', place.name, 'at', place.latitude, place.longitude);
      
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
          scale: 15,
        },
        zIndex: 500,
      });

      marker.addListener('click', () => {
        console.log('🎯 Store marker clicked:', place.name);
        onPlaceClick(place);
      });

      markersRef.current.set(place.id, marker);
    });

    console.log('✅ Total markers on map:', markersRef.current.size);
  }, [map, places, userLocation, onPlaceClick]);

  return <div ref={ref} className="w-full h-full" style={{ minHeight: '100vh' }} />;
};

const render = (status: Status) => {
  switch (status) {
    case Status.LOADING:
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-foreground text-lg">Loading Map...</div>
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

  // Fetch stores
  const fetchStores = async () => {
    try {
      console.log('🔄 Fetching stores...');
      
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('❌ Error fetching stores:', error);
        throw error;
      }
      
      console.log('✅ Stores fetched:', data?.length || 0, data);
      setPlaces(data || []);
    } catch (error) {
      console.error('❌ Error fetching stores:', error);
      toast.error('Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  // Get user location
  const getUserLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        console.log('📍 User location set:', position.coords.latitude, position.coords.longitude);
      },
      (error) => console.error('Location error:', error),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  useEffect(() => {
    fetchStores();
    getUserLocation();
  }, []);

  // Real-time updates for places
  useEffect(() => {
    console.log('🔔 Setting up real-time subscription...');
    
    const subscription = supabase
      .channel('places-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'places' }, 
        (payload) => {
          console.log('🔄 Real-time update:', payload);
          fetchStores();
        }
      )
      .subscribe();

    return () => {
      console.log('🔔 Cleaning up subscription');
      supabase.removeChannel(subscription);
    };
  }, []);

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
      {/* Stats */}
      <div className="absolute top-4 left-4 z-10">
        <Card className="bg-background/90 backdrop-blur-sm">
          <CardContent className="p-2">
            <div className="text-xs text-muted-foreground">
              <div>Stores: {places.length}</div>
              <div>Active: {places.filter(p => p.is_active).length}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Center button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          onClick={centerOnUser}
          size="sm"
          className="bg-primary hover:bg-primary/90 shadow-lg"
        >
          <Navigation className="w-4 h-4" />
        </Button>
      </div>

      <Wrapper apiKey={googleMapsApiKey} render={render}>
        <MapComponent
          center={userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : jeddahCenter}
          zoom={13}
          places={places}
          userLocation={userLocation}
          onPlaceClick={setSelectedPlace}
        />
      </Wrapper>

      {/* Place popup */}
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
                <p className="text-sm text-muted-foreground capitalize">
                  {selectedPlace.type}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OptimizedMap;
