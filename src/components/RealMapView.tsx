import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const createCustomIcon = (color: string, type: 'place' | 'event' | 'user') => {
  const iconHtml = type === 'place' 
    ? `<div style="background: linear-gradient(135deg, ${color} 0%, ${color}88 100%); width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
       </div>`
    : type === 'event'
    ? `<div style="background: linear-gradient(135deg, ${color} 0%, ${color}88 100%); width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
          <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
        </svg>
       </div>`
    : `<div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 12px rgba(16,185,129,0.4); display: flex; align-items: center; justify-content: center; animation: pulse 2s infinite;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <circle cx="12" cy="12" r="3"/>
        </svg>
       </div>`;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-div-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
};

interface MapMarker {
  id: string;
  type: 'place' | 'event';
  latitude: number;
  longitude: number;
  name: string;
  data: any;
}

interface AppCenter {
  name: string;
  lat: number;
  lng: number;
  country: string;
}

export interface RealMapViewProps {
  center: AppCenter;
  userLocation: {lat: number, lng: number} | null;
  markers: MapMarker[];
  onMarkerClick: (marker: MapMarker) => void;
}

// Component to update map center when it changes
const MapUpdater: React.FC<{ center: AppCenter }> = ({ center }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView([center.lat, center.lng], 13);
  }, [center, map]);
  
  return null;
};

// Component to add user location marker
const UserLocationMarker: React.FC<{ userLocation: {lat: number, lng: number} | null }> = ({ userLocation }) => {
  if (!userLocation) return null;
  
  return (
    <Marker
      position={[userLocation.lat, userLocation.lng]}
      icon={createCustomIcon('#10b981', 'user')}
      zIndexOffset={1000}
    >
      <Popup>
        <div className="text-center p-2">
          <div className="font-semibold text-green-600">Your Location</div>
          <div className="text-sm text-gray-600">Live GPS tracking</div>
        </div>
      </Popup>
    </Marker>
  );
};

const RealMapView: React.FC<RealMapViewProps> = ({ 
  center, 
  userLocation, 
  markers, 
  onMarkerClick 
}) => {
  const mapRef = useRef<L.Map | null>(null);

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={13}
        className="h-full w-full rounded-lg"
        ref={mapRef}
        scrollWheelZoom={true}
        zoomControl={true}
        style={{ zIndex: 1 }}
      >
        {/* Map tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Update map center when it changes */}
        <MapUpdater center={center} />
        
        {/* User location marker */}
        <UserLocationMarker userLocation={userLocation} />
        
        {/* Place and event markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.latitude, marker.longitude]}
            icon={createCustomIcon(
              marker.type === 'place' ? '#6366f1' : '#8b5cf6',
              marker.type
            )}
            eventHandlers={{
              click: () => onMarkerClick(marker)
            }}
          >
            <Popup>
              <div className="min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${
                    marker.type === 'place' ? 'bg-blue-500' : 'bg-purple-500'
                  }`}></div>
                  <h3 className="font-semibold">{marker.name}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {marker.type === 'place' 
                    ? marker.data.description 
                    : marker.data.description}
                </p>
                <div className="flex gap-1">
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    marker.type === 'place' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {marker.type === 'place' ? marker.data.type : 'event'}
                  </span>
                  {marker.data.distance && (
                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                      📍 {marker.data.distance < 1000 
                        ? `${Math.round(marker.data.distance)}m` 
                        : `${(marker.data.distance / 1000).toFixed(1)}km`}
                    </span>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Map Controls Overlay */}
      <div className="absolute top-4 right-4 z-[1000] space-y-2">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 text-xs text-gray-600">
          <div className="font-semibold">{center.name}</div>
          <div>{center.country}</div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3">
        <div className="text-xs font-semibold mb-2 text-gray-700">Legend</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">Places</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span className="text-gray-600">Events</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-gray-600">Your Location</span>
          </div>
        </div>
      </div>
      
      {/* CSS for animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
        
        .custom-div-icon {
          background: none !important;
          border: none !important;
        }
        
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        
        .leaflet-popup-tip {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
};

export default RealMapView;
