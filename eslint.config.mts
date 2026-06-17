// eslint.config.mts
// Career Assistant — ESLint Configuration

import js         from '@eslint/js';
import globals    from 'globals';
import tseslint   from 'typescript-eslint';
import pluginVue  from 'eslint-plugin-vue';
import playwright from 'eslint-plugin-playwright';
import vitest     from '@vitest/eslint-plugin';
import { defineConfig } from 'eslint/config';

export default defineConfig([

  // ─── Ignored paths ────────────────────────────────────────────────────────────

  {
    ignores: [
      'e2e/playwright-report/**',
      'e2e/test-results/**',       // also generated, worth ignoring preemptively
    ],
  },

  // ─── Base JS recommended ──────────────────────────────────────────────────

  {
    files:   ['**/*.{js,mjs,cjs,ts,mts,cts,vue}'],
    plugins: { js },
    extends: ['js/recommended'],
  },

  // ─── TypeScript ───────────────────────────────────────────────────────────

  ...tseslint.configs.recommended,

  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        varsIgnorePattern:         '^_',
        argsIgnorePattern:         '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },

  // ─── Node.js layer — lib/, scripts/, server/, tests/, db/ ────────────────

  {
    files: [
      'lib/**/*.ts',
      'scripts/**/*.ts',
      'server/**/*.ts',
      'tests/**/*.ts',
      'db/**/*.ts',
    ],
    languageOptions: {
      globals:    globals.node,
      sourceType: 'commonjs',
    },
  },

  // ─── Vue client ───────────────────────────────────────────────────────────

  ...pluginVue.configs['flat/essential'],

  {
    files: ['client/src/**/*.{ts,vue}'],
    languageOptions: {
      globals:       globals.browser,
      sourceType:    'module',
      parserOptions: { parser: tseslint.parser },
    },
  },

  // ─── Vitest unit + integration tests ─────────────────────────────────────

  {
    files:   ['tests/**/*.test.ts'],
    plugins: { vitest },
    rules:   vitest.configs.recommended.rules,
  },

  // ─── Playwright E2E tests ─────────────────────────────────────────────────

  {
    files: ['e2e/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    languageOptions: {
      globals:    globals.node,
      sourceType: 'module',
    },
  },

]);