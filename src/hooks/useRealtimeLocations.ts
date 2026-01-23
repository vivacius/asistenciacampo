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

  // Fetch latest location for each operario from registros_asistencia
  const fetchLatestLocations = useCallback(async () => {
    if (!user || role !== 'supervisor') return;

    try {
      setIsLoading(true);
      setError(null);

      // Get all records from registros_asistencia with location data
      const { data: latestRecords, error: locError } = await supabase
        .from('registros_asistencia')
        .select(`
          id,
          user_id,
          latitud,
          longitud,
          precision_gps,
          timestamp,
          fuera_zona,
          tipo_registro
        `)
        .not('latitud', 'is', null)
        .not('longitud', 'is', null)
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
      
      for (const record of latestRecords || []) {
        if (!locationMap.has(record.user_id) && record.latitud && record.longitud) {
          locationMap.set(record.user_id, {
            id: record.id,
            user_id: record.user_id,
            latitud: record.latitud,
            longitud: record.longitud,
            precision_gps: record.precision_gps,
            timestamp: record.timestamp,
            fuera_zona: record.fuera_zona,
            origen: record.tipo_registro, // Map tipo_registro to origen
            profile: profileMap.get(record.user_id),
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

    // Subscribe to new inserts on registros_asistencia
    const channel = supabase
      .channel('asistencia-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'registros_asistencia',
        },
        async (payload) => {
          const newRecord = payload.new as {
            id: string;
            user_id: string;
            latitud: number | null;
            longitud: number | null;
            precision_gps: number | null;
            timestamp: string;
            fuera_zona: boolean;
            tipo_registro: string;
          };
          
          // Only update if has location data
          if (!newRecord.latitud || !newRecord.longitud) return;
          
          // Fetch profile for this user
          const { data: profile } = await supabase
            .from('profiles')
            .select('nombre')
            .eq('id', newRecord.user_id)
            .single();

          setLocations(prev => {
            const updated = new Map(prev);
            updated.set(newRecord.user_id, {
              id: newRecord.id,
              user_id: newRecord.user_id,
              latitud: newRecord.latitud!,
              longitud: newRecord.longitud!,
              precision_gps: newRecord.precision_gps,
              timestamp: newRecord.timestamp,
              fuera_zona: newRecord.fuera_zona,
              origen: newRecord.tipo_registro,
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
