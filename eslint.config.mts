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

  // ─── No console in codebase outside of Vue/ ───────────────────────────────
  // Prevent accidental

  {
    files: ['lib/**/*.ts', 'server/**/*.ts', 'db/**/*.ts', 'tests/**/*.ts', 'e2e/**/*.ts'],
    rules: {
      'no-console': 'warn',
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

  // ─── DISABLED: no cast immediately adjacent to .includes() ────────────────
  //
  // Intended to ban `X.includes(value as T)` — see semantic-testing-rules.md,
  // "Cast-based type narrowing is a defect". Written but not verified to
  // actually fire: a manual test (a file containing both a `.includes(x as
  // string)` cast and a raw SQL template literal, placed under lib/) reported
  // zero errors for either rule instead of the expected two, suggesting
  // something in the rule/file-matching is wrong — root cause not yet found.
  // Disabled here rather than shipped unverified. Tracked in CAR-207.
  //
  // Also note: if this is ever enabled by combining it with the "No raw SQL"
  // block above (same or overlapping `files`), be aware ESLint flat config
  // overrides a rule name per matching file rather than merging arrays across
  // separate config objects that both match the same file — a naive second
  // block reusing this block's `files` array would silently replace the SQL
  // rule's entries instead of adding to them. Keep the two rules' effective
  // file sets disjoint (matching `ignores`), or combine into one array in one
  // block, not two blocks with colliding `files`.
  //
  // {
  //   files: ['lib/**/*.ts', 'server/**/*.ts', 'client/**/*.ts', 'client/**/*.vue'],
  //   ignores: ['lib/db/**/*.ts', 'server/routes/query.ts'],
  //   rules: {
  //     'no-restricted-syntax': [
  //       'error',
  //       {
  //         selector: 'CallExpression[callee.property.name="includes"] > TSAsExpression',
  //         message:
  //           'Do not cast a value being checked with .includes() against a literal-typed array. Use a Set<string> + a named type guard function instead.',
  //       },
  //     ],
  //   },
  // },
  //
  // {
  //   files: ['lib/db/**/*.ts', 'server/routes/query.ts'],
  //   rules: {
  //     'no-restricted-syntax': [
  //       'error',
  //       {
  //         selector: 'CallExpression[callee.property.name="includes"] > TSAsExpression',
  //         message:
  //           'Do not cast a value being checked with .includes() against a literal-typed array. Use a Set<string> + a named type guard function instead.',
  //       },
  //     ],
  //   },
  // },

  // ─── Vue client ───────────────────────────────────────────────────────────

  ...pluginVue.configs['flat/essential'],

  {
    files: ['client/src/**/*.{ts,vue}', 'client/tests/**/*.ts'],
    languageOptions: {
      globals: globals.browser,
      sourceType: 'module',
      parserOptions: { parser: tseslint.parser },
    },
  },

  // ─── Ban window.confirm in client ─────────────────────────────────────────
  //
  // useConfirmModal is the established pattern for confirmation dialogs.
  // window.confirm bypasses it and is not testable with Playwright.

  {
    files: ['client/src/**/*.{ts,vue}'],
    rules: {
      'vue/no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.object.name="window"][callee.property.name="confirm"]',
          message:
            'Use useConfirmModal instead of window.confirm. window.confirm is not testable with Playwright.',
        },
      ],
    },
  },

  // ─── Vitest unit + integration tests ─────────────────────────────────────

  {
    files: ['tests/**/*.test.ts', 'client/tests/**/*.test.ts'],
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

  // ─── Playwright fixtures — [E2E] prefix enforcement ───────────────────────
  //
  // All company name strings in E2E fixtures must start with [E2E] so that
  // test-generated roles are visually identifiable in the live database and
  // are picked up by the admin cleanup endpoint.

  {
    files: ['e2e/fixtures/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Property[key.name="company"] > Literal:not([value=/^\\[E2E\\]/])',
          message:
            'E2E fixture company names must start with "[E2E]" to identify test data in the live database.',
        },
      ],
    },
  },

  // ─── Playwright page objects — locator quality ────────────────────────────

  {
    files: ['e2e/pages/**/*.ts'],
    rules: {
      'playwright/no-nth-methods': 'error',

      // Class properties in page objects must be declared readonly.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ClassBody > PropertyDefinition:not([readonly=true]):not([static=true])',
          message:
            'Page object class properties must be declared readonly. Use "readonly" on all property declarations.',
        },
      ],
    },
  },
  // ─── Prettier — disables ESLint formatting rules that would conflict ──────

  prettierConfig,
]);
