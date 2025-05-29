
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sun, Moon, MapPin, Locate } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocation } from '@/hooks/useLocation';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Place {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  crowd_level: 'low' | 'medium' | 'high';
  male_percentage: number;
  female_percentage: number;
  distance?: number;
}

interface MapComponentProps {
  center: google.maps.LatLngLiteral;
  zoom: number;
  places: Place[];
  isDark: boolean;
  userLocation: { latitude: number; longitude: number } | null;
  onPlaceClick: (place: Place) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({
  center,
  zoom,
  places,
  isDark,
  userLocation,
  onPlaceClick,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new window.google.maps.Map(ref.current, {
        center,
        zoom,
        styles: isDark ? [
          { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
          {
            featureType: "administrative.locality",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
          },
          {
            featureType: "poi",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
          },
          {
            featureType: "poi.park",
            elementType: "geometry",
            stylers: [{ color: "#263c3f" }],
          },
          {
            featureType: "poi.park",
            elementType: "labels.text.fill",
            stylers: [{ color: "#6b9a76" }],
          },
          {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#38414e" }],
          },
          {
            featureType: "road",
            elementType: "geometry.stroke",
            stylers: [{ color: "#212a37" }],
          },
          {
            featureType: "road",
            elementType: "labels.text.fill",
            stylers: [{ color: "#9ca5b3" }],
          },
          {
            featureType: "road.highway",
            elementType: "geometry",
            stylers: [{ color: "#746855" }],
          },
          {
            featureType: "road.highway",
            elementType: "geometry.stroke",
            stylers: [{ color: "#1f2835" }],
          },
          {
            featureType: "road.highway",
            elementType: "labels.text.fill",
            stylers: [{ color: "#f3d19c" }],
          },
          {
            featureType: "transit",
            elementType: "geometry",
            stylers: [{ color: "#2f3948" }],
          },
          {
            featureType: "transit.station",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#17263c" }],
          },
          {
            featureType: "water",
            elementType: "labels.text.fill",
            stylers: [{ color: "#515c6d" }],
          },
          {
            featureType: "water",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#17263c" }],
          },
        ] : [],
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: false,
      });
      setMap(newMap);
    }
  }, [ref, map, center, zoom, isDark]);

  // Update map style when theme changes
  useEffect(() => {
    if (map) {
      map.setOptions({
        styles: isDark ? [
          { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
          {
            featureType: "administrative.locality",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
          },
          {
            featureType: "poi",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
          },
          {
            featureType: "poi.park",
            elementType: "geometry",
            stylers: [{ color: "#263c3f" }],
          },
          {
            featureType: "poi.park",
            elementType: "labels.text.fill",
            stylers: [{ color: "#6b9a76" }],
          },
          {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#38414e" }],
          },
          {
            featureType: "road",
            elementType: "geometry.stroke",
            stylers: [{ color: "#212a37" }],
          },
          {
            featureType: "road",
            elementType: "labels.text.fill",
            stylers: [{ color: "#9ca5b3" }],
          },
          {
            featureType: "road.highway",
            elementType: "geometry",
            stylers: [{ color: "#746855" }],
          },
          {
            featureType: "road.highway",
            elementType: "geometry.stroke",
            stylers: [{ color: "#1f2835" }],
          },
          {
            featureType: "road.highway",
            elementType: "labels.text.fill",
            stylers: [{ color: "#f3d19c" }],
          },
          {
            featureType: "transit",
            elementType: "geometry",
            stylers: [{ color: "#2f3948" }],
          },
          {
            featureType: "transit.station",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#17263c" }],
          },
          {
            featureType: "water",
            elementType: "labels.text.fill",
            stylers: [{ color: "#515c6d" }],
          },
          {
            featureType: "water",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#17263c" }],
          },
        ] : [],
      });
    }
  }, [map, isDark]);

  // Add place markers
  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));

    const newMarkers: google.maps.Marker[] = [];

    // Add user location marker
    if (userLocation) {
      const userMarker = new google.maps.Marker({
        position: { lat: userLocation.latitude, lng: userLocation.longitude },
        map,
        title: "Your Location",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
          scale: 8,
        },
      });
      newMarkers.push(userMarker);
    }

    // Add place markers
    places.forEach(place => {
      const color = place.crowd_level === 'low' ? '#10b981' : 
                   place.crowd_level === 'medium' ? '#f59e0b' : '#ef4444';
      
      const marker = new google.maps.Marker({
        position: { lat: place.latitude, lng: place.longitude },
        map,
        title: place.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 12,
        },
      });

      marker.addListener('click', () => {
        onPlaceClick(place);
        map.panTo({ lat: place.latitude, lng: place.longitude });
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);
  }, [map, places, userLocation, onPlaceClick]);

  return <div ref={ref} className="w-full h-full" />;
};

const render = (status: Status) => {
  switch (status) {
    case Status.LOADING:
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-foreground text-lg">Loading Google Maps...</div>
        </div>
      );
    case Status.FAILURE:
      return (
        <div className="min-h-screen bg-background p-4 pb-20">
          <div className="container mx-auto max-w-2xl">
            <Card className="bg-card border">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-foreground mb-4">Google Maps Error</h2>
                <p className="text-muted-foreground mb-4">
                  Failed to load Google Maps. Please check your API key and try again.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    default:
      return null;
  }
};

const YanbuGoogleMap = () => {
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const { isDark, toggleTheme } = useTheme();
  const { location } = useLocation();

  // Yanbu coordinates
  const yanbuCenter: google.maps.LatLngLiteral = { lat: 24.0892, lng: 38.0618 };

  // Sample places in Yanbu
  const places: Place[] = [
    { id: '1', name: 'Yanbu Mall', type: 'mall', latitude: 24.0756, longitude: 38.0479, crowd_level: 'medium', male_percentage: 45, female_percentage: 55 },
    { id: '2', name: 'Al Fanateer Beach', type: 'beach', latitude: 24.1123, longitude: 38.0234, crowd_level: 'low', male_percentage: 60, female_percentage: 40 },
    { id: '3', name: 'Yanbu Historic Area', type: 'historic', latitude: 24.0823, longitude: 38.0645, crowd_level: 'medium', male_percentage: 50, female_percentage: 50 },
    { id: '4', name: 'Red Sea Mall', type: 'mall', latitude: 24.0689, longitude: 38.0512, crowd_level: 'high', male_percentage: 40, female_percentage: 60 },
    { id: '5', name: 'Yanbu Corniche', type: 'waterfront', latitude: 24.0934, longitude: 38.0456, crowd_level: 'medium', male_percentage: 55, female_percentage: 45 },
  ];

  const handleFindMe = () => {
    if (location) {
      toast.success('Centered on your location');
    } else {
      toast.error('Location not available');
    }
  };

  const getCrowdColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (!googleMapsApiKey) {
    return (
      <div className="min-h-screen bg-background p-4 pb-20">
        <div className="container mx-auto max-w-2xl">
          <Card className="bg-card border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">Setup Google Maps</h2>
              <p className="text-muted-foreground mb-4">
                Please enter your Google Maps API key to view the interactive Yanbu map.
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Get your API key from: <a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">Google Cloud Console</a>
              </p>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="AIzaSyC4R6AN7SmyTjK6ZJMOkdioADhVD..."
                  value={googleMapsApiKey}
                  onChange={(e) => setGoogleMapsApiKey(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-background text-foreground"
                />
                <Button 
                  onClick={() => {
                    if (googleMapsApiKey.startsWith('AIza')) {
                      toast.success('Google Maps API key set successfully!');
                    } else {
                      toast.error('Please enter a valid Google Maps API key starting with "AIza"');
                    }
                  }}
                  className="w-full"
                >
                  Initialize Map
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Map Controls */}
      <div className="absolute top-4 left-4 z-10 flex space-x-2">
        <Button
          onClick={toggleTheme}
          size="sm"
          variant="outline"
          className="bg-background/80 backdrop-blur-sm"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        <Button
          onClick={handleFindMe}
          size="sm"
          variant="outline"
          className="bg-background/80 backdrop-blur-sm"
        >
          <Locate className="w-4 h-4" />
        </Button>
      </div>

      {/* Map Container */}
      <Wrapper apiKey={googleMapsApiKey} render={render} libraries={['places']}>
        <MapComponent
          center={location ? { lat: location.latitude, lng: location.longitude } : yanbuCenter}
          zoom={13}
          places={places}
          isDark={isDark}
          userLocation={location}
          onPlaceClick={setSelectedPlace}
        />
      </Wrapper>

      {/* Selected Place Info */}
      {selectedPlace && (
        <div className="absolute bottom-24 left-4 right-4 z-10">
          <Card className="bg-background/90 backdrop-blur-sm border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-foreground">{selectedPlace.name}</h3>
                <Badge className={`${getCrowdColor(selectedPlace.crowd_level)} text-white`}>
                  {selectedPlace.crowd_level} crowd
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{selectedPlace.type}</span>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  M: {selectedPlace.male_percentage}% F: {selectedPlace.female_percentage}%
                </div>

                <div className="flex space-x-2 mt-3">
                  <Button size="sm" className="flex-1">
                    Join Chat
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setSelectedPlace(null)}
                  >
                    Close
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

export default YanbuGoogleMap;
