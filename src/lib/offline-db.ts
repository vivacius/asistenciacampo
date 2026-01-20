import { openDB, IDBPDatabase } from 'idb';

export interface PendingRecord {
  id: string;
  user_id: string;
  fecha: string;
  tipo_registro: 'entrada' | 'salida';
  timestamp: string;
  latitud: number | null;
  longitud: number | null;
  precision_gps: number | null;
  fuera_zona: boolean;
  foto_blob: Blob | null;
  foto_url: string | null;
  es_inconsistente: boolean;
  nota_inconsistencia: string | null;
  created_at: string;
}

export interface PendingLocation {
  id: string;
  user_id: string;
  latitud: number;
  longitud: number;
  precision_gps: number | null;
  timestamp: string;
  fuera_zona: boolean;
  geocerca_id: string | null;
  origen: 'entrada' | 'salida' | 'tracking';
}

const DB_NAME = 'asistencia-agricola';
const DB_VERSION = 2;
const STORE_PENDING = 'pending-records';
const STORE_PENDING_LOCATIONS = 'pending-locations';

let dbInstance: IDBPDatabase | null = null;

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Existing pending records store
      if (!db.objectStoreNames.contains(STORE_PENDING)) {
        const store = db.createObjectStore(STORE_PENDING, { keyPath: 'id' });
        store.createIndex('user_id', 'user_id');
        store.createIndex('fecha', 'fecha');
        store.createIndex('timestamp', 'timestamp');
      }
      
      // New pending locations store (added in version 2)
      if (!db.objectStoreNames.contains(STORE_PENDING_LOCATIONS)) {
        const locStore = db.createObjectStore(STORE_PENDING_LOCATIONS, { keyPath: 'id' });
        locStore.createIndex('user_id', 'user_id');
        locStore.createIndex('timestamp', 'timestamp');
      }
    },
  });

  return dbInstance;
}

export async function savePendingRecord(record: PendingRecord): Promise<void> {
  const db = await getDB();
  await db.put(STORE_PENDING, record);
}

export async function getPendingRecords(): Promise<PendingRecord[]> {
  const db = await getDB();
  return db.getAll(STORE_PENDING);
}

export async function getPendingRecordsByUser(userId: string): Promise<PendingRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex(STORE_PENDING, 'user_id', userId);
}

export async function deletePendingRecord(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_PENDING, id);
}

export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  return db.count(STORE_PENDING);
}

export async function clearAllPendingRecords(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_PENDING);
}

// Location-specific functions
export async function savePendingLocation(location: PendingLocation): Promise<void> {
  const db = await getDB();
  await db.put(STORE_PENDING_LOCATIONS, location);
}

export async function getPendingLocations(): Promise<PendingLocation[]> {
  const db = await getDB();
  return db.getAll(STORE_PENDING_LOCATIONS);
}

export async function getPendingLocationsByUser(userId: string): Promise<PendingLocation[]> {
  const db = await getDB();
  return db.getAllFromIndex(STORE_PENDING_LOCATIONS, 'user_id', userId);
}

export async function deletePendingLocation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_PENDING_LOCATIONS, id);
}

export async function getPendingLocationCount(): Promise<number> {
  const db = await getDB();
  return db.count(STORE_PENDING_LOCATIONS);
}
