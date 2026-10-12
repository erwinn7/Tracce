import { useState, useEffect, useCallback } from 'react';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import type { Catalog, Quest } from '../types/quest';
import { getAllCustomQuests, saveCustomQuest as dbSaveCustomQuest } from '../lib/db';
import { db, isFirebaseConfigured } from '../lib/firebase';

export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Charger le catalogue en fusionnant les quêtes de base et les quêtes personnalisées
  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/quests.json`);
      if (!res.ok) {
        throw new Error(`Erreur HTTP: ${res.status}`);
      }
      const data: Catalog = await res.json();
      const custom = await getAllCustomQuests();

      // Fusion des quêtes de base et des quêtes ajoutées par l'admin
      const combinedQuests: Quest[] = [...data.quests];
      for (const cq of custom) {
        if (!combinedQuests.some((q) => q.id === cq.id)) {
          combinedQuests.push(cq);
        }
      }

      setCatalog({
        version: data.version,
        quests: combinedQuests,
      });
      setLoading(false);
    } catch (err: any) {
      console.error('Erreur chargement catalogue:', err);
      setError('Impossible de charger le catalogue de quêtes.');
      setLoading(false);
    }
  }, []);

  // Écoute en temps réel de Firestore pour synchroniser les nouveaux lieux entre tous les téléphones
  useEffect(() => {
    loadData();

    if (!db || !isFirebaseConfigured) return;

    // 1. Synchroniser en arrière-plan les quêtes locales vers Firestore si besoin
    getAllCustomQuests().then(async (localQuests) => {
      if (localQuests.length > 0 && db) {
        for (const lq of localQuests) {
          try {
            await setDoc(doc(db, 'quests', lq.id), lq, { merge: true });
            await setDoc(doc(db, 'custom_quests', lq.id), lq, { merge: true });
          } catch (e) {
            console.warn('[Catalog] Sauvegarde différée quête locale vers Firestore:', e);
          }
        }
      }
    });

    // 2. Écouter les quêtes depuis la collection 'quests' de Firestore
    const questsCol = collection(db, 'quests');
    const unsubscribeQuests = onSnapshot(
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

    // 3. Écouter également 'custom_quests'
    const customQuestsCol = collection(db, 'custom_quests');
    const unsubscribeCustom = onSnapshot(
      customQuestsCol,
      async (snapshot) => {
        let hasChanges = false;
        for (const docSnap of snapshot.docs) {
          const questData = docSnap.data() as Quest;
          await dbSaveCustomQuest(questData);
          hasChanges = true;
        }
        if (hasChanges) {
          await loadData();
        }
      },
      (err) => {
        console.warn('[Catalog] Écoute Firestore custom_quests:', err);
      }
    );

    return () => {
      unsubscribeQuests();
      unsubscribeCustom();
    };
  }, [loadData]);

  // Ajouter un lieu (sauvegardé en local ET dans Firestore Firebase)
  const addCustomQuest = async (newQuest: Quest) => {
    // 1. Sauvegarde locale immédiate (IndexedDB)
    await dbSaveCustomQuest(newQuest);

    // 2. Sauvegarde dans le cloud Firestore pour que tous les utilisateurs voient le lieu
    if (db && isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'quests', newQuest.id), newQuest, { merge: true });
        await setDoc(doc(db, 'custom_quests', newQuest.id), newQuest, { merge: true });
        console.log('[Catalog] Nouveau lieu synchronisé sur Firebase Firestore avec succès:', newQuest.id);
      } catch (err) {
        console.error('[Catalog] Erreur sauvegarde Firestore lieu:', err);
      }
    }

    await loadData();
  };

  return { catalog, loading, error, addCustomQuest };
}
