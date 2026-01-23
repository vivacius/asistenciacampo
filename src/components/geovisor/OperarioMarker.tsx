import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import React from 'react';
import { getMarkerColor } from '@/lib/geocerca-utils';
import { OperarioLocation } from '@/hooks/useRealtimeLocations';

interface OperarioMarkerProps {
  location: OperarioLocation;
  isSelected: boolean;
  onClick: () => void;
}

// Create custom worker icons based on status
function createWorkerIcon(status: 'green' | 'red' | 'yellow'): L.Icon {
  // green = dentro de zona, red = fuera de zona, yellow = ubicación antigua
  const iconUrl = status === 'green' 
    ? '/images/worker_ok.png' 
    : '/images/worker_alert.png';

  return L.icon({
    iconUrl,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
}

const statusText: Record<'green' | 'red' | 'yellow', string> = {
  green: 'Dentro de zona',
  red: 'Fuera de zona',
  yellow: 'Ubicación antigua (>2h)',
};

export function OperarioMarker({ location, isSelected, onClick }: OperarioMarkerProps): React.ReactElement {
  const color = getMarkerColor(location.fuera_zona, location.timestamp);
  const icon = createWorkerIcon(color);

  const colorMap = {
    green: '#22c55e',
    red: '#ef4444',
    yellow: '#eab308',
  };

  return (
    <Marker
      position={[location.latitud, location.longitud]}
      icon={icon}
      eventHandlers={{
        click: onClick,
      }}
    >
      <Popup>
        <div className="min-w-[200px] p-1">
          <h3 className="font-bold text-sm mb-2">
            {location.profile?.nombre || 'Usuario desconocido'}
          </h3>
          <div className="text-xs space-y-1">
            <p className="flex items-center gap-2">
              <span 
                className="inline-block w-3 h-3 rounded-full" 
                style={{ backgroundColor: colorMap[color] }}
              />
              <span>{statusText[color]}</span>
            </p>
            <p className="text-muted-foreground">
              <strong>Última actualización:</strong><br/>
              {format(new Date(location.timestamp), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
            </p>
            {location.precision_gps && (
              <p className="text-muted-foreground">
                <strong>Precisión GPS:</strong> ±{Math.round(location.precision_gps)}m
              </p>
            )}
            <p className="text-muted-foreground">
              <strong>Origen:</strong> {location.origen}
            </p>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
