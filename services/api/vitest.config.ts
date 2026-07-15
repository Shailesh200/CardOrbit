import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    environment: 'node',
    // Shared Postgres — avoid unique-key races across files
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: [
        'src/modules/assistant/**/*.service.ts',
        'src/modules/rag/**/*.service.ts',
        'src/modules/search/semantic-search.service.ts',
      ],
      exclude: ['**/__tests__/**'],
      thresholds: {
        lines: 85,
        functions: 85,
        statements: 85,
        branches: 58,
      },
    },
  },
});
