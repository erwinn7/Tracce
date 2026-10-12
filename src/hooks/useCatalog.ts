import { useState, useEffect, useCallback } from 'react';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import type { Catalog, Quest } from '../types/quest';
import { getAllCustomQuests, saveCustomQuest as dbSaveCustomQuest } from '../lib/db';
import { db, isFirebaseConfigured } from '../lib/firebase';

// Nettoie un objet en supprimant les clés undefined non supportées par Firestore
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Charger le catalogue en fusionnant les quêtes de base et les quêtes stockées localement
  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/quests.json`);
      if (!res.ok) {
        throw new Error(`Erreur HTTP: ${res.status}`);
      }
      const data: Catalog = await res.json();
      const localQuests = await getAllCustomQuests();

      // Fusion unique par identifiant (id)
      const questsMap = new Map<string, Quest>();
      for (const q of data.quests) {
        questsMap.set(q.id, q);
      }
      for (const lq of localQuests) {
        questsMap.set(lq.id, lq);
      }

      setCatalog({
        version: data.version,
        quests: Array.from(questsMap.values()),
      });
      setLoading(false);
    } catch (err: any) {
      console.error('Erreur chargement catalogue:', err);
      setError('Impossible de charger le catalogue de quêtes.');
      setLoading(false);
    }
  }, []);

  // Forcer la synchronisation de toutes les quêtes locales vers Firestore
  const syncLocalQuests = useCallback(async (): Promise<number> => {
    if (!db || !isFirebaseConfigured) return 0;
    try {
      const localQuests = await getAllCustomQuests();
      let syncedCount = 0;
      for (const lq of localQuests) {
        try {
          const sanitized = sanitizeForFirestore(lq);
          await setDoc(doc(db, 'quests', lq.id), sanitized, { merge: true });
          syncedCount++;
        } catch (e) {
          console.warn('[Catalog] Échec sync unitaire lieu:', lq.id, e);
        }
      }
      if (syncedCount > 0) {
        await loadData();
      }
      return syncedCount;
    } catch (err) {
      console.error('[Catalog] Erreur synchronisation globale:', err);
      return 0;
    }
  }, [loadData]);

  // Écoute en temps réel de l'unique collection Firestore 'quests'
  useEffect(() => {
    loadData();

    if (!db || !isFirebaseConfigured) return;

    // 1. Sauvegarder dans Firestore les éventuelles quêtes locales non encore synchronisées
    syncLocalQuests().catch((err) => {
      console.warn('[Catalog] Sync initiale vers Firestore:', err);
    });

    // 2. Écouter la collection unique 'quests' en temps réel
    const questsCol = collection(db, 'quests');
    const unsubscribe = onSnapshot(
      questsCol,
      async (snapshot) => {
        let hasChanges = false;
        for (const docSnap of snapshot.docs) {
          const questData = docSnap.data() as Quest;
          await dbSaveCustomQuest(questData);
          hasChanges = true;
        }
        if (hasChanges || snapshot.docs.length > 0) {
          await loadData();
        }
      },
      (err) => {
        console.warn('[Catalog] Écoute Firestore quests:', err);
      }
    );

    return () => unsubscribe();
  }, [loadData, syncLocalQuests]);

  // Ajouter un lieu : sauvegardé dans la collection unique 'quests'
  const addCustomQuest = async (newQuest: Quest) => {
    // 1. Sauvegarde locale immédiate (IndexedDB)
    await dbSaveCustomQuest(newQuest);

    // 2. Sauvegarde dans l'unique collection 'quests' de Firestore
    if (db && isFirebaseConfigured) {
      try {
        const sanitized = sanitizeForFirestore(newQuest);
        await setDoc(doc(db, 'quests', newQuest.id), sanitized, { merge: true });
        console.log('[Catalog] Nouveau lieu ajouté dans Firestore (quests):', newQuest.id);
      } catch (err) {
        console.error('[Catalog] Erreur sauvegarde Firestore lieu:', err);
      }
    }

    await loadData();
  };

  return { catalog, loading, error, addCustomQuest, syncLocalQuests };
}
