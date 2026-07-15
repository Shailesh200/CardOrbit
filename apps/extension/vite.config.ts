import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { defineConfig } from 'vite';

import manifest from './manifest.config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(rootDir, '../web/src');

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
      '@brand': path.resolve(rootDir, './src/brand'),
      '@hooks': path.resolve(rootDir, './src/hooks'),
      '@consumer-theme': path.join(webDir, 'consumer-theme.css'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
