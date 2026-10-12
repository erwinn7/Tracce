import { useState, useEffect, useCallback, useRef } from 'react';
import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  getDocs,
  arrayUnion,
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from '../lib/firebase';
import {
  getAllCompletions,
  markCompletionSynced,
  mergeRemoteCompletions,
  type LocalCompletion,
} from '../lib/db';
import type { AuthUser } from './useAuth';

export type SyncState = 'synced' | 'pending' | 'offline';

export interface UseSyncReturn {
  syncState: SyncState;
  pendingCount: number;
  uid: string | null;
  triggerSync: () => Promise<void>;
  syncOneCompletion: (completion: LocalCompletion) => void;
}

export function useSync(
  onRemoteMerged?: () => void,
  authUser?: AuthUser | null
): UseSyncReturn {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pendingWritesCount, setPendingWritesCount] = useState<number>(0);
  const isSyncingRef = useRef<boolean>(false);

  // 1. Suivi du statut réseau du navigateur
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Authentification anonyme
  useEffect(() => {
    if (!auth || !isFirebaseConfigured) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else if (navigator.onLine && auth) {
        signInAnonymously(auth).catch((err) => {
          console.warn('[Sync] Auth anonyme en échec (hors ligne possible):', err);
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // 2bis. Enregistrement et mise à jour de l'ID utilisateur en ligne dans Firestore (users/{uid})
  useEffect(() => {
    if (!db || !currentUser) return;

    const userDocRef = doc(db, 'users', currentUser.uid);
    setDoc(
      userDocRef,
      {
        uid: currentUser.uid,
        username: authUser?.username || 'Explorateur anonyme',
        isAdmin: authUser?.isAdmin || false,
        isAnonymous: currentUser.isAnonymous,
        lastSeenAt: new Date().toISOString(),
      },
      { merge: true }
    ).catch((err) => {
      console.warn('[Sync] Enregistrement profil user dans Firestore:', err);
    });
  }, [currentUser, authUser]);

  // 3. Écriture sans bloquer l'UI d'une completion vers Firestore
  const syncOneCompletion = useCallback((c: LocalCompletion) => {
    // Les validations démo ne sont JAMAIS envoyées vers Firestore
    if (c.isDemo || !db || !auth) return;

    const user = auth.currentUser;
    if (!user) {
      // Aucun UID immédiat (ex. premier lancement hors ligne), sera synchronisé au retour du réseau
      return;
    }

    const payload = {
      questId: c.questId,
      completedAt: c.completedAt,
      lat: Number(c.lat),
      lng: Number(c.lng),
      accuracyM: Number(c.accuracyM),
      distanceToTargetM: Number(c.distanceToTargetM),
    };

    const docRef = doc(db, 'users', user.uid, 'completions', c.questId);
    // On ne fait PAS await sur setDoc pour ne pas bloquer l'interface
    setDoc(docRef, payload)
      .then(() => {
        markCompletionSynced(c.questId).catch(console.error);
      })
      .catch((err) => {
        console.warn('[Sync] setDoc différé par Firestore cache:', err);
      });

    // Mise à jour de l'ID et de la progression de l'utilisateur dans users/{uid}
    const userDocRef = doc(db, 'users', user.uid);
    setDoc(
      userDocRef,
      {
        uid: user.uid,
        username: authUser?.username || 'Explorateur anonyme',
        isAdmin: authUser?.isAdmin || false,
        lastSeenAt: new Date().toISOString(),
        lastCompletedQuest: c.questId,
        lastCompletedAt: c.completedAt,
        completedQuests: arrayUnion(c.questId),
      },
      { merge: true }
    ).catch(console.warn);
  }, [authUser]);

  // 4. Synchronisation complète : écriture des locaux en attente + lecture Firestore pour union
  const triggerSync = useCallback(async () => {
    if (!db || !auth || isSyncingRef.current) return;
    isSyncingRef.current = true;

    try {
      let user = auth.currentUser;
      if (!user && navigator.onLine) {
        try {
          const cred = await signInAnonymously(auth);
          user = cred.user;
          setCurrentUser(user);
        } catch (e) {
          console.warn('[Sync] Échec re-authentification:', e);
        }
      }

      if (!user) return;

      // Étape A : Envoyer les quêtes locales non marquées comme synchronisées (et non démo)
      const locals = await getAllCompletions();
      const unsynced = locals.filter((c) => !c.isDemo && !c.syncedToFirestore);

      if (unsynced.length > 0) {
        const questIds = unsynced.map((c) => c.questId);
        const userDocRef = doc(db, 'users', user.uid);
        setDoc(
          userDocRef,
          {
            uid: user.uid,
            username: authUser?.username || 'Explorateur anonyme',
            isAdmin: authUser?.isAdmin || false,
            lastSeenAt: new Date().toISOString(),
            completedQuests: arrayUnion(...questIds),
          },
          { merge: true }
        ).catch(console.warn);
      }

      for (const c of unsynced) {
        const payload = {
          questId: c.questId,
          completedAt: c.completedAt,
          lat: Number(c.lat),
          lng: Number(c.lng),
          accuracyM: Number(c.accuracyM),
          distanceToTargetM: Number(c.distanceToTargetM),
        };
        const docRef = doc(db, 'users', user.uid, 'completions', c.questId);
        // Envoi dans la file Firestore
        setDoc(docRef, payload)
          .then(() => markCompletionSynced(c.questId))
          .catch(console.error);
      }

      // Étape B : Lire Firestore pour fusionner dans IndexedDB (union)
      if (navigator.onLine) {
        const completionsCol = collection(db, 'users', user.uid, 'completions');
        const snap = await getDocs(completionsCol);
        const remoteList: Omit<LocalCompletion, 'photoId' | 'isDemo'>[] = [];

        snap.forEach((d) => {
          const data = d.data();
          if (data && data.questId) {
            remoteList.push({
              questId: data.questId,
              completedAt: data.completedAt,
              lat: data.lat,
              lng: data.lng,
              accuracyM: data.accuracyM,
              distanceToTargetM: data.distanceToTargetM,
              syncedToFirestore: true,
            });
          }
        });

        if (remoteList.length > 0) {
          const merged = await mergeRemoteCompletions(remoteList);
          if (merged && onRemoteMerged) {
            onRemoteMerged();
          }
        }
      }
    } catch (err) {
      console.warn('[Sync] Erreur durant triggerSync:', err);
    } finally {
      isSyncingRef.current = false;
    }
  }, [onRemoteMerged, authUser]);

  // 5. Écoute des métadonnées du snapshot Firestore (hasPendingWrites)
  useEffect(() => {
    if (!db || !currentUser) return;

    const completionsCol = collection(db, 'users', currentUser.uid, 'completions');
    const unsubscribe = onSnapshot(
      completionsCol,
      { includeMetadataChanges: true },
      (snapshot) => {
        let count = 0;
        if (snapshot.metadata.hasPendingWrites) {
          count = 1;
        }
        for (const docChange of snapshot.docChanges()) {
          if (docChange.doc.metadata.hasPendingWrites) {
            count++;
          }
        }
        setPendingWritesCount(count);
      },
      (err) => {
        console.warn('[Sync] Écoute completions:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // 6. Calcul de l'état dérivé (synced / pending / offline)
  let syncState: SyncState = 'synced';
  if (!isOnline) {
    syncState = 'offline';
  } else if (pendingWritesCount > 0) {
    syncState = 'pending';
  }

  // 7. Déclenchement de la synchronisation au retour du réseau
  useEffect(() => {
    if (isOnline) {
      triggerSync();
    }
  }, [isOnline, triggerSync]);

  return {
    syncState,
    pendingCount: pendingWritesCount,
    uid: currentUser?.uid ?? null,
    triggerSync,
    syncOneCompletion,
  };
}
