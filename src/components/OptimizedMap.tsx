
import React, { useState, useEffect, useRef } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLocationTracking } from '@/hooks/useLocationTracking';

interface Place {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  merchant_id: string;
  address?: string;
  description?: string;
}

interface MapComponentProps {
  center: google.maps.LatLngLiteral;
  zoom: number;
  places: Place[];
  onPlaceClick: (place: Place) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({ center, zoom, places, onPlaceClick }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new google.maps.Map(ref.current, {
        center,
        zoom,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      
      setMap(newMap);
      console.log('🗺️ Map initialized at:', center);
    }
  }, [ref, map, center, zoom]);

  useEffect(() => {
    if (!map || !places) return;

    console.log('📍 Adding markers for places:', places.length);

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add store markers
    places.forEach(place => {
      if (!place.is_active) {
        console.log('⏸️ Skipping inactive place:', place.name);
        return;
      }

      console.log('📍 Creating marker for:', place.name, 'at', place.latitude, place.longitude);
      
      const marker = new google.maps.Marker({
        position: { lat: Number(place.latitude), lng: Number(place.longitude) },
        map,
        title: place.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#FF6B35',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
          scale: 12,
        },
      });

      marker.addListener('click', () => {
        console.log('🎯 Marker clicked:', place.name);
        onPlaceClick(place);
      });

      markersRef.current.push(marker);
    });

    console.log('✅ Total markers created:', markersRef.current.length);
  }, [map, places, onPlaceClick]);

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
          <Card className="bg-card border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">Map Error</h2>
              <p className="text-muted-foreground">Failed to load map. Please refresh the page.</p>
            </CardContent>
          </Card>
        </div>
      );
    default:
      return null;
  }
};

const OptimizedMap = () => {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  // Use location tracking hook
  useLocationTracking();

  const googleMapsApiKey = 'AIzaSyCnHJ_b9LBpxdSOdE8jmVMmJd6Vdmm5u8o';
  const jeddahCenter: google.maps.LatLngLiteral = { lat: 21.5433, lng: 39.1728 };

  // Fetch stores from database
  const fetchStores = async () => {
    try {
      console.log('🔄 Fetching stores from database...');
      
      const { data, error } = await supabase
        .from('places')
        .select(`
          id,
          name,
          type,
          latitude,
          longitude,
          is_active,
          merchant_id,
          address,
          description
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }
      
      console.log('✅ Database response:', data);
      console.log('✅ Number of active stores found:', data?.length || 0);
      
      if (data && data.length > 0) {
        data.forEach(place => {
          console.log(`📍 Store: ${place.name} at lat:${place.latitude}, lng:${place.longitude}, type:${place.type}`);
        });
        setPlaces(data);
      } else {
        console.log('⚠️ No active stores found in database');
        setPlaces([]);
      }
    } catch (error) {
      console.error('❌ Error fetching stores:', error);
      toast.error('Failed to load stores from database');
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();

    // Set up real-time subscription for new stores
    const channel = supabase
      .channel('places_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'places' 
      }, (payload) => {
        console.log('🔄 Real-time update:', payload);
        fetchStores(); // Refetch when changes occur
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-lg">Loading stores...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Debug Stats */}
      <div className="absolute top-4 left-4 z-10">
        <Card className="bg-background/90 backdrop-blur-sm">
          <CardContent className="p-3">
            <div className="text-sm text-foreground">
              <div><strong>Database Status:</strong> Connected</div>
              <div><strong>Active Stores:</strong> {places.length}</div>
              <div><strong>Map Status:</strong> {places.length > 0 ? 'Showing Markers' : 'No Markers'}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Wrapper apiKey={googleMapsApiKey} render={render}>
        <MapComponent
          center={jeddahCenter}
          zoom={12}
          places={places}
          onPlaceClick={setSelectedPlace}
        />
      </Wrapper>

      {/* Store Details Popup */}
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
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground capitalize">
                  Type: {selectedPlace.type}
                </p>
                {selectedPlace.address && (
                  <p className="text-sm text-muted-foreground">
                    Address: {selectedPlace.address}
                  </p>
                )}
                {selectedPlace.description && (
                  <p className="text-sm text-muted-foreground">
                    {selectedPlace.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OptimizedMap;
