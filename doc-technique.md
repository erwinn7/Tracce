# Tracce — Document technique (Technical Design Doc)

**Auteur** : Meldi · **Date** : 2026-10-12 · **URL de production** : https://tracce-corse.web.app/ · **Statut** : final

> Document technique rédigé selon la structure en 12 sections imposée par le modèle enseignant (`docs/reference/doc-technique-modele.md`). Chaque choix est nommé, justifié et vérifiable dans le code source du projet.

---

## 1. TL;DR

**Tracce** (« traces » en langue corse) est une Progressive Web App (PWA) de rally photo géolocalisé invitant touristes et randonneurs à explorer le patrimoine naturel et historique de Corse (Ajaccio, Bastia, Corte). L'utilisateur gagne des points en se rendant sur place, en photographiant le lieu et en validant sa présence par géolocalisation. Le choix technique fondamental repose sur une architecture **100 % hors ligne** combinant **Vite + React 19 + TypeScript**, **Workbox** pour le Service Worker, **IndexedDB** (`idb`) pour la persistance locale et **Firebase Firestore** avec cache persistant pour la synchronisation différée.

---

## 2. Contexte et objectifs

- **Problème** : Les sentiers et sites remarquables de Corse se situent fréquemment en zone blanche ou à connectivité intermittente. Les applications touristiques classiques échouent dès la perte de réseau.
- **Goals (ce que la v1 fait)** :
  - Catalogue embarqué de 12 quêtes réelles vérifiées (monuments, citadelles, lacs, sommets).
  - Fonctionnement intégral hors ligne (App shell, photos, coordonnées, calculs).
  - Validation stricte sur le terrain (photo compressée côté client + position GPS dans le rayon requis avec précision $\le 50$ m).
  - Synchronisation Cloud Firestore non bloquante au retour du réseau avec Auth anonyme.
  - Mode Démo commutable pour tester l'application sans être physiquement en Corse.
  - Espace Administrateur sécurisé (`erwinn` / `pwaErwinn`) avec ajout de quêtes et capture GPS automatique du terminal.
  - Visibilité SEO et GEO (Generative Engine Optimization) via pré-rendu statique au build (`sitemap.xml`, `robots.txt`, `llms.txt`, Schema.org JSON-LD).
- **Non-goals (ce que la v1 ne fait volontairement pas)** :
  - Pas de réseau social, fil d'actualité ou chat en direct.
  - Pas de cartographie tuilée lourde pré-téléchargée (évite la saturation mémoire et respecte les conditions d'utilisation d'OpenStreetMap).
  - Aucune fonction de partage social complexe (M5 écarté du périmètre du TP).
  - Pas de Cloud Functions payantes (restreint strictement au plan gratuit Firebase Spark).

---

## 3. Architecture

### 3.1 Stack technique et justifications

| Composant | Choix retenu | Rationale & Justification | Alternative écartée (et pourquoi) |
|---|---|---|---|
| **Framework UI** | React 19 + TypeScript | Typage statique strict, hooks natifs pour les capteurs navigateur, écosystème éprouvé | Vanilla JS (trop verbeux pour la gestion d'états réactifs complexes) |
| **Outillage de build** | Vite 6 | Bundling ESM ultra-rapide, intégration native avec `vite-plugin-pwa` | Webpack (configuration trop lourde et lente) |
| **Service Worker** | `vite-plugin-pwa` (Workbox) | Génération automatisée des manifests et des révisions de cache, mode `prompt` standardisé | SW manuel (gestion manuelle des révisions sujette aux erreurs) |
| **Stockage local** | IndexedDB via `idb` | Capacité de stockage élevée, support natif des Blobs d'images (WebP) | `localStorage` (bloqué à 5 Mo, synchrone, pas de stockage binaire) |
| **Backend & Cloud** | Firebase Hosting & Firestore | Cache persistant hors ligne multi-onglets natif, Auth anonyme sans friction, plan gratuit Spark | Supabase / Backend sur mesure (nécessite un serveur dédié) |
| **Suite de tests** | Vitest | Exécution instantanée intégrée à Vite pour les fonctions pures | Jest (problèmes de compatibilité avec les modules ESM purs) |

### 3.2 Schéma d'architecture globale

```text
Navigateur Client (Mobile / Desktop)
  ├── React SPA (/)
  │   ├── Interface & Écran d'accueil (Video, Présentation, Auth)
  │   ├── Formulaire Admin (Capture GPS directe)
  │   └── IndexedDB (idb)
  │       ├── completions (validations locales)
  │       ├── photos (Blobs WebP compressés ≤ 150 Ko)
  │       ├── customQuests (quêtes ajoutées par l'admin)
  │       └── meta (versions catalogue et horodatages sync)
  ├── Service Worker (Workbox, registerType: prompt)
  │   ├── Précache (/index.html, /manifest, /data/quests.json, /icons, /media)
  │   └── Runtime Cache (CacheFirst pour images hors précache)
  └── Pages SEO / GEO pré-rendues au build (dist/)
      ├── / (dist/index.html avec JSON-LD et noscript)
      ├── /villes/{ajaccio|bastia|corte} (.html et /index.html)
      └── /lieux/{questId} (.html et /index.html)

Serveur Cloud Firebase (Plan Spark gratuit)
  ├── Firebase Hosting (CDN HTTPS, cleanUrls, rewrites)
  ├── Firebase Auth (Authentification Anonyme)
  └── Cloud Firestore (persistentLocalCache)
      └── users/{uid}/completions/{questId} (succès synchronisés)
```

---

## 4. Cache et hors ligne

### 4.1 Stratégie de cache du Service Worker

| Ressource | Stratégie | Emplacement de stockage | Rationale |
|---|---|---|---|
| **App shell (HTML, CSS, JS)** | Precache (`navigateFallback: /index.html`) | Cache Storage | Affichage immédiat et navigation SPA fluide même en mode avion |
| **Catalogue (`quests.json`)** | Precache | Cache Storage | Données de référence de base disponibles sans aucune connexion |
| **Illustrations et Logos** | Precache & CacheFirst | Cache Storage | Identité visuelle préservée hors ligne |
| **Images runtime (`png`, `jpg`, `webp`)** | CacheFirst (max: 50 entrées, 30 jours) | Cache Storage (`tracce-images-cache`) | Économie de bande passante et persistance des visuels |
| **Endpoints Firebase (Firestore, Auth)** | NetworkOnly (Bypass total du SW) | Traité en interne par Firestore SDK | Évite tout conflit avec le cache persistant SQLite/IndexedDB natif de Firestore |

### 4.2 Expérience hors ligne

- **Ce que l'utilisateur voit hors ligne** : L'intégralité du catalogue, le détail de chaque lieu, l'écran de bienvenue avec la vidéo (si préchargée), son score réel et démo, l'historique de ses validations et les photos associées.
- **Ce qui est désactivé** : La synchronisation immédiate vers Firebase (l'indicateur bascule automatiquement sur « Hors ligne » ou « En attente »).
- **Page de secours** : Gérée nativement par `navigateFallback: /index.html`, aucune page d'erreur 404 navigateur n'apparaît.

---

## 5. Mise à jour

- **Stratégie retenue** : Mise à jour proposée à l'utilisateur (`registerType: 'prompt'`).
- **Justification** : Un rechargement automatique brutal (`autoUpdate`) pourrait interrompre la prise d'une photo ou une acquisition GPS critique sur le terrain.
- **Mécanisme** :
  - Workbox écoute `onNeedRefresh`.
  - Vérification périodique toutes les heures via `registration.update()` et au réveil de l'application (`visibilitychange`).
  - Bannière flottante en haut d'écran ([`FloatingBanner.tsx`](src/components/FloatingBanner.tsx)) proposant « Mettre à jour » (qui déclenche `updateServiceWorker(true)`) ou « Plus tard ».

---

## 6. Données et synchronisation

### 6.1 Modèle de données

**Stores IndexedDB (Base `tracce-db`)** :
- `completions` : `{ questId (key), completedAt, lat, lng, accuracyM, distanceToTargetM, photoId, isDemo, syncedToFirestore }`
- `photos` : `{ id (key), blob, createdAt }`
- `customQuests` : `{ id (key), cityId, type, name, description, lat, lng, altitudeM, radiusM, points, source }`
- `meta` : `{ key, catalogVersion, lastSyncAt }`

**Documents Cloud Firestore** :
- `users/{uid}/completions/{questId}` : `{ questId, completedAt, lat, lng, accuracyM, distanceToTargetM }` *(uniquement pour les validations réelles hors démo)*.

### 6.2 Synchronisation et cas limites

- **Envoi asynchrone non-bloquant** : L'UI écrit immédiatement dans IndexedDB et déclenche `setDoc` sans bloquer le rendu (`hasPendingWrites` reflète l'état).
- **Cas limite 1 : Premier lancement hors ligne (aucun UID)** : Les quêtes restent avec `syncedToFirestore: false`. Dès que l'événement `online` survient, `signInAnonymously()` est exécuté et les validations en attente sont poussées.
- **Cas limite 2 : Absence de Background Sync sur iOS** : WebKit ne supportant pas Background Sync, la synchronisation s'appuie sur les événements `online` et `visibilitychange` (retour au premier plan).
- **Conflits de données** : Le score est recalculé dynamiquement par union des quêtes uniques complétées (`computeScore`), éliminant tout risque de conflit sur un compteur incrémental.

---

## 7. Permissions et capacités de l'appareil

| Capacité / API | Déclenchée quand | Pourquoi à ce moment | Comportement si refus |
|---|---|---|---|
| **Caméra** (`<input capture="environment">`) | Clic sur « Valider ici » | Geste explicite du joueur sur le lieu | Message explicatif et maintien sur la fiche de quête |
| **Géolocalisation** (`getCurrentPosition`) | Après la prise de photo (joueur) / Sur « Utiliser ma position » (admin) | Preuve de présence physique stricte | Message clair avec bouton « Réessayer » et conseils |

### Règle de validation stricte (Décisions D4 & D7) :
Une quête est validée **si et seulement si** :
1. $\text{accuracyM} \le 50\text{ m}$ (rejet strict au-delà avec message « Signal GPS trop imprécis, avance à découvert et réessaie »).
2. $\text{distanceToTargetM} \le \text{radiusM}$ (calculé par la formule de Haversine).

---

## 8. Notifications

- **Choix v1** : Aucune notification push active par défaut en v1 de base.
- **Justification** : Le rallye photo est une activité volontaire de terrain en pleine nature. Des notifications non sollicitées perturberaient l'utilisateur et consommeraient inutilement la batterie en itinérance.

---

## 9. Visibilité : SEO et agents IA (GEO)

- **Pré-rendu statique sans framework SSR** ([`scripts/build-seo.ts`](scripts/build-seo.ts)) :
  - Génération de 16 pages HTML publiques prêtes à l'emploi dans `dist/` (`/`, `/villes/*`, `/lieux/*`).
  - Double génération pour les routes (`.html` et `/index.html`) combinée à `cleanUrls: true` pour éliminer toute erreur 404 sur Firebase Hosting.
- **GEO (Generative Engine Optimization pour LLMs & Moteurs IA)** :
  - Fichier `llms.txt` à la racine résumant le projet et indexant chaque quête en 1 ligne.
  - Fichier `robots.txt` autorisant explicitement `GPTBot`, `ClaudeBot`, `PerplexityBot` et `Google-Extended`.
  - Balisage Schema.org JSON-LD complet (`TouristAttraction`, `GeoCoordinates`, `PostalAddress`, `FAQPage`, `WebSite`).
  - Contenu 100 % lisible sans JavaScript via fallback textuel `<noscript>`.

---

## 10. Sécurité et vie privée

- **Règles Firestore ([`firestore.rules`](firestore.rules))** :
  - Fermeture complète par défaut (`allow read, write: if false;`).
  - Collection `users/{uid}/completions/{questId}` : accessible uniquement si `request.auth.uid == uid`, avec validation stricte des types (`number`, `string`, `timestamp`) et absence de champs superflus.
- **Vie privée** : Les coordonnées GPS brutes de l'utilisateur ne sont jamais publiées. Seules les coordonnées du lieu sont stockées.
- **Limites de sécurité documentées** : La position GPS peut être émulée côté client dans les outils de développement (DevTools). Toléré dans le cadre d'un TP pédagogique ; la piste en production consisterait en une vérification par Cloud Function.

---

## 11. Mesures et vérifications

- **Tests unitaires ([`src/utils/geo.test.ts`](src/utils/geo.test.ts))** :
  - 11 tests unitaires Vitest automatisés validant la formule de Haversine (précision $\pm 1\%$), les limites de rayon, le rejet strict $\text{GPS} > 50\text{ m}$ et le dédoublonnage de score.
- **Journal exhaustif des tests** : Consulter [`docs/TESTS.md`](docs/TESTS.md) recensant les tests fonctionnels par jalon (M0 à M4) sur Chrome Desktop, Mobile et Safari iOS.

---

## 12. Limites connues et suite (v2)

### 12.1 Compatibilité navigateurs

| Fonctionnalité | Android (Chrome) | iOS (Safari) |
|---|---|---|
| Installation PWA | ✅ Événement standard `beforeinstallprompt` | ⚠️ Pas d'événement : guidage pas-à-pas « Partager » > « Sur l'écran d'accueil » |
| Mode Standalone | ✅ Détecté via `(display-mode: standalone)` | ✅ Détecté via `navigator.standalone` |
| Background Sync | ✅ Natif | ❌ Repli sur événements `online` et `visibilitychange` |
| Capture Caméra | ✅ Supporté | ✅ Supporté |

### 12.2 Évolutions futures envisagées (v2)
- Passage à 25-30 quêtes avec extension communautaire.
- Authentification Google optionnelle pour synchronisation multi-terminaux.
- Intégration d'une cartographie interactive vectorielle légère (Leaflet avec tuiles mises en cache à la volée).

---

## Annexe A — Sources et licences
- **Données cartographiques** : © contributeurs [OpenStreetMap](https://www.openstreetmap.org/) (licence ODbL).
- **Extractions de coordonnées** : Overpass API et Wikidata, vérifiées manuellement.
