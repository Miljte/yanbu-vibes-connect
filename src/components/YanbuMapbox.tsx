
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
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

const YanbuMapbox = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [userMarker, setUserMarker] = useState<mapboxgl.Marker | null>(null);
  const { isDark, toggleTheme } = useTheme();
  const { location } = useLocation();

  // Yanbu coordinates
  const yanbuCenter: [number, number] = [38.0618, 24.0892];

  // Sample places in Yanbu
  const places: Place[] = [
    { id: '1', name: 'Yanbu Mall', type: 'mall', latitude: 24.0756, longitude: 38.0479, crowd_level: 'medium', male_percentage: 45, female_percentage: 55 },
    { id: '2', name: 'Al Fanateer Beach', type: 'beach', latitude: 24.1123, longitude: 38.0234, crowd_level: 'low', male_percentage: 60, female_percentage: 40 },
    { id: '3', name: 'Yanbu Historic Area', type: 'historic', latitude: 24.0823, longitude: 38.0645, crowd_level: 'medium', male_percentage: 50, female_percentage: 50 },
    { id: '4', name: 'Red Sea Mall', type: 'mall', latitude: 24.0689, longitude: 38.0512, crowd_level: 'high', male_percentage: 40, female_percentage: 60 },
    { id: '5', name: 'Yanbu Corniche', type: 'waterfront', latitude: 24.0934, longitude: 38.0456, crowd_level: 'medium', male_percentage: 55, female_percentage: 45 },
  ];

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    // Set Mapbox access token
    mapboxgl.accessToken = mapboxToken;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
      center: yanbuCenter,
      zoom: 12,
      scrollZoom: true,
      dragPan: true,
      touchZoomRotate: true,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add places as markers
    places.forEach(place => {
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.cursor = 'pointer';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      
      // Color based on crowd level
      const color = place.crowd_level === 'low' ? '#10b981' : 
                   place.crowd_level === 'medium' ? '#f59e0b' : '#ef4444';
      el.style.backgroundColor = color;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([place.longitude, place.latitude])
        .addTo(map.current!);

      // Add click event
      el.addEventListener('click', () => {
        setSelectedPlace(place);
        map.current?.flyTo({
          center: [place.longitude, place.latitude],
          zoom: 15,
          duration: 1000
        });
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, isDark]);

  // Update user location marker
  useEffect(() => {
    if (!map.current || !location) return;

    // Remove existing user marker
    if (userMarker) {
      userMarker.remove();
    }

    // Create user marker
    const el = document.createElement('div');
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#3b82f6';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.5)';

    const marker = new mapboxgl.Marker(el)
      .setLngLat([location.longitude, location.latitude])
      .addTo(map.current);

    setUserMarker(marker);

    // Center map on user location
    map.current.flyTo({
      center: [location.longitude, location.latitude],
      zoom: 14,
      duration: 1000
    });
  }, [location]);

  const handleFindMe = () => {
    if (location && map.current) {
      map.current.flyTo({
        center: [location.longitude, location.latitude],
        zoom: 15,
        duration: 1000
      });
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

  if (!mapboxToken) {
    return (
      <div className="min-h-screen bg-background p-4 pb-20">
        <div className="container mx-auto max-w-2xl">
          <Card className="bg-card border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">Setup Mapbox</h2>
              <p className="text-muted-foreground mb-4">
                Please enter your Mapbox public token to view the interactive Yanbu map.
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Get your token from: <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">mapbox.com</a>
              </p>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="pk.eyJ1IjoieW91cnVzZXJuYW1lIiwia..."
                  value={mapboxToken}
                  onChange={(e) => setMapboxToken(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-background text-foreground"
                />
                <Button 
                  onClick={() => {
                    if (mapboxToken.startsWith('pk.')) {
                      toast.success('Mapbox token set successfully!');
                    } else {
                      toast.error('Please enter a valid Mapbox token starting with "pk."');
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
      <div ref={mapContainer} className="w-full h-screen" />

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

export default YanbuMapbox;
