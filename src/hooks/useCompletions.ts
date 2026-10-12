import { useState, useEffect, useCallback } from 'react';
import {
  getAllCompletions,
  saveCompletion as dbSaveCompletion,
  clearDemoCompletions as dbClearDemoCompletions,
  getPhoto,
  type LocalCompletion,
} from '../lib/db';

export function useCompletions() {
  const [completions, setCompletions] = useState<LocalCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshCompletions = useCallback(async () => {
    try {
      const data = await getAllCompletions();
      setCompletions(data);
    } catch (err) {
      console.error('Erreur chargement completions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCompletions();
  }, [refreshCompletions]);

  const saveNewCompletion = async (completion: LocalCompletion, photoBlob: Blob) => {
    await dbSaveCompletion(completion, photoBlob);
    await refreshCompletions();
  };

  const resetDemo = async () => {
    await dbClearDemoCompletions();
    await refreshCompletions();
  };

  return {
    completions,
    loading,
    saveCompletion: saveNewCompletion,
    resetDemo,
    getPhoto,
    refreshCompletions,
  };
}
