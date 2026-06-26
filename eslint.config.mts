// eslint.config.mts
// Career Assistant — ESLint Configuration

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import playwright from 'eslint-plugin-playwright';
import vitest from '@vitest/eslint-plugin';
import prettierConfig from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  // ─── Ignored paths ────────────────────────────────────────────────────────────

  {
    ignores: [
      'e2e/playwright-report/**',
      'e2e/test-results/**', // also generated, worth ignoring preemptively
    ],
  },

  // ─── Base JS recommended ──────────────────────────────────────────────────

  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,vue}'],
    plugins: { js },
    extends: ['js/recommended'],
  },

  // ─── TypeScript ───────────────────────────────────────────────────────────

  ...tseslint.configs.recommended,

  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  // ─── Node.js layer — lib/, scripts/, server/, tests/, db/ ────────────────

  {
    files: ['lib/**/*.ts', 'scripts/**/*.ts', 'server/**/*.ts', 'tests/**/*.ts', 'db/**/*.ts'],
    languageOptions: {
      globals: globals.node,
      sourceType: 'commonjs',
    },
  },

  // ─── Layer boundary rules ─────────────────────────────────────────────────
  //
  // Enforces the three-layer boundary (HTTP / orchestration / data).
  // Nothing lower in the stack may import from what's above it.
  // server/ and client/ must not bypass the orchestration layer (lib/)
  // and access lib/db/ directly.

  {
    // lib/db/ must not import from lib/ orchestration or server/
    files: ['lib/db/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../roles', '../deletes', '../updates', '../exporters*', '../parse*'],
              message: 'lib/db/ must not import from the orchestration layer (lib/).',
            },
            {
              group: ['../../server/*'],
              message: 'lib/db/ must not import from server/.',
            },
          ],
        },
      ],
    },
  },

  {
    // lib/ orchestration must not import from server/
    files: ['lib/**/*.ts'],
    ignores: ['lib/db/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../server/*', '../../server/*'],
              message: 'lib/ must not import from server/.',
            },
          ],
        },
      ],
    },
  },

  {
    // server/ and client/ must not bypass orchestration and import lib/db/ directly
    files: ['server/**/*.ts', 'client/**/*.ts', 'client/**/*.vue'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/lib/db/**', '../../lib/db/**', '../lib/db/**'],
              message:
                'Do not import from lib/db/ directly. Use the orchestration layer (lib/) instead.',
            },
          ],
        },
      ],
    },
  },

  // ─── No raw SQL outside lib/db/ ───────────────────────────────────────────
  //
  // Flags template literals containing SQL keywords in files outside lib/db/.
  // Exception: server/routes/query.ts is intentionally excluded

  {
    files: ['lib/**/*.ts', 'server/**/*.ts', 'client/**/*.ts', 'client/**/*.vue'],
    ignores: ['lib/db/**/*.ts', 'server/routes/query.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'TemplateLiteral:has(TemplateElement[value.raw=/\\b(SELECT|INSERT|UPDATE|DELETE|CREATE TABLE|DROP TABLE|ALTER TABLE|WHERE|JOIN)\\b/])',
          message: 'Raw SQL is not allowed outside lib/db/. Move SQL into a lib/db/ module.',
        },
        {
          selector:
            'Literal:not(Property > Literal)[value=/\\b(SELECT|INSERT|UPDATE|DELETE|CREATE TABLE|DROP TABLE|ALTER TABLE)\\b/]',
          message: 'Raw SQL is not allowed outside lib/db/. Move SQL into a lib/db/ module.',
        },
      ],
    },
  },

  // ─── Vue client ───────────────────────────────────────────────────────────

  ...pluginVue.configs['flat/essential'],

  {
    files: ['client/src/**/*.{ts,vue}'],
    languageOptions: {
      globals: globals.browser,
      sourceType: 'module',
      parserOptions: { parser: tseslint.parser },
    },
  },

  // ─── Vitest unit + integration tests ─────────────────────────────────────

  {
    files: ['tests/**/*.test.ts'],
    plugins: { vitest },
    rules: vitest.configs.recommended.rules,
  },

  // ─── Playwright E2E tests ─────────────────────────────────────────────────

  {
    files: ['e2e/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    languageOptions: {
      globals: globals.node,
      sourceType: 'module',
    },
    rules: {
      ...playwright.configs['flat/recommended'].rules,

      // test.step() descriptions must start with Arrange:, Act:, or Assert:
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'CallExpression[callee.property.name="step"] > Literal:first-child:not([value=/^(Arrange|Act|Assert):/])',
          message: 'test.step() descriptions must start with "Arrange:", "Act:", or "Assert:".',
        },
      ],
    },
  },

  // ─── Playwright page objects — locator quality ────────────────────────────

  {
    files: ['e2e/pages/**/*.ts'],
    rules: {
      'playwright/no-nth-methods': 'error',
    },
  },
  // ─── Prettier — disables ESLint formatting rules that would conflict ──────

  prettierConfig,
]);
