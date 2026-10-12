import { useState, useEffect, useCallback } from 'react';
import type { Catalog, Quest } from '../types/quest';
import { getAllCustomQuests, saveCustomQuest as dbSaveCustomQuest } from '../lib/db';

export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addCustomQuest = async (newQuest: Quest) => {
    await dbSaveCustomQuest(newQuest);
    await loadData();
  };

  return { catalog, loading, error, addCustomQuest };
}
