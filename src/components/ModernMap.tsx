
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Lock, MessageSquare, Navigation, Languages, AlertTriangle, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLocation } from '@/hooks/useLocation';
import { useYanbuLocationCheck } from '@/hooks/useYanbuLocationCheck';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { useLocalization } from '@/contexts/LocalizationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import CategoryFilter from './CategoryFilter';
import LocationRestriction from './LocationRestriction';
import { cleanupMapData, verifyMerchantPlaces } from '@/utils/mapCleanup';

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
  userLocation: { latitude: number; longitude: number; accuracy?: number } | null;
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

  // Yanbu city bounds - restricting map movement to Yanbu area only
  const yanbuBounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(23.9500, 37.9500), // Southwest corner
    new google.maps.LatLng(24.2500, 38.3000)  // Northeast corner
  );

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
      strokeWeight: 3,
      scale: 16,
    };
  }, []);

  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new google.maps.Map(ref.current, {
        center,
        zoom,
        minZoom: 12,
        maxZoom: 18,
        restriction: {
          latLngBounds: yanbuBounds,
          strictBounds: true,
        },
        styles: ultraCleanMapStyle,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'cooperative',
        backgroundColor: '#f8fafc',
      });
      
      setMap(newMap);
    }
  }, [center, zoom]);

  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    const newMarkers: google.maps.Marker[] = [];

    // Add user location marker with accuracy circle
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
          scale: 12,
        },
        zIndex: 1000,
        animation: google.maps.Animation.BOUNCE,
      });
      
      setTimeout(() => {
        if (userMarker.getAnimation()) {
          userMarker.setAnimation(null);
        }
      }, 2000);
      
      newMarkers.push(userMarker);

      // Add accuracy circle if GPS accuracy is available
      if (userLocation.accuracy && userLocation.accuracy > 20) {
        const accuracyCircle = new google.maps.Circle({
          strokeColor: '#FF0000',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#FF0000',
          fillOpacity: 0.35,
          map,
          center: { lat: userLocation.latitude, lng: userLocation.longitude },
          radius: userLocation.accuracy,
        });
      }
    }

    // Filter places by category - only show merchant-created places
    const filteredPlaces = selectedCategory === 'all' 
      ? places.filter(place => place.is_active && place.merchant_id)
      : places.filter(place => place.is_active && place.merchant_id && place.type === selectedCategory);

    console.log(`📍 Showing ${filteredPlaces.length} verified merchant places on map`);

    // Add place markers with fixed size
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
  }, [map, places, userLocation, onPlaceClick, selectedCategory, getMarkerIcon]);

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
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  
  // Call ALL hooks first, before any conditional logic
  const { location, calculateDistance } = useLocation();
  const { isInYanbu, isChecking, recheckLocation } = useYanbuLocationCheck();
  const { user } = useAuth();
  const { userRole, isAdmin } = useRoles();
  const { t, language, setLanguage, isRTL } = useLocalization();

  const googleMapsApiKey = 'AIzaSyCnHJ_b9LBpxdSOdE8jmVMmJd6Vdmm5u8o';
  const yanbuCenter: google.maps.LatLngLiteral = { lat: 24.0892, lng: 38.0618 };

  // All useEffect hooks must be called consistently
  useEffect(() => {
    if (isInYanbu === true) {
      fetchVerifiedMerchantPlaces();
    }
  }, [isInYanbu, location]);

  useEffect(() => {
    if (isInYanbu === true) {
      const placesSubscription = supabase
        .channel('merchant-places-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'places' }, 
          () => {
            fetchVerifiedMerchantPlaces();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(placesSubscription);
      };
    }
  }, [isInYanbu]);

  const fetchVerifiedMerchantPlaces = async () => {
    try {
      console.log('🏪 Fetching ONLY verified merchant places...');
      
      // Only get places that have a valid merchant_id and belong to users with merchant role
      const { data, error } = await supabase
        .from('places')
        .select(`
          *,
          user_roles!inner(role, user_id)
        `)
        .eq('is_active', true)
        .eq('user_roles.role', 'merchant')
        .not('merchant_id', 'is', null);

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
      console.log(`✅ Loaded ${placesWithDistance.length} verified merchant places`);
    } catch (error) {
      console.error('❌ Error fetching verified merchant places:', error);
      toast.error('Failed to load merchant stores');
    }
  };

  const handleMapCleanup = async () => {
    if (!isAdmin) {
      toast.error('Only admins can perform map cleanup');
      return;
    }

    setIsCleaningUp(true);
    try {
      const result = await cleanupMapData();
      
      if (result.success) {
        toast.success(`✅ Map cleanup complete! Removed ${result.removed} invalid places, ${result.remaining} merchant places remaining`);
        // Refresh the map data
        await fetchVerifiedMerchantPlaces();
      } else {
        toast.error(`❌ Cleanup failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Cleanup error:', error);
      toast.error('Map cleanup failed');
    } finally {
      setIsCleaningUp(false);
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

  const formatDistance = (distance: number) => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  };

  // NOW handle conditional rendering AFTER all hooks are called
  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-lg">Checking location...</div>
      </div>
    );
  }

  if (isInYanbu === false) {
    return <LocationRestriction onRetry={recheckLocation} isChecking={isChecking} />;
  }

  return (
    <div className={`relative min-h-screen ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* GPS Accuracy Warning */}
      {location && location.accuracy && location.accuracy > 20 && (
        <div className="absolute top-4 left-4 right-4 z-20 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg flex items-center">
          <AlertTriangle className="w-4 h-4 mr-2" />
          <span className="text-sm">GPS accuracy: {Math.round(location.accuracy)}m. Move to open area for better accuracy.</span>
        </div>
      )}

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
          className="bg-background hover:bg-muted text-foreground shadow-lg border"
        >
          <Navigation className="w-4 h-4" />
        </Button>
        <Button
          onClick={toggleLanguage}
          size="sm"
          className="bg-background hover:bg-muted text-foreground shadow-lg border"
        >
          <Languages className="w-4 h-4" />
          <span className="ml-1 text-xs">{language.toUpperCase()}</span>
        </Button>
        {isAdmin && (
          <Button
            onClick={handleMapCleanup}
            disabled={isCleaningUp}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white shadow-lg border"
          >
            <Trash2 className="w-4 h-4" />
            {isCleaningUp ? '...' : 'Clean'}
          </Button>
        )}
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
                    <Badge variant="outline" className="text-xs">
                      Verified Merchant
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
                          ? formatDistance(selectedPlace.distance)
                          : 'Distance unknown'
                        }
                      </span>
                    </div>
                    <Badge 
                      variant={isNearby(selectedPlace) ? "default" : "secondary"}
                      className={isNearby(selectedPlace) ? "bg-green-600" : ""}
                    >
                      {isNearby(selectedPlace) ? 'In Range' : 'Out of Range'}
                    </Badge>
                  </div>

                  {/* Store Category with emoji */}
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="text-lg">
                      {selectedPlace.type === 'cafe' && '☕'}
                      {selectedPlace.type === 'restaurant' && '🍽️'}
                      {selectedPlace.type === 'shop' && '🛍️'}
                      {selectedPlace.type === 'event' && '🎉'}
                    </span>
                    <span className="text-sm font-medium text-foreground capitalize">
                      {selectedPlace.type}
                    </span>
                  </div>
                </div>
                
                {selectedPlace.images && selectedPlace.images.length > 0 && (
                  <div className="ml-4">
                    <img 
                      src={selectedPlace.images[0]} 
                      alt={selectedPlace.name}
                      className="w-20 h-20 rounded-lg object-cover border"
                    />
                  </div>
                )}
                
                <button
                  onClick={() => setSelectedPlace(null)}
                  className="text-muted-foreground hover:text-foreground text-2xl font-light ml-2 absolute top-2 right-2"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-3">
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
                    className="w-full bg-muted cursor-not-allowed text-muted-foreground rounded-xl py-3"
                  >
                    <Lock className="w-5 h-5 mr-2" />
                    {t('map.moveCloser')}
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
