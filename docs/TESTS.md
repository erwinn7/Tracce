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
