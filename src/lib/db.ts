import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface LocalCompletion {
  questId: string;
  completedAt: string; // ISO string
  lat: number;
  lng: number;
  accuracyM: number;
  distanceToTargetM: number;
  photoId: string;
  isDemo?: boolean;
  syncedToFirestore?: boolean;
}

export interface LocalPhoto {
  id: string;
  blob: Blob;
  createdAt: string; // ISO string
}

export interface LocalMeta {
  catalogVersion: string;
  lastSyncAt: string | null;
}

interface TracceDB extends DBSchema {
  completions: {
    key: string;
    value: LocalCompletion;
  };
  photos: {
    key: string;
    value: LocalPhoto;
  };
  meta: {
    key: string;
    value: LocalMeta;
  };
  customQuests: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'tracce_local_db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<TracceDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<TracceDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('completions')) {
          db.createObjectStore('completions', { keyPath: 'questId' });
        }
        if (!db.objectStoreNames.contains('photos')) {
          db.createObjectStore('photos', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }
        if (!db.objectStoreNames.contains('customQuests')) {
          db.createObjectStore('customQuests', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveCompletion(
  completion: LocalCompletion,
  photoBlob: Blob
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['completions', 'photos'], 'readwrite');

  await tx.objectStore('photos').put({
    id: completion.photoId,
    blob: photoBlob,
    createdAt: completion.completedAt,
  });

  await tx.objectStore('completions').put(completion);
  await tx.done;
}

export async function getAllCompletions(): Promise<LocalCompletion[]> {
  const db = await getDB();
  return db.getAll('completions');
}

export async function getCompletion(questId: string): Promise<LocalCompletion | undefined> {
  const db = await getDB();
  return db.get('completions', questId);
}

export async function getPhoto(photoId: string): Promise<LocalPhoto | undefined> {
  const db = await getDB();
  return db.get('photos', photoId);
}

export async function clearDemoCompletions(): Promise<void> {
  const db = await getDB();
  const allCompletions = await db.getAll('completions');
  const demoCompletions = allCompletions.filter((c) => c.isDemo);

  const tx = db.transaction(['completions', 'photos'], 'readwrite');
  for (const c of demoCompletions) {
    await tx.objectStore('completions').delete(c.questId);
    if (c.photoId) {
      await tx.objectStore('photos').delete(c.photoId);
    }
  }
  await tx.done;
}

export async function markCompletionSynced(questId: string): Promise<void> {
  const db = await getDB();
  const c = await db.get('completions', questId);
  if (c) {
    c.syncedToFirestore = true;
    await db.put('completions', c);
  }
}

/**
 * Fusionne en union les validations distantes Firestore dans IndexedDB.
 * Ne remplace pas une quête locale ayant déjà une photo liée.
 */
export async function mergeRemoteCompletions(remoteList: Omit<LocalCompletion, 'photoId' | 'isDemo'>[]): Promise<boolean> {
  const db = await getDB();
  let hasNew = false;
  const tx = db.transaction('completions', 'readwrite');
  const store = tx.objectStore('completions');

  for (const remote of remoteList) {
    const existing = await store.get(remote.questId);
    if (!existing) {
      hasNew = true;
      await store.put({
        ...remote,
        photoId: '',
        isDemo: false,
        syncedToFirestore: true,
      });
    } else if (!existing.syncedToFirestore) {
      existing.syncedToFirestore = true;
      await store.put(existing);
    }
  }

  await tx.done;
  return hasNew;
}

export async function saveCustomQuest(quest: any): Promise<void> {
  const db = await getDB();
  await db.put('customQuests', quest);
}

export async function getAllCustomQuests(): Promise<any[]> {
  const db = await getDB();
  return db.getAll('customQuests');
}

