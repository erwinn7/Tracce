# Tracce — Document technique

Auteur : (à compléter) · Date : 2026-10-12 · URL : (à déployer) · Dépôt : (à compléter) · Statut : **draft**

> Chaque choix est nommé, justifié et vérifiable dans le code. Structure conforme au modèle de l'enseignant (12 sections). Les sujets de la section 9 de la spec sont intégrés comme sous-sections.

---

## 1. TL;DR

**Tracce** est une PWA de rally photo géolocalisé permettant d'explorer les sites remarquables de Corse (Ajaccio, Bastia, Corte). Le public cible est le randonneur ou touriste en déplacement, souvent sans réseau. Choix technique principal : Vite + React + TypeScript avec `vite-plugin-pwa` (Workbox) pour le fonctionnement hors ligne, Firebase (Hosting, Firestore, Auth anonyme) pour la persistance cloud.

### 1.1 Objectif et périmètre

- **Objectif** : gamifier l'exploration touristique en Corse via un système de quêtes (se rendre à un lieu, prendre une photo, valider par géolocalisation).
- **Périmètre v1** : Ajaccio, Bastia, Corte et les sites naturels/sommets environnants (12 quêtes vérifiées, extensible à 20-25).
- **Hors périmètre** : réseau social, commentaires, chat, compte nominatif (Auth anonyme uniquement).

## 2. Contexte et objectifs

- **Problème** : les touristes et randonneurs en Corse n'ont pas d'outil gamifié hors ligne pour découvrir les sites remarquables de l'île.
- **Goals v1** : catalogue de quêtes consultable hors ligne, validation par photo + GPS, synchronisation au retour du réseau, publication par lien partagé, pages SEO/GEO statiques.
- **Non-goals** : carte temps réel, itinéraires, réseau social, gamification multi-joueur, monétisation.

## 3. Architecture

### 3.1 Stack et justification

| Composant | Choix | Raison | Alternative écartée |
|-----------|-------|--------|---------------------|
| Framework UI | React 19 + TypeScript | Écosystème mature, typage strict, hooks pour les API navigateur | Vue (moins familier), Vanilla (plus verbeux pour les états) |
| Bundler | Vite 6 | HMR rapide, plugin PWA officiel, ESM natif | Webpack (config plus lourde) |
| PWA | `vite-plugin-pwa` (Workbox) | Génération automatique du SW, stratégies de cache déclaratives | SW manuel (plus d'erreurs, maintenance) |
| Données locales | IndexedDB via `idb` | API promise-based simple, stockage de blobs (photos) | localStorage (limité à 5 Mo, pas de blobs) |
| Backend | Firebase (Hosting, Firestore, Auth anonyme) | Plan Spark gratuit, cache Firestore hors ligne natif, Auth anonyme sans friction | Supabase (plus complexe à configurer) |
| Tests | Vitest | Intégré à l'écosystème Vite, rapide | Jest (nécessite config supplémentaire avec ESM) |

### 3.2 Schéma d'architecture

```
Navigateur
  ├── React SPA (/app/)
  │   ├── Composants UI
  │   └── IndexedDB (idb)
  │       ├── completions
  │       ├── photos
  │       └── meta
  ├── Service Worker (Workbox, registerType: prompt)
  │   ├── Précache (app shell, quests.json)
  │   └── Cache runtime (Firestore)
  └── Pages statiques (/, /villes/*, /lieux/*)
       └── HTML pré-généré au build

Firebase (plan Spark)
  ├── Hosting (HTTPS, CDN)
  ├── Auth (anonyme, uid persisté)
  └── Firestore
      ├── users/{uid}/completions/{questId}
      └── shares/{shareId} + photos
```

### 3.3 Choix techniques et alternatives écartées

- **`registerType: 'prompt'`** (pas `autoUpdate`) : l'utilisateur doit consentir au rechargement (spec §2).
- **Photos dans Firestore** (WebP base64 ≤ 200 Ko) : Firebase Storage peut nécessiter le plan Blaze. Interface `PhotoStore` pour migration future.
- **Pas de carte en v1** : liste triée par distance + direction. Carte Leaflet optionnelle en M5.
- **Pas de framework SSR** : script Node `build-seo.ts` pour les pages statiques (plus léger, moins de dépendances).
- **Mode démo** : réglage visible permettant de valider sans être sur place (validation marquée « démo », score séparé, réinitialisable). Raison : l'enseignant ne sera pas en Corse pour tester.

## 4. Cache et hors ligne

### 4.1 Stratégie de cache du service worker

| Ressource | Stratégie | Stockage | Pourquoi |
|-----------|-----------|----------|----------|
| App shell (HTML, CSS, JS) | Precache (`navigateFallback: /app/index.html`) | Cache Storage | Disponibilité immédiate de la SPA hors ligne |
| `data/quests.json` | Precache | Cache Storage | Catalogue statique complet consultable sans réseau |
| Illustrations (`hero-landscape.svg`, `favicon.svg`, icônes) | Precache & CacheFirst | Cache Storage | Affichage instantané du branding et des illustrations |
| Images runtime (`.png`, `.jpg`, `.svg`, `.webp`) | CacheFirst (max: 50 entrées, 30 jours) | Cache Storage (`tracce-images-cache`) | Économie de bande passante et navigation fluide |
| APIs Firebase (Firestore, Auth, Identity Toolkit) | **NetworkOnly** (jamais interceptées par le SW) | Aucun SW (géré par Firestore SDK) | Le SDK Firestore possède son propre cache persistant multi-onglets ; intercepter ces requêtes dans le SW causerait des conflits de synchronisation |

### 4.2 Modèle de données du catalogue (statique)

Le catalogue de quêtes est stocké dans `public/data/quests.json` et directement intégré au précache Workbox (`vite.config.ts`) :

```ts
type Quest = {
  id: string;            // slug unique (ex. "ajaccio-maison-bonaparte")
  cityId: "ajaccio" | "bastia" | "corte";
  type: "ville" | "colline" | "sommet" | "site-naturel";
  name: string;
  description: string;   // Texte original décrivant le lieu
  lat: number;           // Coordonnée GPS exacte (source OSM/Wikidata)
  lng: number;           // Coordonnée GPS exacte (source OSM/Wikidata)
  altitudeM?: number;    // Altitude en mètres (si sommet ou colline)
  radiusM: number;       // Rayon de validation (100 m ou 150 m)
  points: number;        // Points attribués (10, 25 ou 50 pts)
  source: "osm" | "wikidata" | "manuel";
  osmType?: "node" | "way" | "relation";
  osmId?: number;
  wikidata?: string;
};

type Catalog = {
  version: string;
  quests: Quest[];
};
```

## 5. Mise à jour

### 5.1 Cycle de mise à jour

- **Stratégie** : mise à jour proposée à l'utilisateur (`registerType: 'prompt'`).
- **Raison** : éviter une interruption intempestive pendant une quête ou une prise de photo.
- **Détection & Fréquence** :
  - Détection automatique au premier chargement via le Service Worker Workbox (`onNeedRefresh`).
  - Détection proactive : appel explicite à `registration.update()` toutes les heures via `setInterval`, et à chaque retour de l'application au premier plan via l'événement `visibilitychange` (`document.visibilityState === 'visible'`).
- **Composant UI** : bannière flottante en haut de l'écran (`FloatingBanner`, `role="status"`, `aria-live="polite"`). Priorité absolue sur la bannière d'installation.
- **Action** : bouton « Mettre à jour » déclenchant `updateServiceWorker(true)` (`skipWaiting()` + rechargement immédiat) ou bouton « Plus tard ».
- **Versionnage** : les révisions de hash générées par Workbox dans `sw.js` identifient les nouvelles versions.

## 6. Données et synchronisation

### 6.1 Modèle de données (local et Firestore)

**IndexedDB (via `idb`)** :

| Store | Clé | Champs | Index |
|-------|-----|--------|-------|
| `completions` | `questId` | `completedAt`, `lat`, `lng`, `accuracyM`, `distanceToTargetM`, `photoId`, `isDemo` | — |
| `photos` | `id` | `blob` (WebP ≤ 150 Ko), `createdAt` | — |
| `meta` | clé fixe | `catalogVersion`, `lastSyncAt` | — |

**Firestore** :

| Collection | Champs | Accès |
|------------|--------|-------|
| `users/{uid}/completions/{questId}` | Même contenu que local (sans photo, sans démo) | Lecture/écriture par `uid` uniquement |
| `shares/{shareId}` | `ownerUid`, `createdAt`, `title`, `cityId`, `items[]` | Lecture publique, écriture par propriétaire |
| `shares/{shareId}/photos/{questId}` | `dataUrl` (WebP base64 ≤ 200 Ko) | Lecture publique, écriture par propriétaire |

**Quotas Firebase Spark (source : [firebase.google.com/pricing](https://firebase.google.com/pricing))** :

| Ressource | Limite Spark |
|-----------|-------------|
| Firestore stockage | 1 GiB |
| Firestore lectures | 50 000 / jour |
| Firestore écritures | 20 000 / jour |
| Taille max document | 1 MiB |
| Hosting stockage | 10 GiB |
| Hosting transfert | 360 MiB / jour |
| Auth utilisateurs | illimité |

> Photo base64 ≤ 200 Ko → document ≤ 250 Ko → sous la limite de 1 MiB.

### 6.2 Mécanisme de synchronisation et cas limites (M3)

- **Architecture à double niveau (IndexedDB + Firestore localCache)** :
  1. *Affichage UI immédiat* : IndexedDB (`idb`) est la source de vérité pour l'affichage local. L'UI n'attend **jamais** la résolution de la promesse `setDoc` (qui ne se résout qu'après confirmation serveur).
  2. *Écriture asynchrone* : toute validation réelle enregistrée dans IndexedDB déclenche un `setDoc` vers `users/{uid}/completions/{questId}` (champs : `questId`, `completedAt`, `lat`, `lng`, `accuracyM`, `distanceToTargetM`, sans la photo).
  3. *Isolation du Mode Démo* : les validations démo ne sont **jamais** envoyées vers Firestore ni incluses dans les files d'attente réseau.
  4. *Indicateur d'état temps réel* :
     - `Hors ligne` : détecté via `navigator.onLine === false`.
     - `En attente (n)` : basé sur `snapshot.metadata.hasPendingWrites` de l'écouteur Firestore.
     - `Synchronisé` : toutes les écritures sont acquittées par le serveur distant.

- **Cas limites analysés et traités** :
  1. *Premier lancement hors ligne (aucun UID disponible)* :
     - Si l'utilisateur démarre l'application sans aucun réseau au premier usage, l'authentification anonyme ne peut pas être initialisée.
     - *Solution retenue* : les validations sont conservées localement dans IndexedDB avec le drapeau `syncedToFirestore: false`. Dès le retour du réseau (`online` ou `visibilitychange`), `signInAnonymously()` est déclenché, puis la file des validations en attente est dépilée vers Firestore.
  2. *Absence de Background Sync sur iOS (Safari)* :
     - L'API W3C `Background Synchronization` n'est pas supportée par WebKit sur iOS.
     - *Solution retenue* : nous ne dépendons pas de Background Sync. La synchronisation est déclenchée activement à trois moments clés côté client :
       - Au montage initial de l'application (`useEffect`).
       - Au retour de la connexion réseau (écouteur d'événement `online`).
       - Au retour de l'application au premier plan (écouteur `visibilitychange` sur `document.visibilityState === 'visible'`).
  3. *Perte des écritures en attente si effacement des données du navigateur* :
     - Si l'utilisateur vide le cache/stockage du navigateur avant que les écritures en attente aient pu atteindre Firestore, ces données locales sont perdues.
     - *Mitigation* : documentée comme limite inhérente aux applications Web sans compte authentifié persistant (cloud sync anonyme). L'utilisation d'une authentification Google (bonus M7b) permettra une restauration cross-devices.
  4. *Fusion bidirectionnelle (Union)* :
     - À la reconnexion, les quêtes distantes présentes sous `users/{uid}/completions` sont lues et fusionnées en union dans IndexedDB (sans écraser les photos locales existantes).

## 7. Permissions et capacités de l'appareil

| Capacité / API | Déclenchée quand | Pourquoi à ce moment | Si refus |
|----------------|------------------|----------------------|----------|
| Caméra (`<input capture>`) | Clic « Valider ici » | Geste utilisateur explicite | Message d'erreur + retour liste |
| Géolocalisation | Après prise de photo | Nécessaire pour la validation | Message + suggestion d'activer dans les réglages |

### 7.1 Règle de validation et flux d'acquisition (M2)

- **Ordre d'exécution** :
  1. Écran d'explication de permission (déclenché sur geste utilisateur « Valider ici »).
  2. Capture photo via `<input type="file" accept="image/*" capture="environment">`. Compression côté client via `createImageBitmap(file, { imageOrientation: 'from-image' })` en WebP (1280 px max, qualité 0.8, ≈150 Ko) avec repli JPEG. Aperçu affiché avec option « Reprendre ».
  3. Géolocalisation via `navigator.geolocation.getCurrentPosition` (`enableHighAccuracy: true`, `timeout: 15000`, `maximumAge: 0`). Gestion détaillée des erreurs : refusée (`PERMISSION_DENIED`), indisponible (`POSITION_UNAVAILABLE`), expiration (`TIMEOUT`).
  4. Calcul orthodromique de la distance par la formule de **Haversine**.
  5. Règle de validation stricte (Décisions D4 & D7) :
     - La précision du signal GPS doit être **strictement ≤ 50 m**. Si `accuracyM > 50 m`, refus strict avec le message explicite : *« Signal GPS trop imprécis, avance à découvert et réessaie »* et bouton Réessayer.
     - La distance à la cible doit être **≤ radiusM**.
  6. Écran de confirmation et persistance locale immédiate dans **IndexedDB** (`completions` + `photos`).
  7. **Recalcul du score** : les points ne sont jamais incrémentés dans un compteur fixe mais recalculés dynamiquement par `computeScore` sur l'ensemble des quêtes uniques complétées.

### 7.2 Mode Démo

- Réglage commutable visible directement dans l'en-tête de l'application.
- Permet à l'évaluateur de valider n'importe quelle quête sans être physiquement présent en Corse.
- Une quête validée en démo porte le flag `isDemo: true`, affiche un badge distinctif `🧪 Démo`, alimente un score démo séparé (`+X démo`) et ne compte **jamais** dans le score réel.
- Bouton « Réinitialiser démo » permettant de purger en un clic les validations de test.

> Rejet systématique si `accuracyM > 50 m` (décisions D4 et D7).

## 8. Notifications

Aucune notification en v1 de base (justification : le rally est une activité ponctuelle et volontaire, les notifications non sollicitées nuiraient à l'expérience). Notifications push FCM prévues en M7a (bonus).

## 9. Visibilité : SEO et agents IA

### 9.1 SEO / GEO : Choix et vérifications (M4)

- **Architecture de pré-rendu statique** :
  - Génération au build sans framework SSR lourd via `scripts/build-seo.ts` (exécuté automatiquement lors de `npm run build`).
  - Arborescence générée dans `dist/` :
    - `/` (`dist/index.html`) : Présentation générale, catalogue complet des 12 quêtes, FAQ globale.
    - `/villes/{ajaccio|bastia|corte}.html` : Pages territoires dédiées avec tableaux de quêtes et FAQ locale.
    - `/lieux/{questId}.html` : Fiches unitaires pour chaque lieu avec tableau factuel (coordonnées GPS, altitude, rayon, points, source OSM).
  - L'application interactive SPA vit isolée sous `/app/`.

- **GEO (Generative Engine Optimization) pour les agents IA & LLM** :
  - **Fichier `llms.txt`** à la racine : description concise du projet en 3 lignes, liste des liens clés et fiches quêtes synthétisées en une phrase pour faciliter la citation par les moteurs génératifs.
  - **Fichier `robots.txt`** : autorise explicitement les robots d'IA majeurs (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`) sur l'ensemble du contenu public, et applique `Disallow: /app/` et `Disallow: /s/`.
  - **Fichier `sitemap.xml`** : indexe l'ensemble des 16 URLs statiques avec fréquence hebdomadaire et dates de révision.
  - **Données structurées Schema.org (JSON-LD)** :
    - Pages lieux : `@type: TouristAttraction` avec `geo: GeoCoordinates`, `address: PostalAddress`, `BreadcrumbList` et `FAQPage`.
    - Pages villes : `@type: Place` et `FAQPage`.
    - Page d'accueil : `@type: WebSite`.
  - **Correspondance stricte FAQ** : chaque question/réponse du balisage JSON-LD correspond mot à mot au texte HTML visible sur la page.
  - **Accessibilité sans JS** : 100 % du contenu éditorial, tableaux de données et FAQ est lisible même si JavaScript est désactivé dans le navigateur.

## 10. Sécurité et vie privée

- **Données locales** : IndexedDB (completions, photos, meta). Jamais de données sensibles.
- **Données envoyées au serveur** : completions (sans photo ni position brute de l'utilisateur). Les coordonnées publiées sont celles du catalogue, pas celles de l'utilisateur.
- **Secrets** : configuration Firebase web dans `.env` (gitignored). Les clés Firebase web sont publiques par nature (restriction par domaine dans la console).
- **Règles Firestore** : lecture publique de `shares/**`, écriture restreinte au propriétaire (`request.auth.uid == ownerUid`), `users/{uid}/**` accessible uniquement par `uid`.
- **Limite documentée** : la position GPS peut être falsifiée côté client. Acceptable pour un TP ; piste : vérification serveur via Cloud Function (plan payant).
- **Pages de partage** : `noindex`, pas d'exposition de la position brute.
- **En-têtes de sécurité** : à configurer dans `firebase.json` (M5).

## 11. Mesures

### 11.1 Résultats des tests

> À compléter à chaque jalon. Voir `docs/TESTS.md` pour le journal détaillé.

## 12. Limites connues et suite

### 12.1 Compatibilité navigateurs (iOS vs Android)

| Fonctionnalité | Android (Chrome) | iOS (Safari) |
|----------------|------------------|--------------|
| Installation PWA | ✅ Événement `beforeinstallprompt` + `prompt()` | ⚠️ Pas d'événement standard. Détection User-Agent + guidage manuel (« Partager » > « Sur l'écran d'accueil ») |
| Détection standalone | ✅ `(display-mode: standalone)` | ✅ `(display-mode: standalone)` ou `navigator.standalone` |
| Mémorisation refus | ✅ 7 jours (`localStorage`) | ✅ 7 jours (`localStorage`) |
| Service Worker | ✅ | ✅ |
| Background Sync | ✅ | ❌ (repli : `online` event + ouverture app) |
| Push notifications | ✅ | ✅ (iOS 16.4+, app installée sur écran d'accueil) |
| `<input capture>` | ✅ | ✅ |
| Géolocalisation | ✅ | ✅ |

### 12.2 Limites et pistes v2

- Position GPS falsifiable côté client → vérification serveur (Cloud Function, plan Blaze).
- Pas de carte en v1 → Leaflet + tuiles OSM en M5 (optionnel).
- 12 quêtes en v1 → 20-25 après M6, extensible par communauté.
- Auth anonyme uniquement → connexion Google en M7b (bonus) pour synchronisation multi-appareils.
- Photos dans Firestore (limite de bande passante) → migration vers Firebase Storage si nécessaire.

---

## Annexe A — Sources et licences

- **Données géographiques** : © contributeurs OpenStreetMap ([openstreetmap.org](https://www.openstreetmap.org/)), licence ODbL.
- **Coordonnées des quêtes** : extraites d'OpenStreetMap (Overpass API) ou Wikidata, vérifiées manuellement.
- **Champ `source`** dans `quests.json` : traçabilité de l'origine de chaque coordonnée.
