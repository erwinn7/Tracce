import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/app/',
  build: {
    outDir: 'dist/app',
  },
  server: {
    open: '/app/',
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      scope: '/app/',
      includeAssets: ['favicon.svg', 'hero-landscape.svg', 'data/quests.json', 'icons/logo.png'],
      manifest: {
        name: 'Tracce',
        short_name: 'Tracce',
        description:
          'Rally photo géolocalisé en Corse — Explorez Ajaccio, Bastia, Corte et les sommets environnants.',
        theme_color: '#2D4A3E',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/app/',
        start_url: '/app/',
        lang: 'fr',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        navigateFallback: '/app/index.html',
        navigateFallbackDenylist: [/^\/__/], // Évite d'intercepter les URL internes Firebase
        runtimeCaching: [
          {
            // CacheFirst pour les images (SVG, PNG, JPG, WebP) hors précache avec plafond d'âge et d'entrées
            urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tracce-images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 jours
              },
            },
          },
          {
            // Les requêtes Firebase (Firestore, Auth, APIs google) ne sont JAMAIS mises en cache par le SW
            urlPattern: /^https:\/\/(?:firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|[a-z0-9-]+\.firebaseio\.com)/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
});
