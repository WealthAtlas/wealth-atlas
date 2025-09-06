/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Detect GitHub Pages repository name to set correct base path when building in CI.
// For user/organization pages (repo ends with .github.io), base should be '/'.
// Allow override via env (useful when publishing build to a separate orgname.github.io repo).
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const derivedBase = repoName && !repoName.endsWith('.github.io') ? `/${repoName}/` : '/';
const base = process.env.VITE_BASE_OVERRIDE || derivedBase;

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Wealth Atlas',
        short_name: 'WealthAtlas',
        description: 'Personal wealth management PWA',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(fileURLToPath(new URL('./', import.meta.url)), './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
  server: {
    port: 3000,
    open: true,
  },
});
