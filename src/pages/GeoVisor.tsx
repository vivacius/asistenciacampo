import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeLocations } from '@/hooks/useRealtimeLocations';
import { GeoVisorMap } from '@/components/geovisor/GeoVisorMap';
import { OperariosList } from '@/components/geovisor/OperariosList';
import { Geocerca } from '@/lib/geocerca-utils';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export default function GeoVisor() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { locations, isLoading, error, refetch } = useRealtimeLocations();
  const [geocercas, setGeocercas] = useState<Geocerca[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch geocercas
  useEffect(() => {
    async function fetchGeocercas() {
      const { data } = await supabase
        .from('geocercas')
        .select('*')
        .eq('activa', true);
      
      if (data) {
        setGeocercas(data.map(g => ({
          ...g,
          tipo: g.tipo as 'poligono' | 'radio',
          coordenadas: g.coordenadas as unknown as Geocerca['coordenadas']
        })));
      }
    }
    fetchGeocercas();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/supervisor')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Geo-Visor</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Salir
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row p-4 gap-4">
        {/* Sidebar - Operarios list */}
        <div className="lg:w-80 h-64 lg:h-auto flex-shrink-0">
          <OperariosList
            locations={locations}
            selectedUserId={selectedUserId}
            onSelect={setSelectedUserId}
          />
        </div>

        {/* Map */}
        <div className="flex-1 min-h-[400px] lg:min-h-0">
          {isLoading ? (
            <Skeleton className="h-full w-full rounded-lg" />
          ) : error ? (
            <div className="h-full flex items-center justify-center bg-card rounded-lg border">
              <div className="text-center p-4">
                <p className="text-destructive mb-2">{error}</p>
                <Button variant="outline" onClick={handleRefresh}>
                  Reintentar
                </Button>
              </div>
            </div>
          ) : (
            <GeoVisorMap
              locations={locations}
              geocercas={geocercas}
              selectedUserId={selectedUserId}
              onUserSelect={setSelectedUserId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
