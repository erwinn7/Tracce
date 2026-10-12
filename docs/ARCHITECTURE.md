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
| App shell (HTML, CSS, JS) | Precache | Cache Storage | Disponibilité immédiate hors ligne |
| `quests.json` | Precache | Cache Storage | Catalogue consultable sans réseau |
| `favicon.svg`, icônes PNG | Precache | Cache Storage | Branding hors ligne |
| API Firestore | NetworkFirst | Cache Storage | Données fraîches quand possible, fallback hors ligne |
| Tuiles OSM (M5, optionnel) | CacheFirst (à l'usage) | Cache Storage | Pas de préchargement massif (politique OSM) |

> À compléter en M3 avec les stratégies runtime détaillées.

## 5. Mise à jour

### 5.1 Cycle de mise à jour

- **Stratégie** : mise à jour proposée à l'utilisateur (`registerType: 'prompt'`).
- **Raison** : éviter une interruption pendant une validation de quête en cours.
- **Mécanisme** : le SW détecte une nouvelle version → événement `waiting` → bannière « Nouvelle version disponible » + bouton « Recharger » → `skipWaiting()` + `clients.claim()` + rechargement.
- **Versionnage** : le hash des fichiers dans le précache Workbox sert de version implicite.

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

### 6.2 Mécanisme de synchronisation et cas limites

> À compléter en M3.

## 7. Permissions et capacités de l'appareil

| Capacité / API | Déclenchée quand | Pourquoi à ce moment | Si refus |
|----------------|------------------|----------------------|----------|
| Caméra (`<input capture>`) | Clic « Valider ici » | Geste utilisateur explicite | Message d'erreur + retour liste |
| Géolocalisation | Après prise de photo | Nécessaire pour la validation | Message + suggestion d'activer dans les réglages |

> Écran d'explication affiché avant la première demande de permission.
> Rejet si `accuracyM > 50 m` (décision D4).

## 8. Notifications

Aucune notification en v1 de base (justification : le rally est une activité ponctuelle et volontaire, les notifications non sollicitées nuiraient à l'expérience). Notifications push FCM prévues en M7a (bonus).

## 9. Visibilité : SEO et agents IA

### 9.1 SEO / GEO : choix et vérifications

> À compléter en M4.

- Pages statiques générées au build (`scripts/build-seo.ts`).
- `robots.txt` autorisant `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended` sur les pages publiques.
- `noindex` sur `/s/` (pages de partage) et `/app` (SPA).
- `llms.txt`, `sitemap.xml`, JSON-LD (`TouristAttraction`, `FAQPage`, `BreadcrumbList`).
- FAQ visible en HTML + JSON-LD correspondant.

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
| Installation PWA | ✅ | ✅ (iOS 16.4+, Add to Home Screen) |
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
