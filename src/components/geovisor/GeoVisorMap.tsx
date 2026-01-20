import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { OperarioMarker } from './OperarioMarker';
import { GeocercaLayer } from './GeocercaLayer';
import { MapLegend } from './MapLegend';
import { OperarioLocation } from '@/hooks/useRealtimeLocations';
import { Geocerca } from '@/lib/geocerca-utils';

// Fix for default markers not showing
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface GeoVisorMapProps {
  locations: OperarioLocation[];
  geocercas: Geocerca[];
  selectedUserId?: string | null;
  onUserSelect?: (userId: string | null) => void;
}

// Component to handle map centering
function MapController({ locations, selectedUserId }: { 
  locations: OperarioLocation[]; 
  selectedUserId?: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedUserId) {
      const location = locations.find(l => l.user_id === selectedUserId);
      if (location) {
        map.setView([location.latitud, location.longitud], 15, { animate: true });
      }
    } else if (locations.length > 0) {
      const bounds = L.latLngBounds(
        locations.map(l => [l.latitud, l.longitud] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, locations, selectedUserId]);

  return null;
}

export function GeoVisorMap({ 
  locations, 
  geocercas, 
  selectedUserId,
  onUserSelect 
}: GeoVisorMapProps) {
  // Default center: Colombia
  const defaultCenter: [number, number] = [4.5709, -74.2973];
  const defaultZoom = 6;

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="h-full w-full rounded-lg"
        style={{ minHeight: '400px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController locations={locations} selectedUserId={selectedUserId} />
        
        {/* Render geocercas */}
        {geocercas.map(geocerca => (
          <GeocercaLayer key={geocerca.id} geocerca={geocerca} />
        ))}
        
        {/* Render operario markers */}
        {locations.map(location => (
          <OperarioMarker
            key={location.user_id}
            location={location}
            isSelected={selectedUserId === location.user_id}
            onClick={() => onUserSelect?.(
              selectedUserId === location.user_id ? null : location.user_id
            )}
          />
        ))}
      </MapContainer>
      
      <MapLegend />
    </div>
  );
}
