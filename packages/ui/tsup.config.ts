import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    'radix-ui',
    'sonner',
    'lucide-react',
    'class-variance-authority',
    'clsx',
    'tailwind-merge',
  ],
  banner: {
    js: '"use client";',
  },
});
