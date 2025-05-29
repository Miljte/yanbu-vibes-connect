
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Lock, MessageSquare, Navigation, Languages } from 'lucide-react';
import { useLocation } from '@/hooks/useLocation';
import { useAuth } from '@/hooks/useAuth';
import { useLocalization } from '@/contexts/LocalizationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import CategoryFilter from './CategoryFilter';

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
  selectedCategory: string;
}

const MapComponent: React.FC<MapComponentProps> = ({
  center,
  zoom,
  places,
  userLocation,
  onPlaceClick,
  selectedCategory,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  // Ultra-clean map style - removes everything except roads
  const ultraCleanMapStyle = [
    {
      "featureType": "administrative",
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
      "featureType": "transit",
      "stylers": [{ "visibility": "off" }]
    },
    {
      "featureType": "water",
      "elementType": "labels",
      "stylers": [{ "visibility": "off" }]
    },
    {
      "featureType": "landscape",
      "elementType": "labels",
      "stylers": [{ "visibility": "off" }]
    }
  ];

  const getMarkerIcon = (type: string) => {
    const iconMap = {
      'cafe': '☕',
      'restaurant': '🍽️',
      'shop': '🛍️',
      'event': '🎉',
    };
    
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: type === 'cafe' ? '#8B4513' : 
                 type === 'restaurant' ? '#FF6347' : 
                 type === 'shop' ? '#4169E1' : '#FF69B4',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 3,
      scale: 20,
    };
  };

  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new google.maps.Map(ref.current, {
        center,
        zoom,
        styles: ultraCleanMapStyle,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'cooperative',
        backgroundColor: '#f8fafc',
      });
      
      setMap(newMap);
    }
  }, [ref, map, center, zoom]);

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
          fillColor: '#3B82F6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 4,
          scale: 15,
        },
        zIndex: 1000,
        animation: google.maps.Animation.BOUNCE,
      });
      
      setTimeout(() => {
        userMarker.setAnimation(null);
      }, 2000);
      
      newMarkers.push(userMarker);
    }

    // Filter places by category
    const filteredPlaces = selectedCategory === 'all' 
      ? places.filter(place => place.is_active)
      : places.filter(place => place.is_active && place.type === selectedCategory);

    // Add place markers
    filteredPlaces.forEach(place => {
      const marker = new google.maps.Marker({
        position: { lat: place.latitude, lng: place.longitude },
        map,
        title: place.name,
        icon: getMarkerIcon(place.type),
        zIndex: 500,
      });

      marker.addListener('click', () => {
        onPlaceClick(place);
        map.panTo({ lat: place.latitude, lng: place.longitude });
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);
  }, [map, places, userLocation, onPlaceClick, selectedCategory]);

  return <div ref={ref} className="w-full h-full" style={{ minHeight: '100vh' }} />;
};

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
  const { location, calculateDistance } = useLocation();
  const { user } = useAuth();
  const { t, language, setLanguage, isRTL } = useLocalization();

  const googleMapsApiKey = 'AIzaSyCnHJ_b9LBpxdSOdE8jmVMmJd6Vdmm5u8o';
  const yanbuCenter: google.maps.LatLngLiteral = { lat: 24.0892, lng: 38.0618 };

  useEffect(() => {
    fetchActivePlaces();
    
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
      toast.success(`${t('chat.joinChat')} ${place.name}!`);
    } else {
      toast.error(t('map.moveCloser'));
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

  return (
    <div className={`relative min-h-screen ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Category Filter */}
      <CategoryFilter 
        selectedCategory={selectedCategory} 
        onCategoryChange={setSelectedCategory} 
      />

      {/* Control buttons */}
      <div className="absolute top-20 right-4 z-10 flex flex-col space-y-2">
        <Button
          onClick={centerOnUser}
          size="sm"
          className="bg-white hover:bg-gray-50 text-gray-700 shadow-lg border"
        >
          <Navigation className="w-4 h-4" />
        </Button>
        <Button
          onClick={toggleLanguage}
          size="sm"
          className="bg-white hover:bg-gray-50 text-gray-700 shadow-lg border"
        >
          <Languages className="w-4 h-4" />
          <span className="ml-1 text-xs">{language.toUpperCase()}</span>
        </Button>
      </div>

      <Wrapper apiKey={googleMapsApiKey} render={render} libraries={['places']}>
        <MapComponent
          center={location ? { lat: location.latitude, lng: location.longitude } : yanbuCenter}
          zoom={15}
          places={places}
          userLocation={location}
          onPlaceClick={setSelectedPlace}
          selectedCategory={selectedCategory}
        />
      </Wrapper>

      {/* Store Info Popup */}
      {selectedPlace && (
        <div className="absolute bottom-20 left-4 right-4 z-10">
          <Card className="bg-white/95 backdrop-blur-md border-0 shadow-xl rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedPlace.name}</h3>
                  <p className="text-gray-600 text-sm flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {selectedPlace.distance 
                      ? `${Math.round(selectedPlace.distance)} ${t('map.distance')}`
                      : 'Distance unknown'
                    }
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPlace(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-light"
                >
                  ×
                </button>
              </div>
              
              {isNearby(selectedPlace) ? (
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
                  className="w-full bg-gray-300 cursor-not-allowed text-gray-600 rounded-xl py-3"
                >
                  <Lock className="w-5 h-5 mr-2" />
                  {t('map.moveCloser')}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ModernMap;
