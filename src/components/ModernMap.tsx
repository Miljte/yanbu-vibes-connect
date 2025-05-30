import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Users, MessageSquare, Lock, Languages } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import RealTimeProximityChat from './RealTimeProximityChat';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHighAccuracyLocation } from '@/hooks/useHighAccuracyLocation';
import { toast } from 'sonner';
import { useLocalization } from '@/contexts/LocalizationContext';
import CategoryFilter from './CategoryFilter';
import GeofenceStatus from './GeofenceStatus';

interface Place {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  merchant_id: string;
  description?: string;
  images?: string[];
  distance?: number;
}

interface MapComponentProps {
  center: google.maps.LatLngLiteral;
  zoom: number;
  places: Place[];
  userLocation: { latitude: number; longitude: number } | null;
  onPlaceClick: (place: Place) => void;
  selectedCategory: string;
  canAccessChat: (placeLocation: { latitude: number; longitude: number }) => boolean;
}

const MapComponent: React.FC<MapComponentProps> = React.memo(({
  center,
  zoom,
  places,
  userLocation,
  onPlaceClick,
  selectedCategory,
  canAccessChat,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());

  // Yanbu city bounds - restricting map movement to Yanbu area only
  const yanbuBounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(23.9000, 37.9500), // Southwest corner
    new google.maps.LatLng(24.2500, 38.3000)  // Northeast corner
  );

  // Clean map style optimized for mobile
  const optimizedMapStyle = [
    {
      "featureType": "administrative",
      "stylers": [{ "visibility": "simplified" }]
    },
    {
      "featureType": "poi",
      "elementType": "labels",
      "stylers": [{ "visibility": "off" }]
    },
    {
      "featureType": "road",
      "elementType": "labels.icon",
      "stylers": [{ "visibility": "off" }]
    },
    {
      "featureType": "transit",
      "stylers": [{ "visibility": "off" }]
    }
  ];

  const getMarkerIcon = useCallback((type: string) => {
    const iconConfig = {
      'cafe': { color: '#8B4513', emoji: '☕' },
      'restaurant': { color: '#FF6347', emoji: '🍽️' },
      'shop': { color: '#4169E1', emoji: '🛍️' },
      'event': { color: '#FF69B4', emoji: '🎉' },
    };

    const config = iconConfig[type] || { color: '#666666', emoji: '📍' };
    
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: config.color,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 14,
      anchor: new google.maps.Point(0, 0)
    };
  }, []);

  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new google.maps.Map(ref.current, {
        center,
        zoom,
        minZoom: 11,
        maxZoom: 19,
        restriction: {
          latLngBounds: yanbuBounds,
          strictBounds: true,
        },
        styles: optimizedMapStyle,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'cooperative',
        backgroundColor: '#f8fafc',
        clickableIcons: false,
      });
      
      setMap(newMap);
    }
  }, [center, zoom]);

  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current.clear();

    // Add user location marker with high visibility
    if (userLocation) {
      const userMarker = new google.maps.Marker({
        position: { lat: userLocation.latitude, lng: userLocation.longitude },
        map,
        title: "Your Location",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#3B82F6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
          scale: 15,
          anchor: new google.maps.Point(0, 0)
        },
        zIndex: 1000,
        optimized: true,
        animation: google.maps.Animation.BOUNCE
      });
      
      // Stop bounce after 2 seconds
      setTimeout(() => {
        userMarker.setAnimation(null);
      }, 2000);
      
      markersRef.current.set('user-location', userMarker);
    }

    // Filter and add place markers with chat access indication
    const filteredPlaces = selectedCategory === 'all' 
      ? places.filter(place => place.is_active)
      : places.filter(place => place.is_active && place.type === selectedCategory);

    filteredPlaces.forEach((place, index) => {
      const hasChat = canAccessChat({ latitude: place.latitude, longitude: place.longitude });
      
      setTimeout(() => {
        const marker = new google.maps.Marker({
          position: { lat: place.latitude, lng: place.longitude },
          map,
          title: place.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: hasChat ? '#22c55e' : '#ef4444', // Green if chat accessible, red otherwise
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: hasChat ? 18 : 14, // Larger if chat accessible
            anchor: new google.maps.Point(0, 0)
          },
          zIndex: 500,
          optimized: true,
          animation: google.maps.Animation.DROP
        });

        marker.addListener('click', () => {
          onPlaceClick(place);
          map.panTo({ lat: place.latitude, lng: place.longitude });
        });

        markersRef.current.set(place.id, marker);
      }, index * 50); // Smooth sequential animation
    });
  }, [map, places, userLocation, onPlaceClick, selectedCategory, canAccessChat]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current.clear();
    };
  }, []);

  return <div ref={ref} className="w-full h-full" style={{ minHeight: '100vh' }} />;
});

const render = (status: Status) => {
  const { t } = useLocalization();
  
  switch (status) {
    case Status.LOADING:
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-foreground text-lg">{t('common.loading')}</div>
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

const ModernMap = () => {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showChat, setShowChat] = useState(false);
  
  // Use new high-accuracy location hook
  const {
    location,
    isTracking,
    error: locationError,
    geofenceStatus,
    canAccessChat,
    checkProximityToPlace,
    calculateDistance
  } = useHighAccuracyLocation();
  
  const { user } = useAuth();
  const { t, language, setLanguage, isRTL } = useLocalization();

  const googleMapsApiKey = 'AIzaSyCnHJ_b9LBpxdSOdE8jmVMmJd6Vdmm5u8o';
  const yanbuCenter: google.maps.LatLngLiteral = { lat: 24.0892, lng: 38.0618 };

  // All useEffect hooks must be called consistently
  useEffect(() => {
    if (geofenceStatus?.isInYanbu) {
      fetchActivePlaces();
    }
  }, [geofenceStatus?.isInYanbu, location]);

  useEffect(() => {
    if (geofenceStatus?.isInYanbu) {
      const placesSubscription = supabase
        .channel('places-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'places' }, 
          () => {
            fetchActivePlaces();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(placesSubscription);
      };
    }
  }, [geofenceStatus?.isInYanbu]);

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
    } catch (error) {
      console.error('Error fetching places:', error);
      toast.error('Failed to load stores');
    }
  };

  const handleJoinChat = (place: Place) => {
    if (canAccessChat({ latitude: place.latitude, longitude: place.longitude })) {
      console.log('🎯 Opening chat for:', place.name);
      setShowChat(true);
      toast.success(`Opening chat for ${place.name}!`);
    } else {
      const distance = checkProximityToPlace({ latitude: place.latitude, longitude: place.longitude });
      toast.error(`Move closer to join chat (${Math.round(distance)}m away)`);
    }
  };

  const centerOnUser = () => {
    if (location) {
      toast.success('Centered on your location');
    } else {
      toast.error('Location not available');
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  const formatDistance = (distance: number) => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  };

  // Calculate nearby places and chat unlocked places
  const nearbyPlacesForChat = places
    .filter(place => place.distance !== null && place.distance <= 5000)
    .map(place => ({
      id: place.id,
      name: place.name,
      distance: place.distance || 0,
      type: place.type
    }));
    
  const chatUnlockedPlaces = new Set(
    places.filter(place => canAccessChat({ latitude: place.latitude, longitude: place.longitude })).map(p => p.id)
  );

  // NOW handle conditional rendering AFTER all hooks are called
  if (geofenceStatus && !geofenceStatus.isInYanbu) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold mb-4">Location Restricted</h2>
            <p className="text-muted-foreground mb-4">
              This app is only available in Yanbu, Saudi Arabia. You are currently {(geofenceStatus.distanceFromCenter / 1000).toFixed(1)}km from Yanbu city center.
            </p>
            <GeofenceStatus 
              geofenceStatus={geofenceStatus}
              isTracking={isTracking}
              error={locationError}
              accuracy={location?.accuracy}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show chat interface when requested
  if (showChat) {
    const nearbyPlacesForChat = places
      .filter(place => place.distance !== null && place.distance <= 5000)
      .map(place => ({
        id: place.id,
        name: place.name,
        distance: place.distance || 0,
        type: place.type
      }));
      
    const chatUnlockedPlaces = new Set(
      places.filter(place => canAccessChat({ latitude: place.latitude, longitude: place.longitude })).map(p => p.id)
    );

    return (
      <div className="min-h-screen bg-background p-4">
        <Button
          variant="outline"
          onClick={() => setShowChat(false)}
          className="mb-4"
        >
          ← Back to Map
        </Button>
        <RealTimeProximityChat 
          nearbyPlaces={nearbyPlacesForChat}
          chatUnlockedPlaces={chatUnlockedPlaces}
          userLocation={location}
        />
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Geofence Status */}
      <div className="absolute top-4 left-4 z-20">
        <GeofenceStatus 
          geofenceStatus={geofenceStatus}
          isTracking={isTracking}
          error={locationError}
          accuracy={location?.accuracy}
        />
      </div>

      {/* Category Filter */}
      <CategoryFilter 
        selectedCategory={selectedCategory} 
        onCategoryChange={setSelectedCategory} 
      />

      {/* Control buttons */}
      <div className="absolute top-20 right-4 z-10 flex flex-col space-y-2">
        <Button
          onClick={() => {
            if (location) {
              toast.success('Centered on your location');
            } else {
              toast.error('Location not available');
            }
          }}
          size="sm"
          className="bg-background hover:bg-muted text-foreground shadow-lg border"
        >
          <Navigation className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          size="sm"
          className="bg-background hover:bg-muted text-foreground shadow-lg border"
        >
          <Languages className="w-4 h-4" />
          <span className="ml-1 text-xs">{language.toUpperCase()}</span>
        </Button>
      </div>

      <Wrapper apiKey={googleMapsApiKey} render={render} libraries={['places']}>
        <MapComponent
          center={location ? { lat: location.latitude, lng: location.longitude } : yanbuCenter}
          zoom={14}
          places={places}
          userLocation={location}
          onPlaceClick={setSelectedPlace}
          selectedCategory={selectedCategory}
          canAccessChat={canAccessChat}
        />
      </Wrapper>

      {/* Enhanced Store Info Popup */}
      {selectedPlace && (
        <div className="absolute bottom-20 left-4 right-4 z-10">
          <Card className="bg-background/95 backdrop-blur-md border-0 shadow-xl rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-xl font-bold text-foreground">{selectedPlace.name}</h3>
                    <Badge variant="secondary" className="capitalize">
                      {selectedPlace.type}
                    </Badge>
                  </div>
                  
                  {selectedPlace.description && (
                    <p className="text-muted-foreground text-sm mb-3">{selectedPlace.description}</p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>
                        {selectedPlace.distance 
                          ? `${Math.round(selectedPlace.distance)}m away`
                          : 'Distance unknown'
                        }
                      </span>
                    </div>
                    <Badge 
                      variant={canAccessChat({ latitude: selectedPlace.latitude, longitude: selectedPlace.longitude }) ? "default" : "secondary"}
                      className={canAccessChat({ latitude: selectedPlace.latitude, longitude: selectedPlace.longitude }) ? "bg-green-600" : ""}
                    >
                      {canAccessChat({ latitude: selectedPlace.latitude, longitude: selectedPlace.longitude }) ? 'Chat Available' : 'Too Far for Chat'}
                    </Badge>
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedPlace(null)}
                  className="text-muted-foreground hover:text-foreground text-2xl font-light ml-2 absolute top-2 right-2"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-3">
                {canAccessChat({ latitude: selectedPlace.latitude, longitude: selectedPlace.longitude }) ? (
                  <Button 
                    onClick={() => handleJoinChat(selectedPlace)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3"
                  >
                    <MessageSquare className="w-5 h-5 mr-2" />
                    {t('map.joinChat')}
                  </Button>
                ) : (
                  <Button 
                    disabled
                    className="w-full bg-muted cursor-not-allowed text-muted-foreground rounded-xl py-3"
                  >
                    <Lock className="w-5 h-5 mr-2" />
                    Move within 500m to chat
                  </Button>
                )}

                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    📍 Directions
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    📞 Call
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ModernMap;
