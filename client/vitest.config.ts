// client/vitest.config.ts

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    name: 'client',
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
