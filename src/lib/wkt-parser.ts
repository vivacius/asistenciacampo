import proj4 from 'proj4';
import * as XLSX from 'xlsx';
import { Coordinate } from './geocerca-utils';

// Define EPSG:3116 - MAGNA-SIRGAS / Colombia Bogota zone
proj4.defs('EPSG:3116', '+proj=tmerc +lat_0=4.596200416666666 +lon_0=-74.07750791666666 +k=1 +x_0=1000000 +y_0=1000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

export interface RawGeocerca {
  nom: string;
  hacSte: string;
  wkt: string;
}

export interface ParsedGeocerca {
  nombre: string;
  tipo: 'poligono';
  coordenadas: Coordinate[];
  color: string;
  activa: boolean;
}

/**
 * Parse WKT string and extract coordinates
 * Supports POLYGON and MULTIPOLYGON (takes first polygon)
 */
export function parseWKT(wkt: string): { x: number; y: number }[] {
  if (!wkt || typeof wkt !== 'string') {
    return [];
  }

  // Normalize the WKT string
  const normalized = wkt.trim().toUpperCase();
  
  let coordString = '';
  
  if (normalized.startsWith('MULTIPOLYGON')) {
    // Extract first polygon from MULTIPOLYGON
    // Format: MULTIPOLYGON (((x y, x y, ...)), ((x y, ...)))
    const match = wkt.match(/\(\(\(([\d\s.,\-]+)\)\)\)/);
    if (match) {
      coordString = match[1];
    }
  } else if (normalized.startsWith('POLYGON')) {
    // Extract coordinates from POLYGON
    // Format: POLYGON ((x y, x y, ...))
    const match = wkt.match(/\(\(([\d\s.,\-]+)\)\)/);
    if (match) {
      coordString = match[1];
    }
  }

  if (!coordString) {
    return [];
  }

  // Parse coordinate pairs
  const pairs = coordString.split(',').map(pair => pair.trim());
  const coordinates: { x: number; y: number }[] = [];

  for (const pair of pairs) {
    const parts = pair.split(/\s+/).filter(p => p.length > 0);
    if (parts.length >= 2) {
      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      if (!isNaN(x) && !isNaN(y)) {
        coordinates.push({ x, y });
      }
    }
  }

  return coordinates;
}

/**
 * Transform coordinates from EPSG:3116 to WGS84 (EPSG:4326)
 */
export function transformCoordinates(coords: { x: number; y: number }[]): Coordinate[] {
  return coords.map(({ x, y }) => {
    try {
      const [lng, lat] = proj4('EPSG:3116', 'EPSG:4326', [x, y]);
      return { lat, lng };
    } catch (e) {
      console.error('Error transforming coordinates:', e);
      return { lat: 0, lng: 0 };
    }
  }).filter(c => c.lat !== 0 && c.lng !== 0);
}

/**
 * Generate a random color for geocercas
 */
function generateColor(index: number): string {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#84CC16', // lime
    '#F97316', // orange
    '#6366F1', // indigo
  ];
  return colors[index % colors.length];
}

/**
 * Parse Excel file and extract geocercas
 */
export async function parseExcelGeocercas(
  file: File,
  onProgress?: (processed: number, total: number) => void
): Promise<ParsedGeocerca[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
        
        const geocercas: ParsedGeocerca[] = [];
        const total = rows.length;
        
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          
          // Find the geometry column (could be 'geometry_wkt', 'geometry', 'wkt', etc.)
          const wktKey = Object.keys(row).find(k => 
            k.toLowerCase().includes('geometry') || k.toLowerCase().includes('wkt')
          );
          
          // Find the name columns
          const nomKey = Object.keys(row).find(k => 
            k.toLowerCase() === 'nom' || k.toLowerCase().includes('nombre')
          );
          
          const hacSteKey = Object.keys(row).find(k => 
            k.toLowerCase().includes('hac_ste') || k.toLowerCase().includes('codigo')
          );
          
          if (!wktKey) continue;
          
          const wkt = String(row[wktKey] || '');
          const nom = String(row[nomKey as string] || '');
          const hacSte = String(row[hacSteKey as string] || '');
          
          // Parse WKT
          const rawCoords = parseWKT(wkt);
          if (rawCoords.length < 3) continue;
          
          // Transform coordinates
          const coordenadas = transformCoordinates(rawCoords);
          if (coordenadas.length < 3) continue;
          
          // Create geocerca object
          const nombre = hacSte && nom 
            ? `${hacSte} - ${nom}` 
            : nom || hacSte || `Geocerca ${i + 1}`;
          
          geocercas.push({
            nombre,
            tipo: 'poligono',
            coordenadas,
            color: generateColor(i),
            activa: true
          });
          
          // Report progress
          if (onProgress && i % 50 === 0) {
            onProgress(i + 1, total);
          }
        }
        
        onProgress?.(total, total);
        resolve(geocercas);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsArrayBuffer(file);
  });
}
