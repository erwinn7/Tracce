import { useState, useEffect } from 'react';
import type { Catalog } from '../types/quest';

export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/quests.json`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Erreur HTTP: ${res.status}`);
        }
        return res.json();
      })
      .then((data: Catalog) => {
        setCatalog(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Erreur chargement catalogue:', err);
        setError('Impossible de charger le catalogue de quêtes.');
        setLoading(false);
      });
  }, []);

  return { catalog, loading, error };
}
