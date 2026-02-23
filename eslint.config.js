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
    extends: [
      quiEslintTs.configs.base,
      quiEslintTs.configs.sortKeys,
      quiEslintTs.configs.styleGuide,
    ],
    // recommendation: scope these to your source files in your package(s).
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
  },
  // TS
  {
    extends: [
      ...quiEslintTs.configs.recommended,
      quiEslintTs.configs.performance,
      quiEslintTs.configs.strictExports,
    ],
    // recommendation: scope these to your source files in your package(s).
    files: ['**/*.ts'],
    languageOptions: tsLanguageOptions,
  },
  // React
  {
    extends: [
      ...quiEslintTs.configs.recommended,
      quiEslintTs.configs.performance,
      quiEslintReact.configs.base,
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
  // FSD (Feature-Sliced Design) Architecture Rules
  // ...makeFsdConfig("packages/react-app/src"),
]);

export default eslintConfig;
