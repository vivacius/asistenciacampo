import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { useOnlineStatus } from './useOnlineStatus';
import { supabase } from '@/integrations/supabase/client';
import { evaluarUbicacion, Geocerca } from '@/lib/geocerca-utils';
import { 
  savePendingLocation, 
  getPendingLocationsByUser, 
  deletePendingLocation,
  getPendingLocationCount 
} from '@/lib/offline-db';

interface LocationState {
  lastUpdate: Date | null;
  pendingCount: number;
  isTracking: boolean;
  error: string | null;
}

const TRACKING_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes

export function useLocationTracking() {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [state, setState] = useState<LocationState>({
    lastUpdate: null,
    pendingCount: 0,
    isTracking: false,
    error: null,
  });
  const [geocercas, setGeocercas] = useState<Geocerca[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCaptureRef = useRef<Date | null>(null);

  // Fetch active geocercas
  const fetchGeocercas = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('geocercas')
        .select('*')
        .eq('activa', true);
      
      if (error) throw error;
      
      setGeocercas(data?.map(g => ({
        ...g,
        tipo: g.tipo as 'poligono' | 'radio',
        coordenadas: g.coordenadas as unknown as Geocerca['coordenadas']
      })) || []);
    } catch (err) {
      console.error('Error fetching geocercas:', err);
    }
  }, [user]);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    if (!user) return;
    const count = await getPendingLocationCount();
    setState(prev => ({ ...prev, pendingCount: count }));
  }, [user]);

  // Capture current location
  const captureLocation = useCallback(async (
    origen: 'entrada' | 'salida' | 'tracking'
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    // Prevent capturing more than once per hour for tracking
    if (origen === 'tracking' && lastCaptureRef.current) {
      const timeSinceLastCapture = Date.now() - lastCaptureRef.current.getTime();
      if (timeSinceLastCapture < TRACKING_INTERVAL_MS) {
        return { success: false, error: 'Captura muy reciente' };
      }
    }

    setState(prev => ({ ...prev, isTracking: true, error: null }));

    try {
      // Get current position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocalización no soportada'));
          return;
        }
        
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude, accuracy } = position.coords;
      
      // Evaluate if inside geocerca
      const { dentro, geocerca } = evaluarUbicacion(latitude, longitude, geocercas);
      
      const locationRecord = {
        id: crypto.randomUUID(),
        user_id: user.id,
        latitud: latitude,
        longitud: longitude,
        precision_gps: accuracy,
        timestamp: new Date().toISOString(),
        fuera_zona: !dentro,
        geocerca_id: geocerca?.id || null,
        origen,
        estado_sync: isOnline ? 'sincronizado' : 'pendiente_sync',
        created_at: new Date().toISOString(),
      };

      if (isOnline) {
        // Save directly to Supabase
        const { error } = await supabase
          .from('ubicaciones_operarios')
          .insert({
            user_id: locationRecord.user_id,
            latitud: locationRecord.latitud,
            longitud: locationRecord.longitud,
            precision_gps: locationRecord.precision_gps,
            timestamp: locationRecord.timestamp,
            fuera_zona: locationRecord.fuera_zona,
            geocerca_id: locationRecord.geocerca_id,
            origen: locationRecord.origen,
            estado_sync: 'sincronizado',
          });
        
        if (error) throw error;
      } else {
        // Save to IndexedDB for later sync
        await savePendingLocation({
          id: locationRecord.id,
          user_id: locationRecord.user_id,
          latitud: locationRecord.latitud,
          longitud: locationRecord.longitud,
          precision_gps: locationRecord.precision_gps,
          timestamp: locationRecord.timestamp,
          fuera_zona: locationRecord.fuera_zona,
          geocerca_id: locationRecord.geocerca_id,
          origen: locationRecord.origen,
        });
      }

      lastCaptureRef.current = new Date();
      setState(prev => ({
        ...prev,
        lastUpdate: new Date(),
        isTracking: false,
      }));
      
      await updatePendingCount();
      
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error capturando ubicación';
      setState(prev => ({ ...prev, isTracking: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, [user, isOnline, geocercas, updatePendingCount]);

  // Sync pending locations when online
  const syncPendingLocations = useCallback(async () => {
    if (!user || !isOnline) return;

    try {
      const pendingLocations = await getPendingLocationsByUser(user.id);
      
      for (const location of pendingLocations) {
        const { error } = await supabase
          .from('ubicaciones_operarios')
          .insert({
            user_id: location.user_id,
            latitud: location.latitud,
            longitud: location.longitud,
            precision_gps: location.precision_gps,
            timestamp: location.timestamp,
            fuera_zona: location.fuera_zona,
            geocerca_id: location.geocerca_id,
            origen: location.origen,
            estado_sync: 'sincronizado',
          });
        
        if (!error) {
          await deletePendingLocation(location.id);
        }
      }
      
      await updatePendingCount();
    } catch (err) {
      console.error('Error syncing locations:', err);
    }
  }, [user, isOnline, updatePendingCount]);

  // Start periodic tracking (every 60 minutes)
  const startTracking = useCallback(() => {
    if (intervalRef.current) return;
    
    intervalRef.current = setInterval(() => {
      captureLocation('tracking');
    }, TRACKING_INTERVAL_MS);
  }, [captureLocation]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (user) {
      fetchGeocercas();
      updatePendingCount();
      startTracking();
    }
    
    return () => {
      stopTracking();
    };
  }, [user, fetchGeocercas, updatePendingCount, startTracking, stopTracking]);

  // Sync when coming online
  useEffect(() => {
    if (isOnline && user) {
      syncPendingLocations();
    }
  }, [isOnline, user, syncPendingLocations]);

  return {
    ...state,
    captureLocation,
    syncPendingLocations,
    geocercas,
    refetchGeocercas: fetchGeocercas,
  };
}
