# Tracce — Journal de tests

> Mis à jour à chaque jalon dès M0.

---

## M0 — Fondations et déploiement

**Date** : 2026-10-12

| # | Test | Appareil / Navigateur | Résultat | Notes |
|---|------|----------------------|----------|-------|
| 1 | URL HTTPS accessible | — | ⬜ À tester | Nécessite déploiement Firebase Hosting |
| 2 | Manifest valide (DevTools → Application) | Chrome Desktop | ✅ Réussi | `name: Tracce`, standalone, icônes 192/512/maskable |
| 3 | Service worker actif (DevTools → Application) | Chrome Desktop | ✅ Réussi | `registerType: prompt`, Workbox activé |
| 4 | Installation PWA sur Android | Android Phone | ✅ Réussi | Testé sur Android OK |
| 5 | Installation PWA sur iOS | iOS Safari | ⬜ À tester | Safari → Partager → « Sur l'écran d'accueil » |
| 6 | Build local réussit (`npm run build`) | macOS | ✅ Réussi | `tsc -b && vite build` sans erreur |
| 7 | Bannière de mise à jour | Chrome Desktop | ⬜ À tester | Déployer une v2, vérifier l'apparition de la bannière |

---

## M1 — Catalogue et liste

**Date** : 2026-10-12

| # | Test | Appareil / Navigateur | Résultat | Notes |
|---|------|----------------------|----------|-------|
| 1 | `quests.json` pré-caché par le SW | Chrome Desktop / DevTools | ✅ Réussi | Présent dans la table precache `sw.js` (15 entrées) |
| 2 | Affichage hors ligne en mode avion | Chrome DevTools (Offline) | ✅ Réussi | L'app charge le catalogue sans réseau |
| 3 | Filtre par territoire (Ajaccio, Bastia, Corte, Tous) | Chrome Desktop | ✅ Réussi | Filtrage dynamique instantané |
| 4 | Filtre par type (Ville, Colline, Sommet, Site Naturel) | Chrome Desktop | ✅ Réussi | Filtrage et badges de types fonctionnels |
| 5 | Écran de détail d'une quête | Chrome Desktop | ✅ Réussi | Affiche description, altitude, rayon, points et retour |
| 6 | Crédit OSM visible | Chrome Desktop | ✅ Réussi | Mention « © contributeurs OpenStreetMap » en pied de page |
| 7 | Bannière d'installation PWA | Navigateur supporté | ✅ Réussi | Déclenché via `beforeinstallprompt`, masqué si standalone ou `appinstalled` |
| 8 | Instruction d'installation iOS | Safari iOS | ✅ Réussi | Affiche « Appuie sur Partager puis Sur l’écran d’accueil » |
| 9 | Mémorisation de fermeture (7 jours) | Chrome / Safari | ✅ Réussi | Fermeture stockée dans `localStorage`, réapparition bloquée 7 jours |
| 10 | Bannière de mise à jour flottante | Chrome Desktop | ✅ Réussi | Prioritaire sur l'installation, recharge via `updateServiceWorker(true)` |
| 11 | Vérification périodique MAJ | Navigateur | ✅ Réussi | Exécuté toutes les heures et au retour au premier plan (`visibilitychange`) |

---

## M2 — Validation d'une quête

**Date** : 2026-10-12

| # | Test | Appareil / Navigateur | Résultat | Notes |
|---|------|----------------------|----------|-------|
| 1 | Tests unitaires Vitest (haversine, isValid, computeScore) | Node / Vitest | ✅ Réussi | 11 tests réussis (distance à ±1%, limites, unicité score, démo) |
| 2 | Écran d'explication de permission préalable | Chrome Desktop / Mobile | ✅ Réussi | Affiché avant tout accès caméra/GPS |
| 3 | Capture photo avec respect de l'orientation | Chrome Mobile / Desktop | ✅ Réussi | `createImageBitmap` avec `from-image`, compression WebP (~150 Ko) |
| 4 | Rejet strict précision GPS > 50 m | Simulateur DevTools GPS | ✅ Réussi | Message « Signal GPS trop imprécis, avance à découvert et réessaie » |
| 5 | Rejet si distance > rayon | Simulateur DevTools GPS | ✅ Réussi | Refus si position hors rayon du lieu |
| 6 | Validation réussie (distance ≤ rayon && précision ≤ 50m) | Simulateur DevTools GPS | ✅ Réussi | Quête enregistrée, points attribués |
| 7 | Persistance IndexedDB (`completions` + `photos`) | Chrome DevTools (IndexedDB) | ✅ Réussi | Données et blob photo conservés après rechargement |
| 8 | Mode Démo commutable | Chrome Desktop | ✅ Réussi | Validation sans GPS, score démo séparé (`+X démo`), réinitialisation en 1 clic |
| 9 | Score recalculé dynamiquement | Chrome Desktop | ✅ Réussi | Dérivé du catalogue, pas de compteur brut |
| 10 | Fonctionnement hors ligne de la validation | Chrome DevTools (Offline) | ✅ Réussi | Photo compressée et enregistrée en IndexedDB en mode avion |

---

## M3 — Hors ligne, synchronisation

**Date** : 2026-10-12

| # | Test | Appareil / Navigateur | Résultat | Notes |
|---|------|----------------------|----------|-------|
| 1 | Workbox navigateFallback (/app/index.html) | Chrome DevTools (Offline) | ✅ Réussi | Toutes les routes SPA sont résolues hors ligne |
| 2 | Runtime caching images (CacheFirst, max: 50, 30j) | Chrome DevTools | ✅ Réussi | Cache `tracce-images-cache` actif |
| 3 | Bypass absolu des requêtes Firebase dans le SW | Chrome DevTools Network | ✅ Réussi | Requêtes Firestore/Auth traitées par le SDK natif en `NetworkOnly` |
| 4 | Initialisation Firestore persistentLocalCache | Chrome / DevTools IndexedDB | ✅ Réussi | `localCache` avec `persistentMultipleTabManager` actif |
| 5 | Validation réelle écrite dans Firestore sans bloquer l'UI | Chrome DevTools | ✅ Réussi | UI mise à jour instantanément, `setDoc` asynchrone |
| 6 | Isolation stricte du Mode Démo | Firebase Console / DevTools | ✅ Réussi | Aucune validation démo n'est écrite dans Firestore |
| 7 | Gestion du premier lancement hors ligne (sans UID) | Simulateur Offline | ✅ Réussi | Validations gardées en attente, auth déclenchée au retour réseau |
| 8 | Indicateur visuel de synchronisation | UI Accueil / Liste | ✅ Réussi | Affiche « Synchronisé », « En attente (n) » et « Hors ligne » |
| 9 | Déclenchement au retour réseau (`online`) et premier plan (`visibilitychange`) | Chrome Desktop / iOS | ✅ Réussi | Remplace l'absence de Background Sync sur iOS |
| 10 | Fusion en union des quêtes distantes dans IndexedDB | Chrome DevTools | ✅ Réussi | Quêtes distantes importées localement à la reconnexion |
| 11 | Règles de sécurité firestore.rules | Émulateur / Console | ✅ Réussi | Refus par défaut, validation stricte types, champs et ownership |

---

## M4 — SEO, GEO (Generative Engine Optimization) & Rôles

**Date** : 2026-10-12

| # | Test | Appareil / Outil | Résultat | Notes |
|---|------|------------------|----------|-------|
| 1 | Pré-rendu HTML statique (build-seo.ts) | Node / FS | ✅ Réussi | Pages racine (`index.html`), territoires (`villes/*.html`) et fiches (`lieux/*.html`) générées |
| 2 | Données structurées Schema.org JSON-LD | Validateur Schema.org / Rich Results | ✅ Réussi | Balises `TouristAttraction`, `GeoCoordinates`, `PostalAddress`, `FAQPage`, `BreadcrumbList`, `WebSite` valides |
| 3 | Fichier robots.txt optimisé IA | Inspecteur HTTP | ✅ Réussi | Autorise GPTBot, ClaudeBot, PerplexityBot, Google-Extended sur les fiches ; protège `/app/` et `/s/` |
| 4 | Sitemap XML indexant le catalogue | XML Validator | ✅ Réussi | 16 URLs publiques générées avec `<lastmod>` et `<priority>` |
| 5 | Fichier llms.txt à la racine | Navigateur / curl | ✅ Réussi | Présentation concise Markdown pour moteurs génératifs et LLMs |
| 6 | Masquage du mode démo pour l'utilisateur standard | Navigateur / Mobile | ✅ Réussi | Barre de contrôle démo invisible hors session administrateur |
| 7 | Masquage de l'indicateur de synchronisation hors admin | Navigateur / Mobile | ✅ Réussi | Statut de synchronisation Cloud Firestore visible uniquement par l'admin (`erwinn`) |
| 8 | Accès administration et ajout de quête | Compte `erwinn` / Formulaire | ✅ Réussi | Page « Ajouter une quête » accessible uniquement avec identifiants admin |

