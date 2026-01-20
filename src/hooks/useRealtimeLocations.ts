import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface OperarioLocation {
  id: string;
  user_id: string;
  latitud: number;
  longitud: number;
  precision_gps: number | null;
  timestamp: string;
  fuera_zona: boolean;
  origen: string;
  profile?: {
    nombre: string;
  };
}

export function useRealtimeLocations() {
  const { user, role } = useAuth();
  const [locations, setLocations] = useState<Map<string, OperarioLocation>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch latest location for each operario
  const fetchLatestLocations = useCallback(async () => {
    if (!user || role !== 'supervisor') return;

    try {
      setIsLoading(true);
      setError(null);

      // Get all unique user_ids from ubicaciones_operarios
      // and their latest location
      const { data: latestLocations, error: locError } = await supabase
        .from('ubicaciones_operarios')
        .select(`
          id,
          user_id,
          latitud,
          longitud,
          precision_gps,
          timestamp,
          fuera_zona,
          origen
        `)
        .order('timestamp', { ascending: false });

      if (locError) throw locError;

      // Get profiles for all users
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, nombre')
        .eq('activo', true);

      if (profError) throw profError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Group by user_id and take the latest
      const locationMap = new Map<string, OperarioLocation>();
      
      for (const loc of latestLocations || []) {
        if (!locationMap.has(loc.user_id)) {
          locationMap.set(loc.user_id, {
            ...loc,
            profile: profileMap.get(loc.user_id),
          });
        }
      }

      setLocations(locationMap);
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError(err instanceof Error ? err.message : 'Error cargando ubicaciones');
    } finally {
      setIsLoading(false);
    }
  }, [user, role]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user || role !== 'supervisor') return;

    fetchLatestLocations();

    // Subscribe to new inserts on ubicaciones_operarios
    const channel = supabase
      .channel('ubicaciones-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ubicaciones_operarios',
        },
        async (payload) => {
          const newLocation = payload.new as OperarioLocation;
          
          // Fetch profile for this user
          const { data: profile } = await supabase
            .from('profiles')
            .select('nombre')
            .eq('id', newLocation.user_id)
            .single();

          setLocations(prev => {
            const updated = new Map(prev);
            updated.set(newLocation.user_id, {
              ...newLocation,
              profile: profile || undefined,
            });
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, role, fetchLatestLocations]);

  return {
    locations: Array.from(locations.values()),
    isLoading,
    error,
    refetch: fetchLatestLocations,
  };
}
