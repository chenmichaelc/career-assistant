// vitest.config.ts

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          environment: 'node',
          exclude: ['**/node_modules/**', '**/e2e/tests/*.spec.ts', 'client/**'],
        },
      },
      'client/vitest.config.ts',
    ],
  },
});
