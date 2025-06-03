
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MerchantData {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  merchant_id: string;
  distance?: number;
  image_urls?: string[];
  description?: string;
}

interface UseOptimizedMerchantsProps {
  userLocation?: { latitude: number; longitude: number };
  maxDistance?: number;
}

export const useOptimizedMerchants = ({
  userLocation,
  maxDistance = 5000
}: UseOptimizedMerchantsProps) => {
  const [merchants, setMerchants] = useState<MerchantData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const cacheRef = useRef<Map<string, { data: MerchantData[]; timestamp: number }>>(new Map());
  const lastFetchRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  const fetchMerchants = useCallback(async () => {
    // Prevent excessive API calls
    const now = Date.now();
    if (now - lastFetchRef.current < 2000) return;
    lastFetchRef.current = now;

    // Check cache first
    const cacheKey = userLocation ? `${userLocation.latitude}-${userLocation.longitude}` : 'all';
    const cached = cacheRef.current.get(cacheKey);
    if (cached && now - cached.timestamp < 30000) { // 30 second cache
      setMerchants(cached.data);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Fetching optimized merchants data...');
      
      let query = supabase
        .from('places')
        .select('id, name, type, latitude, longitude, is_active, merchant_id, image_urls, description')
        .eq('is_active', true);

      // Add location-based filtering if available
      if (userLocation) {
        // Use PostGIS for efficient geo-queries (if available) or fallback to client-side filtering
        query = query.limit(100); // Limit results for performance
      }

      const { data, error: fetchError } = await query.abortSignal(abortControllerRef.current.signal);

      if (fetchError) throw fetchError;

      let processedMerchants = data || [];

      // Calculate distances and filter by range
      if (userLocation) {
        processedMerchants = processedMerchants
          .map(merchant => ({
            ...merchant,
            distance: calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              merchant.latitude,
              merchant.longitude
            )
          }))
          .filter(merchant => merchant.distance <= maxDistance)
          .sort((a, b) => (a.distance || 0) - (b.distance || 0));
      }

      // Cache the results
      cacheRef.current.set(cacheKey, {
        data: processedMerchants,
        timestamp: now
      });

      setMerchants(processedMerchants);
      console.log('✅ Merchants loaded:', processedMerchants.length);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('❌ Error fetching merchants:', error);
        setError('Failed to load merchants');
        toast.error('Failed to load nearby merchants');
      }
    } finally {
      setLoading(false);
    }
  }, [userLocation, maxDistance, calculateDistance]);

  useEffect(() => {
    fetchMerchants();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchMerchants]);

  const refreshMerchants = useCallback(() => {
    // Clear cache and refetch
    cacheRef.current.clear();
    lastFetchRef.current = 0;
    fetchMerchants();
  }, [fetchMerchants]);

  return {
    merchants,
    loading,
    error,
    refreshMerchants,
    merchantCount: merchants.length
  };
};
