
import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from './useLocation';

interface MarkerData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  distance?: number;
  isActive: boolean;
  count?: number;
  places?: MarkerData[];
}

interface UseOptimizedMarkersProps {
  places: MarkerData[];
  maxDistance?: number;
  clusterThreshold?: number;
}

export const useOptimizedMarkers = ({ 
  places, 
  maxDistance = 10000,
  clusterThreshold = 5 
}: UseOptimizedMarkersProps) => {
  const [visibleMarkers, setVisibleMarkers] = useState<MarkerData[]>([]);
  const [clusteredMarkers, setClusteredMarkers] = useState<any[]>([]);
  const { location, calculateDistance } = useLocation();
  const throttleRef = useRef<NodeJS.Timeout | null>(null);

  // Throttled marker processing to prevent excessive renders
  const processMarkers = useCallback(() => {
    if (!location) {
      setVisibleMarkers([]);
      return;
    }

    // Calculate distances and filter
    const markersWithDistance = places
      .filter(place => place.isActive)
      .map(place => ({
        ...place,
        distance: calculateDistance(
          location.latitude,
          location.longitude,
          place.latitude,
          place.longitude
        )
      }))
      .filter(place => place.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);

    // Simple clustering logic for performance
    const clusters: { [key: string]: MarkerData[] } = {};
    const gridSize = 0.001; // ~100m grid

    markersWithDistance.forEach(marker => {
      const gridX = Math.floor(marker.latitude / gridSize);
      const gridY = Math.floor(marker.longitude / gridSize);
      const key = `${gridX},${gridY}`;
      
      if (!clusters[key]) clusters[key] = [];
      clusters[key].push(marker);
    });

    // Create clustered markers
    const processed = Object.values(clusters).flatMap(cluster => {
      if (cluster.length >= clusterThreshold) {
        // Create cluster marker
        const avgLat = cluster.reduce((sum, m) => sum + m.latitude, 0) / cluster.length;
        const avgLng = cluster.reduce((sum, m) => sum + m.longitude, 0) / cluster.length;
        return [{
          id: `cluster_${cluster[0].id}`,
          name: `${cluster.length} places`,
          latitude: avgLat,
          longitude: avgLng,
          type: 'cluster',
          distance: Math.min(...cluster.map(m => m.distance)),
          isActive: true,
          count: cluster.length,
          places: cluster
        }];
      }
      return cluster;
    });

    setVisibleMarkers(processed);
  }, [places, location, calculateDistance, maxDistance, clusterThreshold]);

  // Throttle marker updates
  useEffect(() => {
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
    }

    throttleRef.current = setTimeout(() => {
      processMarkers();
    }, 500); // Update markers at most every 500ms

    return () => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, [processMarkers]);

  return {
    visibleMarkers,
    isLoading: !location,
    markerCount: visibleMarkers.length,
    totalPlaces: places.length
  };
};
