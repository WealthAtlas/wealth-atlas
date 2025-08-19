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
        globPatterns: ['**/*.{js,css,html}'],
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
