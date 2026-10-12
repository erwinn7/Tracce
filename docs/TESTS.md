# Tracce — Journal de tests

> Mis à jour à chaque jalon dès M0.

---

## M0 — Fondations et déploiement

**Date** : 2026-10-12

| # | Test | Appareil / Navigateur | Résultat | Notes |
|---|------|----------------------|----------|-------|
| 1 | URL HTTPS accessible | — | ⬜ À tester | Nécessite déploiement Firebase Hosting |
| 2 | Manifest valide (DevTools → Application) | Chrome Desktop | ⬜ À tester | Vérifier `name`, `short_name`, `display`, icônes |
| 3 | Service worker actif (DevTools → Application) | Chrome Desktop | ⬜ À tester | `registerType: prompt` |
| 4 | Installation PWA sur Android | — | ⬜ À tester | Bannière d'installation ou menu « Ajouter à l'écran d'accueil » |
| 5 | Installation PWA sur iOS | — | ⬜ À tester | Safari → Partager → « Sur l'écran d'accueil » |
| 6 | Build local réussit (`npm run build`) | macOS | ⬜ À tester | `tsc -b && vite build` sans erreur |
| 7 | Bannière de mise à jour | Chrome Desktop | ⬜ À tester | Déployer une v2, vérifier l'apparition de la bannière |

### Comment vérifier

1. `npm run build` → pas d'erreur
2. `npm run preview` → ouvrir `http://localhost:4173/app/`
3. DevTools → Application → Manifest : vérifier les champs
4. DevTools → Application → Service Workers : statut « activated and is running »
5. Lighthouse → catégorie PWA (installable, SW actif)
6. Déployer sur Firebase Hosting → tester l'URL HTTPS sur téléphone
