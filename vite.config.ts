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
      includeAssets: ['favicon.svg', 'hero-landscape.svg', 'data/quests.json'],
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
      },
    }),
  ],
});
