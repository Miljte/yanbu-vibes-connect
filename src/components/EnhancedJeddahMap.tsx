
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, MessageSquare, Lock, RefreshCw, ZoomIn, ZoomOut, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useJeddahLocationCheck } from '@/hooks/useJeddahLocationCheck';
import { useEnhancedLocation } from '@/hooks/useEnhancedLocation';
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
  jeddahBounds: { southwest: { lat: number; lng: number }; northeast: { lat: number; lng: number } };
  onPlaceClick: (place: Place) => void;
  isDarkMode: boolean;
}

const MapComponent: React.FC<MapComponentProps> = React.memo(({
  center,
  zoom,
  places,
  userLocation,
  jeddahBounds,
  onPlaceClick,
  isDarkMode,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());

  // Jeddah city bounds for map restriction
  const jeddahMapBounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(jeddahBounds.southwest.lat, jeddahBounds.southwest.lng),
    new google.maps.LatLng(jeddahBounds.northeast.lat, jeddahBounds.northeast.lng)
  );

  // Modern Jeddah map styles with dark/light mode support
  const lightMapStyle = [
    {
      "featureType": "administrative",
      "elementType": "geometry.stroke",
      "stylers": [{ "color": "#e0e0e0" }]
    },
    {
      "featureType": "landscape.natural",
      "elementType": "geometry",
      "stylers": [{ "color": "#f5f5f5" }]
    },
    {
      "featureType": "poi.park",
      "elementType": "geometry.fill",
      "stylers": [{ "color": "#c8e6c9" }]
    },
    {
      "featureType": "road",
      "elementType": "geometry",
      "stylers": [{ "color": "#ffffff" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry",
      "stylers": [{ "color": "#ffcc02" }]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [{ "color": "#64b5f6" }]
    }
  ];

  const darkMapStyle = [
    {
      "elementType": "geometry",
      "stylers": [{ "color": "#1a1a1a" }]
    },
    {
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#ffffff" }]
    },
    {
      "elementType": "labels.text.stroke",
      "stylers": [{ "color": "#1a1a1a" }]
    },
    {
      "featureType": "administrative",
      "elementType": "geometry.stroke",
      "stylers": [{ "color": "#404040" }]
    },
    {
      "featureType": "landscape.natural",
      "elementType": "geometry",
      "stylers": [{ "color": "#2d2d2d" }]
    },
    {
      "featureType": "poi.park",
      "elementType": "geometry.fill",
      "stylers": [{ "color": "#1b5e20" }]
    },
    {
      "featureType": "road",
      "elementType": "geometry",
      "stylers": [{ "color": "#404040" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry",
      "stylers": [{ "color": "#ff6f00" }]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [{ "color": "#1565c0" }]
    }
  ];

  useEffect(() => {
    if (ref.current && !map) {
      console.log('🗺️ Creating enhanced Jeddah map...');
      const newMap = new google.maps.Map(ref.current, {
        center,
        zoom,
        minZoom: 11,
        maxZoom: 20,
        restriction: {
          latLngBounds: jeddahMapBounds,
          strictBounds: true,
        },
        styles: isDarkMode ? darkMapStyle : lightMapStyle,
        disableDefaultUI: true,
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: 'cooperative',
        backgroundColor: isDarkMode ? '#1a1a1a' : '#f8fafc',
        clickableIcons: false,
      });
      
      setMap(newMap);
      console.log('✅ Enhanced Jeddah map created');
    }
  }, [center, zoom, jeddahMapBounds, isDarkMode]);

  // Update map style when theme changes
  useEffect(() => {
    if (map) {
      map.setOptions({
        styles: isDarkMode ? darkMapStyle : lightMapStyle,
        backgroundColor: isDarkMode ? '#1a1a1a' : '#f8fafc',
      });
    }
  }, [map, isDarkMode]);

  const getMarkerIcon = useCallback((type: string, isNearby: boolean = false) => {
    const iconConfig = {
      'cafe': { color: isNearby ? '#4ade80' : '#8B4513', scale: isNearby ? 22 : 18 },
      'restaurant': { color: isNearby ? '#4ade80' : '#ff6347', scale: isNearby ? 22 : 18 },
      'shop': { color: isNearby ? '#4ade80' : '#3b82f6', scale: isNearby ? 22 : 18 },
      'event': { color: isNearby ? '#4ade80' : '#ec4899', scale: isNearby ? 22 : 18 },
    };

    const config = iconConfig[type] || { color: isNearby ? '#4ade80' : '#6b7280', scale: isNearby ? 22 : 18 };
    
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: config.color,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: isNearby ? 4 : 3,
      scale: config.scale,
    };
  }, []);

  useEffect(() => {
    if (!map) return;

    const updateMarkers = () => {
      // Add enhanced user location marker
      if (userLocation && !markersRef.current.has('user-location')) {
        const userMarker = new google.maps.Marker({
          position: { lat: userLocation.latitude, lng: userLocation.longitude },
          map,
          title: "Your Location in Jeddah",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#3b82f6',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 4,
            scale: 16,
          },
          zIndex: 1000,
          optimized: true,
          animation: google.maps.Animation.DROP
        });
        
        markersRef.current.set('user-location', userMarker);
      } else if (userLocation && markersRef.current.has('user-location')) {
        // Update existing user marker position for real-time movement
        const existingMarker = markersRef.current.get('user-location');
        if (existingMarker) {
          existingMarker.setPosition({ lat: userLocation.latitude, lng: userLocation.longitude });
        }
      }

      // Remove markers for places that are no longer active
      markersRef.current.forEach((marker, key) => {
        if (key !== 'user-location' && !places.find(p => p.id === key && p.is_active)) {
          marker.setMap(null);
          markersRef.current.delete(key);
        }
      });

      // Add or update markers for active places
      places.filter(place => place.is_active).forEach((place) => {
        const isNearby = place.distance !== undefined && place.distance <= 500;
        
        if (!markersRef.current.has(place.id)) {
          const marker = new google.maps.Marker({
            position: { lat: place.latitude, lng: place.longitude },
            map,
            title: place.name,
            icon: getMarkerIcon(place.type, isNearby),
            zIndex: isNearby ? 800 : 500,
            optimized: true,
            animation: google.maps.Animation.DROP
          });

          marker.addListener('click', () => {
            onPlaceClick(place);
            map.panTo({ lat: place.latitude, lng: place.longitude });
          });

          markersRef.current.set(place.id, marker);
        } else {
          // Update existing marker if nearby status changed
          const existingMarker = markersRef.current.get(place.id);
          if (existingMarker) {
            existingMarker.setIcon(getMarkerIcon(place.type, isNearby));
          }
        }
      });
    };

    requestAnimationFrame(updateMarkers);
  }, [map, places, userLocation, onPlaceClick, getMarkerIcon]);

  // Custom zoom controls
  const zoomIn = () => {
    if (map) {
      const currentZoom = map.getZoom() || 13;
      map.setZoom(Math.min(currentZoom + 1, 20));
    }
  };

  const zoomOut = () => {
    if (map) {
      const currentZoom = map.getZoom() || 13;
      map.setZoom(Math.max(currentZoom - 1, 11));
    }
  };

  useEffect(() => {
    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current.clear();
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={ref} className="w-full h-full rounded-lg" style={{ minHeight: '100vh' }} />
      
      {/* Modern Custom Zoom Controls */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2 z-10">
        <Button
          onClick={zoomIn}
          size="sm"
          className="w-10 h-10 p-0 bg-background/90 hover:bg-background border shadow-lg"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          onClick={zoomOut}
          size="sm"
          className="w-10 h-10 p-0 bg-background/90 hover:bg-background border shadow-lg"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
});

const render = (status: Status) => {
  switch (status) {
    case Status.LOADING:
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
            <div className="text-blue-900 dark:text-blue-100 text-lg font-medium">Loading Jeddah Map...</div>
          </div>
        </div>
      );
    case Status.FAILURE:
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-red-900/20 p-4">
          <div className="container mx-auto max-w-2xl">
            <Card className="bg-background border">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-foreground mb-4">Map Loading Error</h2>
                <p className="text-muted-foreground">Failed to load the Jeddah map. Please check your internet connection and try again.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    default:
      return null;
  }
};

const EnhancedJeddahMap = () => {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { isInJeddah, loading: locationLoading, recheckLocation, locationError, jeddahBounds } = useJeddahLocationCheck();
  const { 
    location, 
    nearbyPlaces, 
    chatAvailablePlaces, 
    calculateDistance 
  } = useEnhancedLocation();
  const { user } = useAuth();

  const googleMapsApiKey = 'AIzaSyCnHJ_b9LBpxdSOdE8jmVMmJd6Vdmm5u8o';

  // Detect system theme
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handler);
    
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Use enhanced location data for places with distance
  useEffect(() => {
    if (nearbyPlaces.length > 0) {
      setPlaces(nearbyPlaces);
    }
  }, [nearbyPlaces]);

  // Handle chat button click with proximity validation
  const handleJoinChat = (place: Place) => {
    if (!location) {
      toast.error('Location not available');
      return;
    }

    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      place.latitude,
      place.longitude
    );

    if (distance > 500) {
      toast.error(`You need to be within 500m to chat. Currently ${Math.round(distance)}m away.`);
      return;
    }

    // Navigate to chat page with place context
    const chatUrl = new URL(window.location.origin);
    chatUrl.searchParams.set('section', 'chat');
    chatUrl.searchParams.set('placeId', place.id);
    window.location.href = chatUrl.toString();
  };

  // Get real-time button state based on proximity
  const getButtonState = (place: Place) => {
    if (!location) return { disabled: true, text: 'Loading...', color: 'bg-gray-400' };
    
    const distance = place.distance || 0;
    const isWithinRange = distance <= 500;
    
    return {
      disabled: !isWithinRange,
      text: isWithinRange ? 'Join Chat' : 'Move Closer',
      color: isWithinRange ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
    };
  };

  // Show location restriction if not in Jeddah
  if (isInJeddah === false || locationError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-amber-900/20 flex items-center justify-center p-4">
        <Card className="bg-background border max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Location Required</h2>
            <p className="text-muted-foreground">
              {locationError 
                ? 'Unable to detect your location. Please enable GPS and try again.'
                : 'This app is currently available only in Jeddah city.'
              }
            </p>
            <Button 
              onClick={recheckLocation}
              className="w-full"
              disabled={locationLoading}
            >
              {locationLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Checking Location...
                </>
              ) : (
                'Retry Location Detection'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading while checking location
  if (locationLoading || isInJeddah === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
          <div className="text-blue-900 dark:text-blue-100 text-lg font-medium">Detecting your location in Jeddah...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Enhanced floating controls */}
      <div className="absolute top-4 left-4 z-10 space-y-2">
        <Button
          onClick={recheckLocation}
          size="sm"
          className="bg-background/90 hover:bg-background border shadow-lg"
        >
          <Navigation className="w-4 h-4 mr-2" />
          Center
        </Button>
      </div>

      <Wrapper apiKey={googleMapsApiKey} render={render} libraries={['places']}>
        <MapComponent
          center={location ? { lat: location.latitude, lng: location.longitude } : { lat: 21.5433, lng: 39.1728 }}
          zoom={14}
          places={places}
          userLocation={location}
          jeddahBounds={jeddahBounds}
          onPlaceClick={setSelectedPlace}
          isDarkMode={isDarkMode}
        />
      </Wrapper>

      {/* Enhanced Place Info Popup with Real-time Chat Button */}
      {selectedPlace && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <Card className="bg-background/95 backdrop-blur-md border shadow-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-foreground flex items-center space-x-2">
                  <span>{selectedPlace.name}</span>
                </h3>
                <button
                  onClick={() => setSelectedPlace(null)}
                  className="text-muted-foreground hover:text-foreground text-xl transition-colors"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">
                      {selectedPlace.distance 
                        ? `${Math.round(selectedPlace.distance)}m away`
                        : 'Distance unknown'
                      }
                    </span>
                  </div>
                  
                  {selectedPlace.distance && (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      selectedPlace.distance <= 500 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {selectedPlace.distance <= 500 ? '🟢 In Range' : '🔴 Too Far'}
                    </span>
                  )}
                </div>

                {/* Real-time Proximity-based Chat Button */}
                {(() => {
                  const buttonState = getButtonState(selectedPlace);
                  return (
                    <Button
                      onClick={() => handleJoinChat(selectedPlace)}
                      disabled={buttonState.disabled}
                      className={`w-full ${buttonState.color} text-white transition-all duration-200`}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      {buttonState.text}
                      {!buttonState.disabled && <ExternalLink className="w-4 h-4 ml-2" />}
                    </Button>
                  );
                })()}

                {/* Status Indicator */}
                {selectedPlace.distance && selectedPlace.distance <= 500 && (
                  <div className="text-xs text-green-600 font-medium text-center flex items-center justify-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    Chat available - Click to join
                  </div>
                )}

                {selectedPlace.distance && selectedPlace.distance > 500 && (
                  <div className="text-xs text-red-600 font-medium text-center flex items-center justify-center">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                    Move {Math.round(selectedPlace.distance - 500)}m closer to unlock chat
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

export default EnhancedJeddahMap;
