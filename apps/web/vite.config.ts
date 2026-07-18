import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const aliases = {
  '@': path.resolve(rootDir, './src'),
  '@brand': path.resolve(rootDir, './src/components/brand'),
  '@motion': path.resolve(rootDir, './src/components/motion'),
  '@marketing': path.resolve(rootDir, './src/components/marketing'),
  '@layout': path.resolve(rootDir, './src/components/layout'),
  '@features': path.resolve(rootDir, './src/features'),
  '@lib': path.resolve(rootDir, './src/lib'),
};

/** CSS preload only — avoid modulepreload competing with stylesheet on Slow 4G. */
function perfHtmlPlugin(): Plugin {
  return {
    name: 'cardwise-perf-html',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;

        const css = Object.values(ctx.bundle).find(
          (item) => item.type === 'asset' && item.fileName.endsWith('.css') && item.fileName.includes('index-'),
        );
        if (css == null) return html;

        return html.replace(
          '</head>',
          `<link rel="preload" href="/${css.fileName}" as="style"></head>`,
        );
      },
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    perfHtmlPlugin(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      // manifest.webmanifest is hand-authored in public/ (linked from index.html).
      manifest: false,
      includeAssets: ['favicon.svg', 'icons/*.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/health\//],
        runtimeCaching: [
          {
            // Never let the SW intercept API calls — always hit the network.
            urlPattern: /^\/api\//,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  resolve: { alias: aliases },
  ssr: {
    noExternal: [
      '@cardwise/ui',
      '@cardwise/auth',
      '@cardwise/design-system',
      '@cardwise/ai-assistant-widget',
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('lottie')) return 'vendor-lottie';
          if (id.includes('@sentry')) return 'vendor-sentry';
          if (
            id.includes('react-dom') ||
            id.includes('react-router') ||
            id.includes('/react/')
          ) {
            return 'vendor-react';
          }
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('@radix-ui') || id.includes('radix-ui') || id.includes('sonner')) {
            return 'vendor-ui';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/assets/files': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
