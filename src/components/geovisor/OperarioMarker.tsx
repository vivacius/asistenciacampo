import { Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useEffect, useRef } from 'react';
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

export function OperarioMarker({ location, isSelected, onClick }: OperarioMarkerProps): React.ReactElement | null {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const color = getMarkerColor(location.fuera_zona, location.timestamp);
  const icon = createWorkerIcon(color);

  const statusText = {
    green: 'Dentro de zona',
    red: 'Fuera de zona',
    yellow: 'Ubicación antigua (>2h)',
  };

  // Create and manage marker imperatively
  useEffect(() => {
    const marker = L.marker([location.latitud, location.longitud], { icon })
      .addTo(map)
      .on('click', onClick);
    
    markerRef.current = marker;
    
    // Bind popup
    const popupContent = `
      <div style="min-width: 200px; padding: 4px;">
        <h3 style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">
          ${location.profile?.nombre || 'Usuario desconocido'}
        </h3>
        <div style="font-size: 12px;">
          <p style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${
              color === 'green' ? '#22c55e' : color === 'red' ? '#ef4444' : '#eab308'
            };"></span>
            <span>${statusText[color]}</span>
          </p>
          <p style="color: #666; margin-bottom: 4px;">
            <strong>Última actualización:</strong><br/>
            ${format(new Date(location.timestamp), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
          </p>
          ${location.precision_gps ? `
            <p style="color: #666; margin-bottom: 4px;">
              <strong>Precisión GPS:</strong> ±${Math.round(location.precision_gps)}m
            </p>
          ` : ''}
          <p style="color: #666;">
            <strong>Origen:</strong> ${location.origen}
          </p>
        </div>
      </div>
    `;
    
    marker.bindPopup(popupContent);
    
    return () => {
      marker.remove();
    };
  }, [map, location, icon, onClick, color]);

  return null;
}
