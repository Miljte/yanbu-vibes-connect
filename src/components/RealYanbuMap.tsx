
import React, { useState, useEffect } from 'react';
import { MapPin, Users, Navigation } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  address?: string;
  description?: string;
  crowd_level: 'low' | 'medium' | 'high';
  male_percentage: number;
  female_percentage: number;
  distance?: number;
  is_active: boolean;
}

const RealYanbuMap = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const { location, calculateDistance } = useLocation();
  const { user } = useAuth();

  // Real Yanbu coordinates
  const yanbuCenter = { lat: 24.0870, lng: 38.0600 };

  useEffect(() => {
    fetchPlaces();
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(coords);
          toast.success('Location updated');
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Could not get your location');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  };

  const fetchPlaces = async () => {
    try {
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      const placesWithDistance = data?.map(place => {
        let distance = null;
        if (userLocation) {
          distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            place.latitude,
            place.longitude
          );
        }
        return { ...place, distance };
      }) || [];

      setPlaces(placesWithDistance);
    } catch (error) {
      console.error('Error fetching places:', error);
      toast.error('Failed to load places');
    }
  };

  const getMapStyle = () => {
    return {
      background: `
        radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.1) 0%, transparent 70%),
        linear-gradient(135deg, #1e293b 0%, #0f172a 100%)
      `,
      backgroundSize: '200px 200px, 100% 100%'
    };
  };

  const isNearby = (place: Place) => {
    return place.distance !== null && place.distance <= 500;
  };

  const getCrowdColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pb-20">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">Yanbu Live Map</h2>
          <div className="flex items-center space-x-4">
            <p className="text-slate-300">Real-time locations and nearby people</p>
            <Button 
              onClick={getCurrentLocation}
              variant="outline"
              size="sm"
              className="border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-white"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Update Location
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interactive Map */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm h-96 relative overflow-hidden">
              <CardContent className="p-0 h-full">
                <div 
                  className="absolute inset-0"
                  style={getMapStyle()}
                >
                  {/* User Location Marker */}
                  {userLocation && (
                    <div 
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
                      style={{
                        top: '50%',
                        left: '50%'
                      }}
                    >
                      <div className="relative">
                        <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse shadow-lg shadow-blue-500/50 border-2 border-white"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-2 border-blue-500/30 rounded-full animate-ping"></div>
                      </div>
                    </div>
                  )}

                  {/* Place Markers */}
                  {places.slice(0, 8).map((place, index) => (
                    <div
                      key={place.id}
                      className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 z-10"
                      style={{
                        top: `${25 + (index * 8)}%`,
                        left: `${30 + (index * 7)}%`
                      }}
                      onClick={() => setSelectedPlace(place)}
                    >
                      <div className="relative group">
                        <div className={`w-8 h-8 ${getCrowdColor(place.crowd_level)} rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform border-2 ${isNearby(place) ? 'border-cyan-400' : 'border-white'}`}>
                          <MapPin className="w-4 h-4" />
                        </div>
                        {isNearby(place) && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
                        )}
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                          {place.name}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Map Legend */}
                  <div className="absolute bottom-4 left-4 bg-slate-900/80 rounded-lg p-3 text-white text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span>Your Location</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
                        <span>Within 500m</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Place Details & List */}
          <div className="space-y-6">
            {selectedPlace && (
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">{selectedPlace.name}</h3>
                    <Badge 
                      variant="secondary" 
                      className={`${getCrowdColor(selectedPlace.crowd_level)} text-white`}
                    >
                      {selectedPlace.crowd_level} crowd
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-slate-300">
                      <MapPin className="w-4 h-4 text-cyan-500" />
                      <span className="text-sm">
                        {selectedPlace.distance 
                          ? `${Math.round(selectedPlace.distance)}m away`
                          : 'Distance unknown'
                        }
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-slate-300">
                      <Users className="w-4 h-4 text-cyan-500" />
                      <span className="text-sm">
                        M: {selectedPlace.male_percentage}% F: {selectedPlace.female_percentage}%
                      </span>
                    </div>

                    {selectedPlace.description && (
                      <p className="text-slate-300 text-sm">{selectedPlace.description}</p>
                    )}

                    <Button 
                      className={`w-full mt-4 ${
                        isNearby(selectedPlace) 
                          ? 'bg-cyan-600 hover:bg-cyan-700' 
                          : 'bg-slate-600 hover:bg-slate-700'
                      }`}
                      disabled={!isNearby(selectedPlace)}
                      onClick={() => {
                        if (isNearby(selectedPlace)) {
                          document.getElementById('chat')?.scrollIntoView({ behavior: 'smooth' });
                          toast.success(`Joined ${selectedPlace.name} chat!`);
                        }
                      }}
                    >
                      {isNearby(selectedPlace) ? 'Join Chat' : 'Get Closer to Chat'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Nearby Places List */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Nearby Places</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {places.length === 0 ? (
                    <div className="text-center text-slate-400 py-4">
                      No places found
                    </div>
                  ) : (
                    places
                      .filter(place => place.distance !== null)
                      .sort((a, b) => (a.distance || 0) - (b.distance || 0))
                      .slice(0, 5)
                      .map((place) => (
                        <div 
                          key={place.id}
                          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedPlace?.id === place.id
                              ? 'bg-cyan-600/30 border border-cyan-500'
                              : 'bg-slate-700/30 hover:bg-slate-700/50'
                          }`}
                          onClick={() => setSelectedPlace(place)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-6 h-6 ${getCrowdColor(place.crowd_level)} rounded-full flex items-center justify-center text-white relative`}>
                              <MapPin className="w-3 h-3" />
                              {isNearby(place) && (
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full"></div>
                              )}
                            </div>
                            <div>
                              <div className="text-white font-medium text-sm">{place.name}</div>
                              <div className="text-slate-400 text-xs">
                                {Math.round(place.distance || 0)}m away
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="border-slate-600 text-slate-300 text-xs">
                            {place.crowd_level}
                          </Badge>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealYanbuMap;
