import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapClickHandlerProps {
  onLocationSelect?: (lat: number, lng: number) => void;
}

const MapClickHandler: React.FC<MapClickHandlerProps> = ({ onLocationSelect }) => {
  useMapEvents({
    click: (e) => {
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

interface MapMarker {
  id: string;
  type: 'place' | 'event';
  latitude: number;
  longitude: number;
  name: string;
  data: any;
}

interface LeafletMapComponentProps {
  center: { lat: number; lng: number; name: string };
  userLocation: { lat: number; lng: number } | null;
  markers: MapMarker[];
  onMarkerClick: (marker: MapMarker) => void;
  onLocationSelect?: (lat: number, lng: number) => void;
}

const LeafletMapComponent: React.FC<LeafletMapComponentProps> = ({ 
  center, 
  userLocation,
  markers,
  onMarkerClick,
  onLocationSelect 
}) => {
  const mapCenter: LatLngTuple = [center.lat, center.lng];

  // Create custom icons for different marker types
  const placeIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const eventIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 0C5.6 0 0 5.6 0 12.5S12.5 41 12.5 41 25 19.4 25 12.5 19.4 0 12.5 0z" fill="#8b5cf6"/>
        <circle cx="12.5" cy="12.5" r="6" fill="white"/>
      </svg>
    `),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
  });

  const userIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="10" fill="#10b981"/>
        <circle cx="10" cy="10" r="6" fill="white"/>
        <circle cx="10" cy="10" r="3" fill="#10b981"/>
      </svg>
    `),
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
  });

  return (
    <MapContainer
      center={mapCenter}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {/* User location marker */}
      {userLocation && (
        <Marker 
          position={[userLocation.lat, userLocation.lng]} 
          icon={userIcon}
        >
          <Popup>
            <div className="text-center">
              <strong>Your Location</strong>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Place and event markers */}
      {markers.map((marker) => (
        <Marker 
          key={marker.id}
          position={[marker.latitude, marker.longitude]}
          icon={marker.type === 'place' ? placeIcon : eventIcon}
          eventHandlers={{
            click: () => onMarkerClick(marker)
          }}
        >
          <Popup>
            <div className="min-w-48">
              <h3 className="font-semibold text-sm mb-2">{marker.name}</h3>
              <p className="text-xs text-gray-600 mb-2">
                {marker.type === 'place' ? marker.data.description : marker.data.description}
              </p>
              <div className="flex items-center justify-between">
                <span className={`inline-block px-2 py-1 rounded text-xs ${
                  marker.type === 'place' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {marker.type === 'place' ? marker.data.type : 'Event'}
                </span>
                {marker.data.distance && (
                  <span className="text-xs text-gray-500">
                    {marker.data.distance < 1000 
                      ? `${Math.round(marker.data.distance)}m` 
                      : `${(marker.data.distance / 1000).toFixed(1)}km`}
                  </span>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      <MapClickHandler onLocationSelect={onLocationSelect} />
    </MapContainer>
  );
};

export default LeafletMapComponent;
