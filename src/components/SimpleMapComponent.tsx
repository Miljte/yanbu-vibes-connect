import React from 'react';
import { MapPin, Navigation, Zap } from 'lucide-react';

interface SimpleMapProps {
  center: { lat: number; lng: number; name: string };
  userLocation: { lat: number; lng: number } | null;
  markers: Array<{
    id: string;
    type: 'place' | 'event';
    latitude: number;
    longitude: number;
    name: string;
    data: any;
  }>;
  onMarkerClick: (marker: any) => void;
}

const SimpleMapComponent: React.FC<SimpleMapProps> = ({ 
  center, 
  userLocation, 
  markers, 
  onMarkerClick 
}) => {
  // Convert lat/lng to relative positions within our mock map
  const getRelativePosition = (lat: number, lng: number) => {
    // Create a simple coordinate system centered on the app center
    const latDiff = (lat - center.lat) * 100000; // Scale factor to make differences visible
    const lngDiff = (lng - center.lng) * 100000;
    
    // Convert to percentages (center the map)
    const x = 50 + (lngDiff * 10); // longitude affects x position
    const y = 50 - (latDiff * 10); // latitude affects y position (inverted for screen coordinates)
    
    // Clamp to map boundaries
    return {
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y))
    };
  };

  return (
    <div className="h-full w-full relative bg-gradient-to-br from-blue-50 via-green-50 to-blue-100 rounded-lg overflow-hidden">
      {/* Map Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        {/* Grid lines */}
        <svg className="w-full h-full">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Decorative Map Elements */}
      <div className="absolute inset-0">
        {/* Mock roads */}
        <div className="absolute top-1/3 left-0 right-0 h-1 bg-gray-300/60"></div>
        <div className="absolute top-2/3 left-0 right-0 h-1 bg-gray-300/60"></div>
        <div className="absolute left-1/4 top-0 bottom-0 w-1 bg-gray-300/60"></div>
        <div className="absolute left-3/4 top-0 bottom-0 w-1 bg-gray-300/60"></div>
        
        {/* Mock water bodies */}
        <div className="absolute top-10 right-10 w-20 h-16 bg-blue-200/70 rounded-full"></div>
        <div className="absolute bottom-20 left-16 w-24 h-20 bg-blue-200/70 rounded-full"></div>
        
        {/* Mock green areas */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-green-200/50 rounded-full"></div>
      </div>

      {/* Center Marker (App Location) */}
      <div 
        className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
        style={{ left: '50%', top: '50%' }}
      >
        <div className="relative">
          <div className="w-6 h-6 bg-indigo-600 rounded-full shadow-lg border-2 border-white flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
            <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-gray-700 shadow-md">
              {center.name}
            </div>
          </div>
          {/* Pulse animation */}
          <div className="absolute inset-0 bg-indigo-400 rounded-full animate-ping opacity-30"></div>
        </div>
      </div>

      {/* User Location */}
      {userLocation && (
        <div 
          className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
          style={{ 
            left: `${getRelativePosition(userLocation.lat, userLocation.lng).x}%`, 
            top: `${getRelativePosition(userLocation.lat, userLocation.lng).y}%` 
          }}
        >
          <div className="relative">
            <div className="w-4 h-4 bg-green-500 rounded-full shadow-lg border-2 border-white flex items-center justify-center">
              <Navigation className="w-2 h-2 text-white" />
            </div>
            <div className="absolute inset-0 bg-green-400 rounded-full animate-pulse opacity-50"></div>
          </div>
        </div>
      )}

      {/* Place and Event Markers */}
      {markers.map((marker) => {
        const position = getRelativePosition(marker.latitude, marker.longitude);
        const isPlace = marker.type === 'place';
        
        return (
          <div 
            key={marker.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer hover:scale-110 transition-transform"
            style={{ 
              left: `${position.x}%`, 
              top: `${position.y}%` 
            }}
            onClick={() => onMarkerClick(marker)}
          >
            <div className="relative group">
              <div className={`w-8 h-8 rounded-full shadow-lg border-2 border-white flex items-center justify-center ${
                isPlace 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                  : 'bg-gradient-to-r from-purple-500 to-purple-600'
              }`}>
                {isPlace ? (
                  <MapPin className="w-4 h-4 text-white" />
                ) : (
                  <Zap className="w-4 h-4 text-white" />
                )}
              </div>
              
              {/* Hover tooltip */}
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap shadow-lg">
                  {marker.name}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-40 space-y-2">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2">
          <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded">
            <span className="text-lg font-bold">+</span>
          </button>
          <div className="border-t border-gray-200 my-1"></div>
          <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded">
            <span className="text-lg font-bold">−</span>
          </button>
        </div>
      </div>

      {/* Map Attribution */}
      <div className="absolute bottom-2 right-2 z-40">
        <div className="bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-gray-600">
          Interactive Map View
        </div>
      </div>

      {/* Loading Overlay */}
      <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Map Ready</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleMapComponent;
