
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Users, MessageSquare, Lock, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useJeddahLocationCheck } from '@/hooks/useJeddahLocationCheck';
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
}

const MapComponent: React.FC<MapComponentProps> = React.memo(({
  center,
  zoom,
  places,
  userLocation,
  jeddahBounds,
  onPlaceClick,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());

  // Jeddah city bounds for map restriction
  const jeddahMapBounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(jeddahBounds.southwest.lat, jeddahBounds.southwest.lng),
    new google.maps.LatLng(jeddahBounds.northeast.lat, jeddahBounds.northeast.lng)
  );

  // Modern Jeddah map style
  const jeddahMapStyle = [
    {
      "featureType": "administrative",
      "elementType": "geometry.stroke",
      "stylers": [{ "color": "#c9b2a6" }]
    },
    {
      "featureType": "administrative.land_parcel",
      "elementType": "geometry.stroke",
      "stylers": [{ "color": "#dcd2be" }]
    },
    {
      "featureType": "administrative.land_parcel",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#ae9e90" }]
    },
    {
      "featureType": "landscape.natural",
      "elementType": "geometry",
      "stylers": [{ "color": "#dfd2ae" }]
    },
    {
      "featureType": "poi",
      "elementType": "geometry",
      "stylers": [{ "color": "#dfd2ae" }]
    },
    {
      "featureType": "poi",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#93817c" }]
    },
    {
      "featureType": "poi.park",
      "elementType": "geometry.fill",
      "stylers": [{ "color": "#a5b076" }]
    },
    {
      "featureType": "road",
      "elementType": "geometry",
      "stylers": [{ "color": "#f5f1e6" }]
    },
    {
      "featureType": "road.arterial",
      "elementType": "geometry",
      "stylers": [{ "color": "#fdfcf8" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry",
      "stylers": [{ "color": "#f8c967" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry.stroke",
      "stylers": [{ "color": "#e9bc62" }]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [{ "color": "#54acd4" }]
    },
    {
      "featureType": "water",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#92998d" }]
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
        styles: jeddahMapStyle,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: 'cooperative',
        backgroundColor: '#f8fafc',
        clickableIcons: false,
      });
      
      setMap(newMap);
      console.log('✅ Enhanced Jeddah map created');
    }
  }, [center, zoom, jeddahMapBounds]);

  const getMarkerIcon = useCallback((type: string, isNearby: boolean = false) => {
    const iconConfig = {
      'cafe': { color: isNearby ? '#00FF00' : '#8B4513', scale: isNearby ? 20 : 16 },
      'restaurant': { color: isNearby ? '#00FF00' : '#FF6347', scale: isNearby ? 20 : 16 },
      'shop': { color: isNearby ? '#00FF00' : '#4169E1', scale: isNearby ? 20 : 16 },
      'event': { color: isNearby ? '#00FF00' : '#FF69B4', scale: isNearby ? 20 : 16 },
    };

    const config = iconConfig[type] || { color: isNearby ? '#00FF00' : '#666666', scale: isNearby ? 20 : 16 };
    
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: config.color,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: isNearby ? 4 : 2,
      scale: config.scale,
    };
  }, []);

  useEffect(() => {
    if (!map) return;

    const updateMarkers = () => {
      // Add user location marker with enhanced visibility
      if (userLocation && !markersRef.current.has('user-location')) {
        const userMarker = new google.maps.Marker({
          position: { lat: userLocation.latitude, lng: userLocation.longitude },
          map,
          title: "Your Location in Jeddah",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#1E90FF',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 4,
            scale: 15,
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

  useEffect(() => {
    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current.clear();
    };
  }, []);

  return <div ref={ref} className="w-full h-full rounded-lg" style={{ minHeight: '100vh' }} />;
});

const render = (status: Status) => {
  switch (status) {
    case Status.LOADING:
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
            <div className="text-blue-900 text-lg font-medium">Loading Jeddah Map...</div>
          </div>
        </div>
      );
    case Status.FAILURE:
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-4">
          <div className="container mx-auto max-w-2xl">
            <Card className="bg-white border border-red-200">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-red-900 mb-4">Map Loading Error</h2>
                <p className="text-red-700">Failed to load the Jeddah map. Please check your internet connection and try again.</p>
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
  const { isInJeddah, loading: locationLoading, recheckLocation, locationError, jeddahBounds } = useJeddahLocationCheck();
  const { user } = useAuth();

  const googleMapsApiKey = 'AIzaSyCnHJ_b9LBpxdSOdE8jmVMmJd6Vdmm5u8o';

  // Show location restriction if not in Jeddah
  if (isInJeddah === false || locationError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="bg-white border border-amber-200 max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-amber-900">Location Required</h2>
            <p className="text-amber-700">
              {locationError 
                ? 'Unable to detect your location. Please enable GPS and try again.'
                : 'This app is currently available only in Jeddah city.'
              }
            </p>
            <Button 
              onClick={recheckLocation}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
          <div className="text-blue-900 text-lg font-medium">Detecting your location in Jeddah...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* Enhanced floating controls */}
      <div className="absolute top-4 right-4 z-10 space-y-2">
        <Button
          onClick={recheckLocation}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
        >
          <Navigation className="w-4 h-4" />
        </Button>
      </div>

      <Wrapper apiKey={googleMapsApiKey} render={render} libraries={['places']}>
        <MapComponent
          center={{ lat: 21.5433, lng: 39.1728 }} // Jeddah center
          zoom={13}
          places={places}
          userLocation={isInJeddah ? { latitude: 21.5433, longitude: 39.1728 } : null}
          jeddahBounds={jeddahBounds}
          onPlaceClick={setSelectedPlace}
        />
      </Wrapper>

      {/* Enhanced Place Info Popup */}
      {selectedPlace && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <Card className="bg-white/95 backdrop-blur-md border shadow-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <span>{selectedPlace.name}</span>
                </h3>
                <button
                  onClick={() => setSelectedPlace(null)}
                  className="text-gray-500 hover:text-gray-700 text-xl transition-colors"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">
                    {selectedPlace.distance 
                      ? `${Math.round(selectedPlace.distance)}m away`
                      : 'Distance unknown'
                    }
                  </span>
                </div>

                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
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

export default EnhancedJeddahMap;
