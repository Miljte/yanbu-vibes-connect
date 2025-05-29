
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Lock, MessageSquare, Navigation } from 'lucide-react';
import { useLocation } from '@/hooks/useLocation';
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
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  // Custom minimal map style - removes all unnecessary elements
  const minimalistMapStyle = [
    {
      "featureType": "administrative",
      "elementType": "labels",
      "stylers": [{ "visibility": "off" }]
    },
    {
      "featureType": "administrative.land_parcel",
      "stylers": [{ "visibility": "off" }]
    },
    {
      "featureType": "administrative.neighborhood",
      "stylers": [{ "visibility": "off" }]
    },
    {
      "featureType": "poi",
      "stylers": [{ "visibility": "off" }]
    },
    {
      "featureType": "road",
      "elementType": "labels",
      "stylers": [{ "visibility": "off" }]
    },
    {
      "featureType": "road.arterial",
      "elementType": "labels",
      "stylers": [{ "visibility": "off" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "labels",
      "stylers": [{ "visibility": "off" }]
    },
    {
      "featureType": "road.local",
      "elementType": "labels",
      "stylers": [{ "visibility": "off" }]
    },
    {
      "featureType": "transit",
      "stylers": [{ "visibility": "off" }]
    },
    {
      "featureType": "water",
      "elementType": "labels",
      "stylers": [{ "visibility": "off" }]
    }
  ];

  useEffect(() => {
    if (ref.current && !map) {
      console.log('Creating clean Google Map instance');
      const newMap = new google.maps.Map(ref.current, {
        center,
        zoom,
        styles: minimalistMapStyle,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'cooperative',
        backgroundColor: '#f5f5f5',
      });
      
      setMap(newMap);
      console.log('Clean map created successfully');
    }
  }, [ref, map, center, zoom]);

  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    const newMarkers: google.maps.Marker[] = [];

    // Add user location marker (bright blue pulsing dot)
    if (userLocation) {
      const userMarker = new google.maps.Marker({
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
        animation: google.maps.Animation.BOUNCE,
      });
      
      // Stop animation after 2 seconds
      setTimeout(() => {
        userMarker.setAnimation(null);
      }, 2000);
      
      newMarkers.push(userMarker);
    }

    // Add only active merchant store markers
    places.filter(place => place.is_active).forEach(place => {
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
      });

      marker.addListener('click', () => {
        onPlaceClick(place);
        map.panTo({ lat: place.latitude, lng: place.longitude });
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);
    console.log('Added', newMarkers.length, 'markers to clean map');
  }, [map, places, userLocation, onPlaceClick]);

  return <div ref={ref} className="w-full h-full" style={{ minHeight: '100vh' }} />;
};

const render = (status: Status) => {
  switch (status) {
    case Status.LOADING:
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-foreground text-lg">Loading Clean Map...</div>
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

const CleanMap = () => {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const { location, calculateDistance } = useLocation();
  const { user } = useAuth();

  const googleMapsApiKey = 'AIzaSyCnHJ_b9LBpxdSOdE8jmVMmJd6Vdmm5u8o';
  const yanbuCenter: google.maps.LatLngLiteral = { lat: 24.0892, lng: 38.0618 };

  useEffect(() => {
    fetchActivePlaces();
    
    // Set up real-time subscription for places
    const placesSubscription = supabase
      .channel('places-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'places' }, 
        () => {
          console.log('Places updated, refreshing...');
          fetchActivePlaces();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(placesSubscription);
    };
  }, [location]);

  const fetchActivePlaces = async () => {
    try {
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      const placesWithDistance = data?.map(place => {
        let distance = null;
        if (location) {
          distance = calculateDistance(
            location.latitude,
            location.longitude,
            place.latitude,
            place.longitude
          );
        }
        return { ...place, distance };
      }) || [];

      setPlaces(placesWithDistance);
      console.log('Fetched', placesWithDistance.length, 'active places');
    } catch (error) {
      console.error('Error fetching places:', error);
      toast.error('Failed to load stores');
    }
  };

  const isNearby = (place: Place) => {
    return place.distance !== null && place.distance <= 500;
  };

  const handleJoinChat = (place: Place) => {
    if (isNearby(place)) {
      toast.success(`Joined ${place.name} chat!`);
      // Navigate to chat functionality will be handled by parent component
    } else {
      toast.error('Move closer to join the chat');
    }
  };

  const centerOnUser = () => {
    if (location) {
      toast.success('Centered on your location');
    } else {
      toast.error('Location not available');
    }
  };

  return (
    <div className="relative min-h-screen">
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
          center={location ? { lat: location.latitude, lng: location.longitude } : yanbuCenter}
          zoom={15}
          places={places}
          userLocation={location}
          onPlaceClick={setSelectedPlace}
        />
      </Wrapper>

      {/* Store Info Popup */}
      {selectedPlace && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <Card className="bg-background/95 backdrop-blur-sm border shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-foreground">{selectedPlace.name}</h3>
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

                {isNearby(selectedPlace) ? (
                  <Button 
                    onClick={() => handleJoinChat(selectedPlace)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Join Chat
                  </Button>
                ) : (
                  <Button 
                    disabled
                    className="w-full bg-gray-600 cursor-not-allowed"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Move closer to join chat
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CleanMap;
