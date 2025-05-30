import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Lock, MessageSquare, Navigation, Zap } from 'lucide-react';
import { useLocation } from '@/hooks/useLocation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { proximityNotifications } from '@/services/ProximityNotifications';
import { ModernMarker } from '@/components/map/ModernMarkers';

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
  const [pulsingMarkers, setPulsingMarkers] = useState<Set<string>>(new Set());

  // Enhanced map style with smooth colors
  const enhancedMapStyle = [
    {
      "featureType": "all",
      "elementType": "geometry",
      "stylers": [{ "color": "#f5f5f5" }]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [{ "color": "#c9e6ff" }]
    },
    {
      "featureType": "road",
      "elementType": "geometry",
      "stylers": [{ "color": "#ffffff" }]
    },
    {
      "featureType": "poi",
      "stylers": [{ "visibility": "off" }]
    }
  ];

  useEffect(() => {
    if (ref.current && !map) {
      console.log('Creating enhanced animated Google Map');
      const newMap = new google.maps.Map(ref.current, {
        center,
        zoom,
        styles: enhancedMapStyle,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'cooperative',
        backgroundColor: '#f0f8ff',
        mapTypeControl: false,
        streetViewControl: false,
      });
      
      setMap(newMap);
      console.log('Enhanced map created successfully');
    }
  }, [ref, map, center, zoom]);

  // Enhanced marker management with modern GPS markers
  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    const newMarkers: google.maps.Marker[] = [];

    // Add modern animated user location marker with multiple ripple effects
    if (userLocation) {
      const userMarker = new google.maps.Marker({
        position: { lat: userLocation.latitude, lng: userLocation.longitude },
        map,
        title: "Your Location",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#00BFFF',
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 4,
          scale: 15,
        },
        zIndex: 1000,
      });
      
      // Create multiple pulsing rings around user
      for (let i = 0; i < 3; i++) {
        const pulseMarker = new google.maps.Marker({
          position: { lat: userLocation.latitude, lng: userLocation.longitude },
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#00BFFF',
            fillOpacity: 0.1 - (i * 0.03),
            strokeColor: '#00BFFF',
            strokeWeight: 2,
            scale: 30 + (i * 10),
          },
          zIndex: 999 - i,
        });
        newMarkers.push(pulseMarker);
      }
      
      newMarkers.push(userMarker);
    }

    // Add enhanced store markers with modern GPS styling
    places.filter(place => place.is_active).forEach(place => {
      const isNearby = place.distance !== undefined && place.distance <= 200;
      const isCloseBy = place.distance !== undefined && place.distance <= 500;
      
      let iconColor = '#FF6B35';
      let iconScale = 18;
      let strokeWeight = 3;
      
      if (isNearby) {
        iconColor = '#00FF00';
        iconScale = 25;
        strokeWeight = 5;
      } else if (isCloseBy) {
        iconColor = '#FFA500';
        iconScale = 22;
        strokeWeight = 4;
      }
      
      const marker = new google.maps.Marker({
        position: { lat: place.latitude, lng: place.longitude },
        map,
        title: place.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: iconColor,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: strokeWeight,
          scale: iconScale,
        },
        zIndex: isNearby ? 800 : isCloseBy ? 700 : 500,
      });

      // Add pulsing animation for nearby places
      if (isNearby) {
        setPulsingMarkers(prev => new Set(prev).add(place.id));
        
        // Trigger proximity notification
        proximityNotifications.checkNearbyPlaces([place], userLocation!);
      }

      // Enhanced click interaction with haptic feedback
      marker.addListener('click', () => {
        onPlaceClick(place);
        
        // Animate map to center on clicked place
        map.panTo({ lat: place.latitude, lng: place.longitude });
        
        // Temporary highlight effect with modern styling
        const originalIcon = marker.getIcon();
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#FFD700',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 6,
          scale: 28,
        });
        
        setTimeout(() => {
          marker.setIcon(originalIcon);
        }, 1000);
        
        // Haptic feedback
        proximityNotifications.vibrate();
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);
    console.log('Added', newMarkers.length, 'enhanced modern markers to map');
  }, [map, places, userLocation, onPlaceClick]);

  return <div ref={ref} className="w-full h-full" style={{ minHeight: '100vh' }} />;
};

const render = (status: Status) => {
  switch (status) {
    case Status.LOADING:
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-foreground text-lg animate-pulse">Loading Enhanced Map...</div>
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

const AnimatedMap = () => {
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
      
      // Check for proximity notifications
      if (location) {
        proximityNotifications.checkNearbyPlaces(placesWithDistance, location);
      }
    } catch (error) {
      console.error('Error fetching places:', error);
      toast.error('Failed to load stores');
    }
  };

  const isNearby = (place: Place) => {
    return place.distance !== null && place.distance <= 500;
  };

  const isVeryClose = (place: Place) => {
    return place.distance !== null && place.distance <= 200;
  };

  const handleJoinChat = (place: Place) => {
    if (isNearby(place)) {
      toast.success(`🎉 Joined ${place.name} chat!`);
      proximityNotifications.vibrate();
      // Navigate to chat functionality will be handled by parent component
    } else {
      toast.error('Move closer to join the chat');
    }
  };

  const centerOnUser = () => {
    if (location) {
      toast.success('🎯 Centered on your location');
      proximityNotifications.vibrate();
    } else {
      toast.error('Location not available');
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Enhanced floating controls */}
      <div className="absolute top-4 right-4 z-10 space-y-2">
        <Button
          onClick={centerOnUser}
          size="sm"
          className="bg-primary hover:bg-primary/90 shadow-lg backdrop-blur-sm bg-white/90 text-foreground border hover:scale-105 transition-transform"
        >
          <Navigation className="w-4 h-4" />
        </Button>
        
        {/* Location accuracy indicator */}
        {location && (
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-2 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>GPS Active</span>
            </div>
          </div>
        )}
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

      {/* Enhanced Store Info Popup */}
      {selectedPlace && (
        <div className="absolute bottom-4 left-4 right-4 z-10 animate-slide-in-right">
          <Card className="bg-background/95 backdrop-blur-md border shadow-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-foreground flex items-center space-x-2">
                  <span>{selectedPlace.name}</span>
                  {isVeryClose(selectedPlace) && (
                    <Zap className="w-4 h-4 text-green-500 animate-pulse" />
                  )}
                </h3>
                <button
                  onClick={() => setSelectedPlace(null)}
                  className="text-muted-foreground hover:text-foreground text-xl transition-colors"
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
                  {isVeryClose(selectedPlace) && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Very Close!
                    </span>
                  )}
                </div>

                {isNearby(selectedPlace) ? (
                  <Button 
                    onClick={() => handleJoinChat(selectedPlace)}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {isVeryClose(selectedPlace) ? '🔥 Join Hot Chat!' : 'Join Chat'}
                  </Button>
                ) : (
                  <Button 
                    disabled
                    className="w-full bg-gray-600 cursor-not-allowed opacity-60"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Move closer to join chat
                    <span className="text-xs ml-2">
                      ({selectedPlace.distance ? Math.round(selectedPlace.distance - 500) : '?'}m more)
                    </span>
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

export default AnimatedMap;
