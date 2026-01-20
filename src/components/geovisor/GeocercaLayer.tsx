import { Polygon, Circle, Tooltip } from 'react-leaflet';
import { Geocerca, Coordinate } from '@/lib/geocerca-utils';

interface GeocercaLayerProps {
  geocerca: Geocerca;
}

export function GeocercaLayer({ geocerca }: GeocercaLayerProps) {
  const fillOpacity = 0.2;
  const strokeOpacity = 0.8;

  if (geocerca.tipo === 'poligono') {
    const coordinates = geocerca.coordenadas as Coordinate[];
    const positions: [number, number][] = coordinates.map(c => [c.lat, c.lng]);

    return (
      <Polygon
        positions={positions}
        pathOptions={{
          color: geocerca.color,
          fillColor: geocerca.color,
          fillOpacity,
          opacity: strokeOpacity,
          weight: 2,
        }}
      >
        <Tooltip permanent={false} direction="center">
          {geocerca.nombre}
        </Tooltip>
      </Polygon>
    );
  }

  if (geocerca.tipo === 'radio') {
    const circle = geocerca.coordenadas as { center: Coordinate; radius_m: number };
    
    return (
      <Circle
        center={[circle.center.lat, circle.center.lng]}
        radius={circle.radius_m}
        pathOptions={{
          color: geocerca.color,
          fillColor: geocerca.color,
          fillOpacity,
          opacity: strokeOpacity,
          weight: 2,
        }}
      >
        <Tooltip permanent={false} direction="center">
          {geocerca.nombre}
        </Tooltip>
      </Circle>
    );
  }

  return null;
}
