import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
      '@brand': path.resolve(rootDir, './src/components/brand'),
      '@motion': path.resolve(rootDir, './src/components/motion'),
      '@marketing': path.resolve(rootDir, './src/components/marketing'),
      '@layout': path.resolve(rootDir, './src/components/layout'),
      '@features': path.resolve(rootDir, './src/features'),
      '@lib': path.resolve(rootDir, './src/lib'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
  },
});
