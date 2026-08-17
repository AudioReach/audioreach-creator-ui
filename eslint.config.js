import {defineConfig} from 'eslint/config';
import * as tseslint from 'typescript-eslint';

import quiEslintMdx from '@qualcomm-ui/eslint-config-mdx';
import quiEslintReact from '@qualcomm-ui/eslint-config-react';
import quiEslintTs from '@qualcomm-ui/eslint-config-typescript';
import quiEslintPluginReact from '@qualcomm-ui/eslint-plugin-react';

const tsLanguageOptions = {
  parser: tseslint.parser,
  parserOptions: {
    projectService: true,
  },
};

const eslintConfig = defineConfig([
  {
    ignores: [
      '**/dist/',
      '**/node_modules/',
      '**/build/',
      '**/coverage/',
      '**/.turbo/',
      '**/out/',
      '**/out-tsc/',
      '**/temp/',
      '**/.react-router/',
      '/eslint-rules/**',
    ],
  },
  // JS
  {
    extends: [quiEslintTs.configs.sortKeys, quiEslintTs.configs.styleGuide],
    // recommendation: scope these to your source files in your package(s).
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
  },
  // TS
  {
    extends: [quiEslintTs.configs.recommended, quiEslintTs.configs.strictExports],
    // recommendation: scope these to your source files in your package(s).
    files: ['**/*.ts'],
    languageOptions: tsLanguageOptions,
  },
  // React
  {
    extends: [
      quiEslintTs.configs.recommended,
      quiEslintReact.configs.recommended,
      // optional: include the plugin as well
      quiEslintPluginReact.config,
    ],
    // recommendation: scope these to your source files in your package(s).
    files: ['packages/react-app/**/*.{ts,tsx}'],
    languageOptions: tsLanguageOptions,
    rules: {
      'react/prop-types': 'off', // TypeScript provides type checking
    },
    // eslint-plugin-react's version auto-detection calls the removed
    // context.getFilename() API on ESLint 10 and crashes; setting an
    // explicit version skips that code path entirely.
    settings: {
      react: {
        version: '19',
      },
    },
  },
  // ------------------------------------------------------------
  // Config/tooling files: lint them, but WITHOUT type-aware rules.
  // They are not worth the cost of TS project analysis, and some
  // type-aware rules (e.g. @typescript-eslint/await-thenable) will
  // throw if type info isn't available.
  // ------------------------------------------------------------
  {
    files: ['**/*.config.{ts,js,mjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: false,
      },
    },
  },
  // Markdown
  {
    extends: [quiEslintMdx.configs.recommended],
    files: ['**/*.{md,mdx}', '*.md'],
  },
  // Test files: jest.mock() factories are hoisted above imports, so they
  // must use require() to reference other modules — not a code smell.
  // Callbacks passed to act()/mocked async APIs are also often declared
  // async to match a real async contract even when the body has no await.
  {
    files: ['packages/react-app/tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/require-await': 'off',
    },
  },
  // The QUI TypeScript styleGuide config enables oxfmt as a formatter-style
  // lint rule, but this project already formats with Prettier
  // (prettier.config.js: singleQuote, bracketSpacing: false), which
  // disagrees with oxfmt's defaults on quote style and brace spacing.
  // Running both would fight forever, so oxfmt stays off and Prettier
  // remains the single source of truth for formatting.
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,tsx}'],
    rules: {
      'oxfmt/oxfmt': 'off',
    },
  },
  // FSD (Feature-Sliced Design) Architecture Rules
  // ...makeFsdConfig("packages/react-app/src"),
]);

export default eslintConfig;
