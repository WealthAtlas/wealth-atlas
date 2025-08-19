/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Detect GitHub Pages repository name to set correct base path when building in CI.
// For user/organization pages (repo ends with .github.io), base should be '/'.
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = repoName && !repoName.endsWith('.github.io') ? `/${repoName}/` : '/';

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
      '@': path.resolve(__dirname, './src'),
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
