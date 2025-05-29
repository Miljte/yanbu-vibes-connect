
import React, { useState, useEffect } from 'react';
import { MapPin, Users, Coffee, ShoppingBag, Waves, Car } from 'lucide-react';
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

const InteractiveMap = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { location, loading: locationLoading, calculateDistance } = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    fetchPlaces();
  }, []);

  useEffect(() => {
    if (location && places.length > 0) {
      updatePlacesWithDistance();
    }
  }, [location, places.length]);

  const fetchPlaces = async () => {
    try {
      console.log('Fetching places...');
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching places:', error);
        setError('Failed to load places');
        toast.error('Failed to load places');
        return;
      }

      console.log('Places fetched:', data);
      setPlaces(data || []);
    } catch (error) {
      console.error('Error fetching places:', error);
      setError('Failed to load places');
      toast.error('Failed to load places');
    } finally {
      setLoading(false);
    }
  };

  const updatePlacesWithDistance = () => {
    if (!location) return;

    const placesWithDistance = places.map(place => ({
      ...place,
      distance: calculateDistance(
        location.latitude,
        location.longitude,
        place.latitude,
        place.longitude
      )
    }));

    setPlaces(placesWithDistance);
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'cafe': return <Coffee className="w-4 h-4" />;
      case 'mall': return <ShoppingBag className="w-4 h-4" />;
      case 'beach': return <Waves className="w-4 h-4" />;
      case 'restaurant': return <Coffee className="w-4 h-4" />;
      case 'park': return <Car className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
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

  const handleJoinChat = (place: Place) => {
    if (!user) {
      toast.error('Please sign in to join chat');
      return;
    }

    if (!place.distance || place.distance > 500) {
      toast.error('You need to be within 500m to join this chat');
      return;
    }

    // Navigate to chat with place ID
    const chatElement = document.getElementById('chat');
    if (chatElement) {
      chatElement.scrollIntoView({ behavior: 'smooth' });
      // Here you would pass the place ID to the chat component
      toast.success(`Joined ${place.name} chat!`);
    }
  };

  if (loading) {
    return (
      <div id="map" className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 flex items-center justify-center">
        <div className="text-white">Loading places...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div id="map" className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 flex items-center justify-center">
        <div className="text-white">Error: {error}</div>
      </div>
    );
  }

  return (
    <div id="map" className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2 sm:p-4">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Explore Yanbu</h2>
          <p className="text-slate-300 text-sm sm:text-base">Discover places and connect with people nearby</p>
          {locationLoading && (
            <p className="text-cyan-400 text-sm mt-2">Getting your location...</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Map Area */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm h-64 sm:h-96 relative overflow-hidden">
              <CardContent className="p-0 h-full">
                {/* Simulated Map Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 to-blue-900/20">
                  <div className="absolute inset-0 opacity-10" 
                       style={{ 
                         backgroundImage: `radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.1) 0%, transparent 50%)`,
                         backgroundSize: '50px 50px'
                       }}>
                  </div>
                </div>

                {/* User Location */}
                {location && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 bg-cyan-500 rounded-full animate-pulse shadow-lg shadow-cyan-500/50"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 sm:w-8 sm:h-8 border-2 border-cyan-500/30 rounded-full animate-ping"></div>
                  </div>
                )}

                {/* Place Markers */}
                {places.slice(0, 6).map((place, index) => (
                  <div
                    key={place.id}
                    className={`absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 z-20`}
                    style={{
                      top: `${30 + (index * 12)}%`,
                      left: `${35 + (index * 8)}%`
                    }}
                    onClick={() => setSelectedPlace(place)}
                  >
                    <div className="relative">
                      <div className={`w-6 h-6 sm:w-8 sm:h-8 ${getCrowdColor(place.crowd_level)} rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform`}>
                        {getLocationIcon(place.type)}
                      </div>
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
                        {place.name}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Map Controls */}
                <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
                  <button className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-700 text-white rounded-lg flex items-center justify-center hover:bg-slate-600 transition-colors text-sm sm:text-base">
                    +
                  </button>
                  <button className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-700 text-white rounded-lg flex items-center justify-center hover:bg-slate-600 transition-colors text-sm sm:text-base">
                    -
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Location Details */}
          <div className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Your Location</h3>
                <div className="flex items-center space-x-2 text-slate-300">
                  <MapPin className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm sm:text-base">Yanbu, Saudi Arabia</span>
                </div>
                {location && (
                  <div className="mt-2 text-xs sm:text-sm text-slate-400">
                    {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedPlace && (
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">{selectedPlace.name}</h3>
                    <Badge variant="secondary" className={`${getCrowdColor(selectedPlace.crowd_level)} text-white text-xs`}>
                      {selectedPlace.crowd_level} crowd
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-slate-300">
                      <MapPin className="w-4 h-4 text-cyan-500" />
                      <span className="text-sm">
                        {selectedPlace.distance ? `${(selectedPlace.distance / 1000).toFixed(1)} km away` : 'Distance unknown'}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-slate-300">
                      <Users className="w-4 h-4 text-cyan-500" />
                      <span className="text-sm">M: {selectedPlace.male_percentage}% F: {selectedPlace.female_percentage}%</span>
                    </div>

                    {selectedPlace.description && (
                      <p className="text-slate-300 text-sm">{selectedPlace.description}</p>
                    )}

                    <Button 
                      className="w-full mt-4 bg-cyan-600 hover:bg-cyan-700"
                      onClick={() => handleJoinChat(selectedPlace)}
                      disabled={!user || (selectedPlace.distance && selectedPlace.distance > 500)}
                    >
                      {!user ? 'Sign In to Chat' : 
                       selectedPlace.distance && selectedPlace.distance <= 500 ? 'Join Chat' : 'Get Closer to Chat'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Nearby Places List */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Nearby Places</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {places.length === 0 ? (
                    <div className="text-center text-slate-400 py-4">
                      No places found
                    </div>
                  ) : (
                    places.slice(0, 5).map((place) => (
                      <div 
                        key={place.id}
                        className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors"
                        onClick={() => setSelectedPlace(place)}
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className={`w-6 h-6 sm:w-8 sm:h-8 ${getCrowdColor(place.crowd_level)} rounded-full flex items-center justify-center text-white flex-shrink-0`}>
                            {getLocationIcon(place.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-white font-medium text-sm truncate">{place.name}</div>
                            <div className="text-slate-400 text-xs">
                              {place.distance ? `${(place.distance / 1000).toFixed(1)} km` : 'Distance unknown'}
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

export default InteractiveMap;
