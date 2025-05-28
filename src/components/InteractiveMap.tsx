
import React, { useState, useEffect } from 'react';
import { MapPin, Users, Coffee, ShoppingBag, Waves, Car } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Location {
  id: string;
  name: string;
  type: 'cafe' | 'mall' | 'beach' | 'restaurant' | 'park';
  lat: number;
  lng: number;
  crowdLevel: 'low' | 'medium' | 'high';
  genderRatio: { male: number; female: number };
  distance: number;
  offers?: string[];
}

const InteractiveMap = () => {
  const [userLocation, setUserLocation] = useState({ lat: 24.0896, lng: 38.0618 }); // Yanbu coordinates
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const locations: Location[] = [
    {
      id: '1',
      name: 'Seef Mall Yanbu',
      type: 'mall',
      lat: 24.0850,
      lng: 38.0580,
      crowdLevel: 'high',
      genderRatio: { male: 45, female: 55 },
      distance: 1.2,
      offers: ['30% off fashion items', 'Free parking']
    },
    {
      id: '2',
      name: 'Yanbu Corniche',
      type: 'beach',
      lat: 24.0920,
      lng: 38.0650,
      crowdLevel: 'medium',
      genderRatio: { male: 60, female: 40 },
      distance: 0.8
    },
    {
      id: '3',
      name: 'Starbucks Downtown',
      type: 'cafe',
      lat: 24.0870,
      lng: 38.0600,
      crowdLevel: 'low',
      genderRatio: { male: 35, female: 65 },
      distance: 0.5,
      offers: ['Buy 2 get 1 free']
    },
    {
      id: '4',
      name: 'Al Fanateer Beach',
      type: 'beach',
      lat: 24.1000,
      lng: 38.0700,
      crowdLevel: 'medium',
      genderRatio: { male: 55, female: 45 },
      distance: 2.1
    }
  ];

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

  return (
    <div id="map" className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="container mx-auto">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">Explore Yanbu</h2>
          <p className="text-slate-300">Discover places and connect with people nearby</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Area */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm h-96 relative overflow-hidden">
              <CardContent className="p-0 h-full">
                {/* Simulated Map Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 to-blue-900/20">
                  <div className="absolute inset-0 opacity-10" 
                       style={{ 
                         backgroundImage: `radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.1) 0%, transparent 50%)`,
                         backgroundSize: '100px 100px'
                       }}>
                  </div>
                </div>

                {/* User Location */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-4 h-4 bg-cyan-500 rounded-full animate-pulse shadow-lg shadow-cyan-500/50"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-2 border-cyan-500/30 rounded-full animate-ping"></div>
                </div>

                {/* Location Markers */}
                {locations.map((location, index) => (
                  <div
                    key={location.id}
                    className={`absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 z-20`}
                    style={{
                      top: `${30 + (index * 15)}%`,
                      left: `${40 + (index * 10)}%`
                    }}
                    onClick={() => setSelectedLocation(location)}
                  >
                    <div className="relative">
                      <div className={`w-8 h-8 ${getCrowdColor(location.crowdLevel)} rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform`}>
                        {getLocationIcon(location.type)}
                      </div>
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
                        {location.name}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Map Controls */}
                <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
                  <button className="w-10 h-10 bg-slate-700 text-white rounded-lg flex items-center justify-center hover:bg-slate-600 transition-colors">
                    +
                  </button>
                  <button className="w-10 h-10 bg-slate-700 text-white rounded-lg flex items-center justify-center hover:bg-slate-600 transition-colors">
                    -
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Location Details */}
          <div className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Your Location</h3>
                <div className="flex items-center space-x-2 text-slate-300">
                  <MapPin className="w-4 h-4 text-cyan-500" />
                  <span>Yanbu, Saudi Arabia</span>
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  24.0896°N, 38.0618°E
                </div>
              </CardContent>
            </Card>

            {selectedLocation && (
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">{selectedLocation.name}</h3>
                    <Badge variant="secondary" className={`${getCrowdColor(selectedLocation.crowdLevel)} text-white`}>
                      {selectedLocation.crowdLevel} crowd
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-slate-300">
                      <MapPin className="w-4 h-4 text-cyan-500" />
                      <span>{selectedLocation.distance} km away</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-slate-300">
                      <Users className="w-4 h-4 text-cyan-500" />
                      <span>M: {selectedLocation.genderRatio.male}% F: {selectedLocation.genderRatio.female}%</span>
                    </div>

                    {selectedLocation.offers && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-white mb-2">Current Offers</h4>
                        {selectedLocation.offers.map((offer, index) => (
                          <Badge key={index} variant="outline" className="mr-2 mb-2 border-orange-500 text-orange-400">
                            {offer}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <button 
                      className="w-full mt-4 bg-cyan-600 hover:bg-cyan-700 text-white py-2 px-4 rounded-lg transition-colors"
                      onClick={() => {/* Navigate to chat */}}
                    >
                      Join Chat ({selectedLocation.distance < 0.5 ? 'Available' : 'Get Closer'})
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Nearby Locations List */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Nearby Places</h3>
                <div className="space-y-3">
                  {locations.slice(0, 3).map((location) => (
                    <div 
                      key={location.id}
                      className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors"
                      onClick={() => setSelectedLocation(location)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 ${getCrowdColor(location.crowdLevel)} rounded-full flex items-center justify-center text-white`}>
                          {getLocationIcon(location.type)}
                        </div>
                        <div>
                          <div className="text-white font-medium">{location.name}</div>
                          <div className="text-slate-400 text-sm">{location.distance} km</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-slate-600 text-slate-300">
                        {location.crowdLevel}
                      </Badge>
                    </div>
                  ))}
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
