import { openDB, deleteDB, IDBPDatabase, DBSchema } from 'idb';

export interface PendingRecord {
  id: string;
  user_id: string;
  fecha: string; // YYYY-MM-DD
  tipo_registro: 'entrada' | 'salida';
  timestamp: string; // ISO
  latitud: number | null;
  longitud: number | null;
  precision_gps: number | null;
  fuera_zona: boolean;
  foto_blob: Blob | null;
  foto_url: string | null;
  es_inconsistente: boolean;
  nota_inconsistencia: string | null;
  created_at: string; // ISO
  hac_ste?: string | null;
  suerte_nom?: string | null;
}

export interface PendingTrackPoint {
  id: string;
  user_id: string;
  fecha: string; // YYYY-MM-DD
  entrada_id: string | null;
  recorded_at: string; // ISO
  latitud: number | null;
  longitud: number | null;
  precision_gps: number | null;
  hac_ste: string | null;
  suerte_nom: string | null;
  fuera_zona: boolean;
  source: 'hourly' | 'entrada' | 'salida' | 'manual';
  created_at: string; // ISO
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

  const trackingOk =
    db.objectStoreNames.contains(STORE_TRACKING);

  // Si falta algún store, ya está mal
  if (!pendingOk || !trackingOk) return false;

  // Validación de índices: toca abrir transaction readonly para leer indexNames
  // (IDBDatabase no expone indexNames directamente)
  // Si esto falla, lo tomamos como mismatch.
  try {
    const tx = db.transaction([STORE_PENDING, STORE_TRACKING], 'readonly');

    const pendingStore = tx.objectStore(STORE_PENDING);
    const trackingStore = tx.objectStore(STORE_TRACKING);

    const pendingIndexes = pendingStore.indexNames;
    const trackingIndexes = trackingStore.indexNames;

    const pendingNeed = ['user_id', 'fecha', 'timestamp', 'user_fecha'];
    const trackingNeed = ['user_id', 'fecha', 'recorded_at', 'user_fecha', 'entrada_id'];

    for (const idx of pendingNeed) if (!pendingIndexes.contains(idx)) return false;
    for (const idx of trackingNeed) if (!trackingIndexes.contains(idx)) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * ✅ Abre la DB, y si detecta mismatch, la borra y la recrea (autocuración).
 */
export async function getDB(): Promise<IDBPDatabase<AsistenciaDB>> {
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

  // 2) Validamos schema
  if (!hasRequiredSchema(dbInstance) && !isRepairing) {
    // autocuración
    isRepairing = true;
    try {
      dbInstance.close();
    } catch {}
    dbInstance = null;

    await deleteDB(DB_NAME);

    // recrea limpia
    dbInstance = await open();
  }

  isRepairing = false;
  return dbInstance!;
}

// ======================= PENDING RECORDS =======================

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

export async function getPendingRecordsByUserAndDate(userId: string, fecha: string): Promise<PendingRecord[]> {
  const db = await getDB();
  // índice existe (porque getDB autocura), pero igual dejamos fallback blindado:
  try {
    return db.getAllFromIndex(STORE_PENDING, 'user_fecha', [userId, fecha]);
  } catch {
    const all = await db.getAll(STORE_PENDING);
    return all.filter((r) => r.user_id === userId && r.fecha === fecha);
  }
}

export async function deletePendingRecord(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_PENDING, id);
}

// ======================= TRACK POINTS =======================

export async function savePendingTrackPoint(p: PendingTrackPoint): Promise<void> {
  const db = await getDB();
  await db.put(STORE_TRACKING, p);
}

export async function getPendingTrackPoints(): Promise<PendingTrackPoint[]> {
  const db = await getDB();
  return db.getAll(STORE_TRACKING);
}

export async function getPendingTrackPointsByUserAndDate(userId: string, fecha: string): Promise<PendingTrackPoint[]> {
  const db = await getDB();
  try {
    return db.getAllFromIndex(STORE_TRACKING, 'user_fecha', [userId, fecha]);
  } catch {
    const all = await db.getAll(STORE_TRACKING);
    return all.filter((r) => r.user_id === userId && r.fecha === fecha);
  }
}

export async function deletePendingTrackPoint(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_TRACKING, id);
}

export async function clearAllOffline(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_PENDING);
  await db.clear(STORE_TRACKING);
}
export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  return db.count(STORE_PENDING);
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
