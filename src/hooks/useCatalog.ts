import { useState, useEffect, useCallback } from 'react';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import type { Catalog, Quest } from '../types/quest';
import { getAllCustomQuests, saveCustomQuest as dbSaveCustomQuest } from '../lib/db';
import { db, isFirebaseConfigured } from '../lib/firebase';

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

  // Écoute en temps réel de l'unique collection Firestore 'quests'
  useEffect(() => {
    loadData();

    if (!db || !isFirebaseConfigured) return;

    // 1. Sauvegarder dans Firestore les éventuelles quêtes locales non encore présentes
    getAllCustomQuests().then(async (localQuests) => {
      if (localQuests.length > 0 && db) {
        for (const lq of localQuests) {
          try {
            await setDoc(doc(db, 'quests', lq.id), lq, { merge: true });
          } catch (e) {
            console.warn('[Catalog] Sauvegarde différée quête vers Firestore:', e);
          }
        }
      }
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
  }, [loadData]);

  // Ajouter un lieu : sauvegardé dans la collection unique 'quests'
  const addCustomQuest = async (newQuest: Quest) => {
    // 1. Sauvegarde locale immédiate (IndexedDB)
    await dbSaveCustomQuest(newQuest);

    // 2. Sauvegarde dans l'unique collection 'quests' de Firestore
    if (db && isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'quests', newQuest.id), newQuest, { merge: true });
        console.log('[Catalog] Nouveau lieu ajouté dans Firestore (quests):', newQuest.id);
      } catch (err) {
        console.error('[Catalog] Erreur sauvegarde Firestore lieu:', err);
      }
    }

    await loadData();
  };

  return { catalog, loading, error, addCustomQuest };
}
