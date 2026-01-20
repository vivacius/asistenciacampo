// Utility functions for geofence calculations

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface PolygonGeocerca {
  tipo: 'poligono';
  coordenadas: Coordinate[];
}

export interface CircleGeocerca {
  tipo: 'radio';
  coordenadas: {
    center: Coordinate;
    radius_m: number;
  };
}

export interface Geocerca {
  id: string;
  nombre: string;
  tipo: 'poligono' | 'radio';
  coordenadas: Coordinate[] | { center: Coordinate; radius_m: number };
  color: string;
  activa: boolean;
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export function pointInPolygon(lat: number, lng: number, polygon: Coordinate[]): boolean {
  if (polygon.length < 3) return false;
  
  let inside = false;
  const n = polygon.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].lat;
    const yi = polygon[i].lng;
    const xj = polygon[j].lat;
    const yj = polygon[j].lng;
    
    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
export function haversineDistance(
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Check if a point is inside a circle
 */
export function pointInCircle(
  lat: number, 
  lng: number, 
  center: Coordinate, 
  radiusMeters: number
): boolean {
  const distance = haversineDistance(lat, lng, center.lat, center.lng);
  return distance <= radiusMeters;
}

/**
 * Evaluate if a location is inside any active geocerca
 * Returns the geocerca info if inside, null if outside all
 */
export function evaluarUbicacion(
  lat: number, 
  lng: number, 
  geocercas: Geocerca[]
): { dentro: boolean; geocerca?: Geocerca } {
  for (const geocerca of geocercas) {
    if (!geocerca.activa) continue;
    
    if (geocerca.tipo === 'poligono') {
      const coords = geocerca.coordenadas as Coordinate[];
      if (pointInPolygon(lat, lng, coords)) {
        return { dentro: true, geocerca };
      }
    } else if (geocerca.tipo === 'radio') {
      const circle = geocerca.coordenadas as { center: Coordinate; radius_m: number };
      if (pointInCircle(lat, lng, circle.center, circle.radius_m)) {
        return { dentro: true, geocerca };
      }
    }
  }
  
  return { dentro: false };
}

/**
 * Get the age of a timestamp in hours
 */
export function getLocationAgeHours(timestamp: string): number {
  const now = new Date();
  const locationTime = new Date(timestamp);
  const diffMs = now.getTime() - locationTime.getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Determine marker color based on location status
 * Green: inside geocerca
 * Red: outside geocerca
 * Yellow: location older than 2 hours
 */
export function getMarkerColor(fuera_zona: boolean, timestamp: string): 'green' | 'red' | 'yellow' {
  const ageHours = getLocationAgeHours(timestamp);
  
  if (ageHours > 2) {
    return 'yellow';
  }
  
  return fuera_zona ? 'red' : 'green';
}
