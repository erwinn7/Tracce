# SPEC : « Tracce », PWA de rally photo géolocalisé en Corse

> Fichier de référence pour l'agent. Les décisions marquées **[DÉCISION]** sont fermes. Les points marqués **[À CONFIRMER]** doivent être signalés dans le plan avant d'être implémentés.

## 1. Contexte et objectif

TP de développement PWA noté sur 10 (+3 bonus). L'application s'appelle **Tracce** (« traces » en corse : la trace photo et GPS laissée à chaque lieu, monument de ville comme sommet). C'est un rally photo : l'utilisateur gagne des points en validant des **quêtes**. Une quête = se rendre à un lieu proposé par l'appli, y prendre une photo, et prouver sa présence par la géolocalisation. Périmètre initial : **Ajaccio, Bastia, Corte** et les sommets/sites naturels environnants. Après avoir exploré un lieu, l'utilisateur peut publier sa sortie via un **lien public partagé** (pas de réseau social, pas de fil).

**Nom et identité [DÉCISION]** : `manifest.name` = « Tracce », `short_name` = « Tracce », `<title>` des pages = « … | Tracce ». Identifiant de projet Firebase suggéré : `tracce-corse` (à remplacer par l'identifiant réellement créé). Couleur de thème et icône : à proposer dans le plan, sobres, lisibles sur écran d'accueil. Ne jamais employer un vocabulaire limité aux sommets dans l'interface ou les textes : une quête peut être un monument, une place, un sommet ou un site naturel.

Public cible : randonneur ou touriste, téléphone, réseau souvent absent. Langue de l'interface : français.

## 2. Critères d'acceptation reliés au barème

| Barème | Pts | Critère vérifiable |
|---|---|---|
| Déployée, testée sur téléphone | 1 | URL HTTPS Firebase Hosting ; parcours complet testé sur un vrai téléphone (iOS ou Android), noté dans `docs/TESTS.md` |
| Installable | 1 | Manifest valide, icônes 192/512 + maskable, `display: standalone`, installation réussie (panneau Application de DevTools + téléphone) |
| Hors ligne | 2 | En mode avion après un premier chargement : l'appli s'ouvre, le catalogue est consultable, une quête peut être validée (photo + position), les photos et la progression sont conservées |
| Mise à jour | 1 | Une nouvelle version déployée déclenche une bannière « Nouvelle version disponible » avec bouton « Recharger » (service worker en mode `prompt`, pas de rechargement silencieux) |
| Synchronisation au retour du réseau | 1 | Les validations faites hors ligne partent vers Firestore au retour du réseau ; un indicateur visible affiche « en attente » puis « synchronisé » |
| Visibilité SEO / GEO | 1 | Pages publiques prérendues (voir §7) avec balises meta, JSON-LD, sitemap, robots.txt, `llms.txt` ; contenu lisible sans JavaScript |
| Une capacité de l'appareil | 1 | Caméra (photo de la quête) |
| Document technique | 2 | `docs/ARCHITECTURE.md` complet (voir §9) |
| Bonus : seconde capacité | +1 | Géolocalisation (déjà au cœur de la validation) |
| Bonus : notifications push | +1 | Voir jalon M7a |
| Bonus : réconciliation de conflits | +1 | Voir jalon M7b |

## 3. Stack **[DÉCISION, modifiable si le prof impose autre chose]**

- Front : **Vite + React + TypeScript**, `vite-plugin-pwa` (Workbox, `registerType: 'prompt'`).
- Données locales : **IndexedDB** via la bibliothèque `idb`.
- Backend : **Firebase** (Hosting, Firestore avec cache persistant hors ligne, Auth anonyme, FCM pour le bonus). Plan **Spark (gratuit)** uniquement. Aucune Cloud Function.
- Cartographie : aucune carte obligatoire en v1. Liste triée par distance + distance/direction vers la cible. Carte Leaflet optionnelle en M5, tuiles OSM mises en cache à l'usage uniquement (le préchargement massif de tuiles OSM est interdit par leur politique d'usage).
- Pages SEO : script de build Node qui génère du HTML statique à partir de `quests.json` (pas de framework SSR).
- Tests : Vitest pour la logique (distance, points, fusion), vérifications manuelles documentées pour le reste.

## 4. Modèle de données

### 4.1 Catalogue (statique, embarqué, versionné)
`public/data/quests.json`, mis en précache du service worker.

```ts
type Quest = {
  id: string;            // slug stable, ex. "corte-citadelle"
  cityId: "ajaccio" | "bastia" | "corte";
  type: "ville" | "colline" | "sommet" | "site-naturel";
  name: string;
  description: string;   // 2 à 4 phrases, texte original (pas de copie d'un site)
  lat: number; lng: number;
  altitudeM?: number;
  radiusM: number;       // rayon de validation
  points: number;
  source: "osm" | "wikidata" | "manuel";
};
type Catalog = { version: string; quests: Quest[] };
```

**Barème de points [DÉCISION]** : ville 10, colline 25, site naturel 25, sommet 50. **Rayon de validation** : ville 100 m, colline/site naturel 150 m, sommet 100 m. Raison : la précision GPS en montagne varie de 10 à 50 m.

**Quêtes candidates (3 par catégorie suffisent pour la v1, 20 à 25 au total)**. Les noms sont des pistes ; les coordonnées doivent venir d'OpenStreetMap (Overpass) ou de Wikidata, puis être vérifiées à la main sur une carte :
- Ajaccio : maison Bonaparte, place Foch, citadelle, pointe de la Parata, Monte Gozzi.
- Bastia : place Saint-Nicolas, vieux port, citadelle (Terra Nova), Serra di Pigno, Monte Stello (Cap Corse).
- Corte : citadelle et belvédère, place Paoli, gorges de la Restonica, lacs de Melo et de Capitello, Monte Rotondo, Monte Cintu, Paglia Orba, Monte d'Oro.

Licence OSM (ODbL) : afficher « © contributeurs OpenStreetMap » dans l'appli et dans `docs/ARCHITECTURE.md`.

### 4.2 Données locales (IndexedDB)
- `completions` : `{ questId (clé), completedAt, lat, lng, accuracyM, distanceToTargetM, photoId }`
- `photos` : `{ id, blob (WebP, 1280 px max, ≈150 Ko), createdAt }`
- `meta` : `{ catalogVersion, lastSyncAt }`

### 4.3 Firestore
- `users/{uid}/completions/{questId}` : même contenu que local, sans la photo. `uid` vient de l'Auth anonyme.
- `shares/{shareId}` : `{ ownerUid, createdAt, title, cityId, items: [{ questId, completedAt }] }`. `shareId` = identifiant aléatoire non devinable (≥ 20 caractères).
- `shares/{shareId}/photos/{questId}` : `{ dataUrl }` (WebP base64, ≤ 200 Ko, donc sous la limite de 1 Mio par document).

**Photos publiées sans Firebase Storage [DÉCISION par défaut]** : Storage peut exiger le plan payant. Isoler l'accès derrière une interface `PhotoStore` (`put`, `getUrl`) pour pouvoir passer à Storage plus tard. **[À CONFIRMER]** dans la console Firebase du projet.

**Règles Firestore** (à écrire et tester dans l'émulateur) : lecture publique de `shares/**` ; création uniquement si `request.auth != null` et `ownerUid == request.auth.uid` ; mise à jour/suppression réservées au propriétaire ; limite de taille des champs ; `users/{uid}/**` lisible et modifiable uniquement par `uid`.

**Vie privée [DÉCISION]** : une page partagée n'expose que les coordonnées du lieu du catalogue, jamais la position brute de l'utilisateur. Un écran de confirmation avant publication montre exactement ce qui sera public. Les pages de partage sont en `noindex`.

## 5. Logique métier

- **Validation d'une quête** : (1) l'utilisateur ouvre la quête, (2) prend la photo, (3) l'appli lit la position (`enableHighAccuracy: true`, timeout 15 s), (4) calcule la distance (formule de haversine) entre la position et la cible, (5) valide si `distance ≤ radiusM`, ou si `distance ≤ radiusM + accuracyM` avec un message « précision faible », au choix de l'utilisateur (voir 6). Les points ne sont pas stockés : **ils sont recalculés** à partir de l'ensemble des quêtes validées. Raison : un ensemble de quêtes validées se fusionne sans conflit, un compteur non.
- **Limite connue à documenter** : la position peut être falsifiée côté client. Acceptable pour un TP ; à mentionner dans le document technique, avec la piste de la vérification serveur (Cloud Function, plan payant).
- **Permissions** : demander caméra et position au moment du premier usage, après un court écran qui explique pourquoi, sur geste de l'utilisateur. Gérer les cas refusé, indisponible et timeout avec un message clair et une action de repli.
- **Capture photo** : `<input type="file" accept="image/*" capture="environment">` en méthode principale (fonctionne sur iOS et Android, y compris hors ligne). Compression côté client avant stockage.

## 6. Écrans

1. **Accueil** : choix de la ville, score total, indicateur de synchronisation, bouton d'installation.
2. **Liste des quêtes** : filtre par ville et type, tri par distance si la position est connue, état (à faire / validée).
3. **Détail d'une quête** : description, altitude, distance, bouton « Valider ici ».
4. **Validation** : aperçu photo, résultat de la distance, confirmation.
5. **Mes sorties** : quêtes validées avec miniature ; sélection pour publier, écran de confirmation, génération du lien, bouton « Copier / Partager » (`navigator.share` avec repli copie).
6. **Page de partage publique** : `/s/:shareId`.
7. **Bannières** : mode hors ligne, mise à jour disponible, permission refusée.

Accessibilité : contrastes AA, cibles tactiles ≥ 44 px, textes alternatifs, navigation clavier.

## 7. SEO / GEO

Un parcours derrière un clic de connexion n'est pas indexable. Les pages suivantes sont **générées en HTML statique au build** (`scripts/build-seo.ts`) :
- `/` (présentation), `/villes/{ajaccio|bastia|corte}`, `/lieux/{questId}`.
- Chaque page : `<title>` et `meta description` uniques, balises Open Graph, `canonical`, `lang="fr"`, JSON-LD (`TouristAttraction` ou `Place` avec `geo`, `WebSite`, `BreadcrumbList`), contenu textuel réel en HTML.
- `sitemap.xml`, `robots.txt`, `llms.txt` (résumé du site pour les moteurs génératifs), en-têtes de cache raisonnables dans `firebase.json`.
- L'appli elle-même vit sous `/app`.
- **GEO = Generative Engine Optimization [DÉCISION, confirmée par l'enseignant]** : rendre le contenu facile à citer par les moteurs de réponse d'IA. Mesures obligatoires :
  - Chaque page de lieu commence par un résumé factuel de 2 à 3 phrases (nom, ville, type, altitude, accès, intérêt) répondant directement à une question probable.
  - Section FAQ en HTML visible sur les pages de lieux et de villes (3 questions minimum), avec JSON-LD `FAQPage` correspondant exactement au texte visible.
  - Données factuelles en listes ou tableaux HTML (altitude, coordonnées, difficulté, durée estimée) plutôt qu'en phrases longues.
  - `robots.txt` qui autorise les robots d'IA courants sur les pages publiques (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`) et `noindex` + `Disallow` sur `/s/` et `/app`.
  - `llms.txt` à la racine : description du site en 3 lignes, liste des pages clés avec une phrase chacune.
  - Contenu original, daté (`dateModified` en JSON-LD), sources citées (OSM/Wikidata) dans le texte.
  - Vérification : relire chaque page avec JavaScript désactivé, puis poser à un assistant d'IA 3 questions sur un lieu et noter dans `docs/TESTS.md` si le site est cité (résultat indicatif, non garanti).

## 8. Jalons (un jalon à la fois, validation avant le suivant)

- **M0 : Fondations et déploiement.** Projet Vite + React + TS, PWA minimale (manifest, service worker), Firebase Hosting, déploiement HTTPS, `docs/ARCHITECTURE.md` initialisé. *Vérification* : URL en ligne, installable sur téléphone.
- **M1 : Catalogue et liste.** `quests.json` (≥ 12 quêtes réelles vérifiées), écrans 1 à 3, précache. *Vérification* : liste visible en mode avion.
- **M2 : Validation d'une quête.** Caméra, géolocalisation, haversine, IndexedDB, score dérivé, tests Vitest sur distance et points. *Vérification* : validation réussie sur le terrain ou avec position simulée dans DevTools.
- **M3 : Hors ligne, mise à jour, synchronisation.** Stratégies Workbox documentées, bannière de mise à jour, Auth anonyme, écriture Firestore avec cache persistant, indicateur de synchronisation (`hasPendingWrites`), repli sur les événements `online` et à l'ouverture (Background Sync absent sur iOS). *Vérification* : valider hors ligne, rétablir le réseau, voir le document apparaître dans Firestore.
- **M4 : SEO / GEO.** Script de génération, pages, JSON-LD, sitemap, `llms.txt`. *Vérification* : HTML visible avec JavaScript désactivé ; Lighthouse (catégories SEO, Performance, Accessibilité) ; test des résultats enrichis de Google sur une page.
- **M5 : Publication par lien.** Écran de confirmation, `shares`, page publique, règles Firestore testées dans l'émulateur, carte Leaflet optionnelle.
- **M6 : Document technique et tests.** `docs/ARCHITECTURE.md` finalisé, `docs/TESTS.md` (appareils, versions, résultats).
- **M7a (bonus) : Notifications push.** FCM, permission sur geste utilisateur, une notification utile (ex. rappel d'une quête proche ou nouvelle version du catalogue). Sur iPhone, l'appli doit être installée sur l'écran d'accueil (iOS 16.4 minimum).
- **M7b (bonus) : Réconciliation de conflits.** Connexion Google optionnelle pour retrouver sa progression sur deux appareils. Règle de fusion : union des quêtes validées, `completedAt` le plus ancien conservé ; démontrer le cas « deux appareils hors ligne qui valident des quêtes différentes, puis se synchronisent ».

## 9. Contenu exigé du document technique (`docs/ARCHITECTURE.md`)

**Structure imposée par l'enseignant** : suivre les titres et l'ordre de `docs/reference/exemple-doc-technique-prof.md`. En cas de divergence avec la liste ci-dessous, l'exemple de l'enseignant prévaut. Reprendre la structure uniquement, jamais le contenu.

1. Objectif et périmètre. 2. Schéma d'architecture. 3. Choix techniques et alternatives écartées (avec raisons). 4. Modèle de données (local et Firestore). 5. Stratégie de cache du service worker par type de ressource. 6. Cycle de mise à jour. 7. Mécanisme de synchronisation et cas limites. 8. Sécurité et vie privée (règles Firestore, limite de la position falsifiable). 9. SEO / GEO : choix et vérifications. 10. Compatibilité navigateurs (iOS vs Android). 11. Résultats des tests. 12. Limites connues et pistes d'évolution. 13. Sources et licences (OSM).

## 10. Règles de travail pour l'agent

- Avant de coder : produire un **plan d'implémentation** et lister les questions ouvertes (maximum 5). Attendre la validation.
- Un jalon à la fois. À la fin de chaque jalon : résumer ce qui est fait, ce qui reste, comment vérifier, puis s'arrêter.
- Ne jamais inventer de coordonnées : les récupérer d'une source (OSM/Wikidata), les citer dans `quests.json` (`source`) et signaler celles à vérifier.
- Ne jamais committer de secrets. La configuration Firebase web va dans des variables d'environnement `.env`, avec un `.env.example`.
- Pas de dépendance ajoutée sans la justifier dans le plan.
- Consigner chaque décision d'architecture dans `docs/ARCHITECTURE.md` au moment où elle est prise.
- Code typé strictement, fonctions pures pour la logique métier (distance, points, fusion), testées.


## 11. Décisions validées

> Ajouté après validation du plan d'implémentation (2026-10-12).

| Ref | Décision |
|-----|----------|
| D1 | `docs/ARCHITECTURE.md` suit les **12 sections** du modèle enseignant (`doc-technique-modele.md`), dans l'ordre et avec les mêmes titres. Les sujets de la section 9 de la spec sont intégrés comme sous-sections de la section la plus proche ; « Sources et licences » va en annexe finale. |
| D2 | Photos publiées stockées dans **Firestore** (WebP base64, ≤ 200 Ko) derrière l'interface `PhotoStore`. Quotas du plan Spark documentés avec sources dans `ARCHITECTURE.md`. |
| D3 | `docs/TESTS.md` tenu à jour **à chaque jalon** dès M0. |
| D4 | Rayons conservés (sommet 100 m, site naturel 150 m, ville 100 m, colline 150 m). **Rejet** de toute mesure dont `accuracyM > 50 m`. **Mode démo** ajouté : réglage visible dans l'interface, validation marquée « démo », score séparé, réinitialisable en un clic. Permet de tester sans être en Corse. |
| D5 | **12 quêtes vérifiées** à M1 (4 par ville, types variés). Extension à 20-25 après M6. |
| D6 | Couleur thème `#2D4A3E` (vert montagne). Icône : empreinte de pas ou repère en SVG, version maskable avec zone de sécurité. |
| D7 | Validation stricte (M2) : une quête est valide si et seulement si `accuracyM <= 50 m` ET `distanceToTargetM <= radiusM`. L'option « rayon + précision » de la section 5 est supprimée. Si `accuracyM > 50 m`, refus strict avec le message « Signal GPS trop imprécis, avance à découvert et réessaie » et bouton Réessayer. |
