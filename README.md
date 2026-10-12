# 🌿 Tracce — Rally Photo Géolocalisé en Corse (PWA)

[![PWA Ready](https://img.shields.io/badge/PWA-Ready-2D4A3E.svg)](https://tracce-corse.web.app/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Hosting%20%26%20Firestore-FFA611.svg)](https://firebase.google.com/)
[![Tests Passing](https://img.shields.io/badge/Tests-11%20Passed-success.svg)](docs/TESTS.md)

**Tracce** (« traces » en langue corse) est une **Progressive Web App (PWA)** de rally photo géolocalisé. Conçue pour fonctionner sur le terrain même en zone blanche (montagne, sentiers littoraux), elle permet aux explorateurs de découvrir les richesses patrimoniales et naturelles d'**Ajaccio**, **Bastia** et **Corte**, de capturer chaque étape en photo et de prouver leur présence grâce au GPS.

Projet réalisé dans le cadre du module **M2 DWM — Développement PWA**.

---

## 🌟 Fonctionnalités principales

- 📱 **PWA Installable & Responsive** : Conforme aux critères PWA (Web App Manifest, icônes 192/512 et maskable, `display: standalone`). Bannière flottante d'installation pour Android (capteur `beforeinstallprompt`) et guide pas-à-pas pour Safari iOS.
- ⚡ **100 % Fonctionnelle Hors Ligne** : Service Worker Workbox assurant le précache de l'App Shell, du catalogue de 12 quêtes vérifiées, des illustrations et de la vidéo. Persistance locale des validations et photos en **IndexedDB** (`idb`).
- 🔄 **Mise à jour fluide** : Service worker en mode `prompt`. Bannière non intrusive « Nouvelle version disponible » avec bouton de rechargement immédiat.
- ☁️ **Synchronisation Cloud Firestore** : Enregistrement différé et non-bloquant des succès dans `users/{uid}/completions/{questId}` via Firebase Anonymous Auth. Indicateur visuel d'état (« Synchronisé », « En attente (n) », « Hors ligne »).
- 📍 **Validation GPS stricte** : Calcul de distance par la formule de Haversine. Rejet systématique si le signal GPS est imprécis (> 50 m) ou si la distance dépasse le rayon cible.
- 📷 **Capacité Caméra** : Prise de vue native (`<input capture="environment">`), respect de l'orientation EXIF via `createImageBitmap` et compression WebP côté client (~150 Ko).
- 🎮 **Mode Démo** : Possibilité d'activer un mode de simulation pour valider les quêtes sans être physiquement sur place (score démo distinct, strictement isolé d'IndexedDB/Firestore).
- 👑 **Espace Administrateur** : Interface sécurisée pour l'admin permettant d'ajouter de nouveaux lieux au catalogue avec acquisition automatique de la position GPS du terminal en un clic.
- 🤖 **SEO & GEO (Generative Engine Optimization)** : Pages statiques pré-rendues au build pour chaque territoire et chaque lieu (`/villes/`, `/lieux/`), balises Schema.org JSON-LD, sitemap XML, `robots.txt` ouvert aux agents IA et résumé `/llms.txt`.

---

## 🔐 Identifiants Administrateur

Pour tester l'ajout de nouveaux lieux et les outils d'administration :
- **Identifiant** : `erwinn`
- **Mot de passe** : `pwaErwinn`

*(Pour les utilisateurs simples ou non connectés, les boutons techniques tels que le mode démo ou la synchronisation brute sont automatiquement masqués).*

---

## 🛠️ Stack Technique

- **Front-end** : [Vite](https://vitejs.dev/) + [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **PWA & Cache** : `vite-plugin-pwa` + [Workbox](https://developer.chrome.com/docs/workbox)
- **Stockage local** : [idb](https://github.com/jakearchibald/idb) (IndexedDB v3)
- **Backend & Déploiement** : [Firebase](https://firebase.google.com/) (Hosting, Firestore, Auth Anonyme)
- **Traitement d'images & build SEO** : [Sharp](https://sharp.pixelplumbing.com/) + scripts Node.js
- **Tests unitaires** : [Vitest](https://vitest.dev/)

---

## 🚀 Démarrage Rapide

### 1. Installation des dépendances
```bash
npm install
```

### 2. Variables d'environnement
Copiez le fichier `.env.example` en `.env` et renseignez vos clés Firebase :
```bash
cp .env.example .env
```

### 3. Lancer en local (développement)
```bash
npm run dev
```
L'application est accessible sur [http://localhost:5173/](http://localhost:5173/).

### 4. Exécuter les tests unitaires
```bash
npm test
```
*Valide les calculs de distance Haversine, les seuils de précision GPS et le recalcul dynamique des scores.*

### 5. Compiler pour la production
```bash
npm run build
```
Cette commande compile le code TypeScript, génère le bundle PWA et exécute automatiquement `scripts/build-seo.ts` pour générer les pages HTML statiques (`/villes/`, `/lieux/`), `robots.txt`, `sitemap.xml` et `llms.txt` dans le dossier `dist/`.

### 6. Déploiement sur Firebase Hosting & Firestore
```bash
npm run deploy
```
*(ou `firebase deploy`)*

---

## 📂 Architecture du Projet

```text
├── docs/
│   ├── ARCHITECTURE.md     # Document technique complet (12 sections imposées)
│   └── TESTS.md            # Journal de validation de chaque jalon et appareil
├── public/
│   ├── data/quests.json    # Catalogue officiel des 12 quêtes insulaires (OSM/Wikidata)
│   ├── icons/              # Logos découpés PWA (192, 256, 512, maskable)
│   ├── media/              # Vidéo teaser de présentation et logo source
│   └── favicon.svg         # Favicon vectoriel
├── scripts/
│   └── build-seo.ts        # Générateur statique SEO/GEO sans framework SSR
├── src/
│   ├── components/         # Composants UI (Validation, Drawer, Auth, Admin, etc.)
│   ├── hooks/              # Hooks React (useCatalog, useSync, useAuth, etc.)
│   ├── lib/                # Connecteurs IndexedDB (idb) et Firebase SDK
│   ├── types/              # Définitions TypeScript strictes
│   ├── utils/              # Logique métier pure (geo.ts) testée par Vitest
│   ├── App.tsx             # Point d'entrée de l'application interactive
│   └── main.tsx            # Initialisation React et Service Worker
├── firebase.json           # Configuration Hosting, cleanUrls et rewrites
├── firestore.rules         # Règles de sécurité strictes Firestore
├── SPEC.md                 # Spécifications et critères d'évaluation du TP
└── vite.config.ts          # Configuration Vite & VitePWA (Workbox)
```

---

## 📚 Documentation Technique

Pour une analyse détaillée des choix d'architecture, des stratégies de cache, des flux de synchronisation et des limites documentées :
- 📖 Consulter le document technique officiel : [doc-technique.md](doc-technique.md) (ou [docs/doc-technique.md](docs/doc-technique.md))
- 🧪 Consulter le journal des tests dans [docs/TESTS.md](docs/TESTS.md)

---

## 📄 Licence & Crédits
- Données géographiques : © contributeurs [OpenStreetMap](https://www.openstreetmap.org/) (licence ODbL).
- Projet réalisé dans un cadre pédagogique (M2 DWM).
