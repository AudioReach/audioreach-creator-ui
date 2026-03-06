/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import nodePlugin from 'eslint-plugin-n';
import securityPlugin from 'eslint-plugin-security';
import sonarjsPlugin from 'eslint-plugin-sonarjs';
import unicornPlugin from 'eslint-plugin-unicorn';
import promisePlugin from 'eslint-plugin-promise';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.tsbuildinfo',
      '**/coverage/**',
      '**/.yarn/**',
      '**/build/**',
      '**/out/**',
      '**/out-tsc/**',
      '**/temp/**',
      '**/.turbo/**',
      '**/.react-router/**',
      'eslint.config.js',
      // Config files that cause parsing errors
      '**/jest.config.mjs',
      '**/postcss.config.js',
      '**/tailwind.config.js',
    ],
  },
  // Base configurations
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  // Override problematic rules from base configs
  {
    rules: {
      '@/preserve-caught-error': 'off',
    },
  },

  // Configuration files - disable type-checked rules EARLY
  {
    files: [
      '**/*.config.{js,ts,mjs}',
      '**/*.conf.{js,ts}',
      '**/vite.config.ts',
      '**/playwright.config.ts',
      '**/electron-builder.config.ts',
      '**/tailwind.config.js',
      '**/postcss.config.js',
      '**/jest.config.{js,mjs,ts}',
    ],
    ...tseslint.configs.disableTypeChecked,
  },

  // Plugin recommended configurations
  importPlugin.flatConfigs.recommended,
  nodePlugin.configs['flat/recommended'],
  securityPlugin.configs.recommended,
  sonarjsPlugin.configs.recommended,
  unicornPlugin.configs['recommended'],
  promisePlugin.configs['flat/recommended'],

  // GRADUAL MIGRATION: Override all plugin errors to warnings
  {
    rules: {
      // Downgrade base ESLint errors to warnings
      'no-case-declarations': 'warn',

      // Downgrade all unicorn errors to warnings
      'unicorn/import-style': 'warn',
      'unicorn/prefer-native-coercion-functions': 'warn',
      'unicorn/prefer-array-some': 'warn',
      'unicorn/no-for-loop': 'warn',
      'unicorn/prefer-module': 'warn',
      'unicorn/prefer-top-level-await': 'warn',
      'unicorn/consistent-function-scoping': 'warn',
      'unicorn/text-encoding-identifier-case': 'warn',
      'unicorn/numeric-separators-style': [
        'warn',
        {
          hexadecimal: {
            onlyIfContainsSeparator: true,
          },
        },
      ],
      'unicorn/filename-case': 'warn',
      'unicorn/prefer-global-this': 'warn',
      'unicorn/no-static-only-class': 'warn',
      'unicorn/prefer-string-replace-all': 'warn',
      'unicorn/prefer-logical-operator-over-ternary': 'warn',
      'unicorn/explicit-length-check': 'warn',
      'unicorn/no-array-sort': 'warn',
      'unicorn/consistent-existence-index-check': 'warn',
      'unicorn/no-immediate-mutation': 'warn',
      'unicorn/prefer-single-call': 'warn',
      'unicorn/catch-error-name': 'warn',
      'unicorn/prefer-optional-catch-binding': 'warn',
      'unicorn/prefer-export-from': 'warn',
      'unicorn/require-module-specifiers': 'warn',
      'unicorn/prefer-number-properties': 'warn',
      'unicorn/no-useless-fallback-in-spread': 'warn',

      // Downgrade sonarjs errors to warnings
      'sonarjs/no-os-command-from-path': 'warn',
      'sonarjs/no-nested-functions': 'warn',
      'sonarjs/no-ignored-exceptions': 'warn',
      'sonarjs/no-invariant-returns': 'warn',
      'sonarjs/different-types-comparison': 'warn',
      'sonarjs/no-nested-conditional': 'warn',
      'sonarjs/prefer-read-only-props': 'warn',
      'sonarjs/no-duplicated-branches': 'warn',
      'sonarjs/no-unused-vars': 'warn',
      'sonarjs/no-alphabetical-sort': 'warn',
      'sonarjs/use-type-alias': 'warn',
      'sonarjs/no-all-duplicated-branches': 'warn',
      'sonarjs/no-selector-parameter': 'warn',
      'sonarjs/prefer-single-boolean-return': 'off', // Disabled: Can reduce code readability
      'sonarjs/function-return-type': 'off', // Disabled: TypeScript provides type inference

      // Downgrade node plugin errors to warnings
      'n/no-unsupported-features/node-builtins': 'warn',

      // Downgrade import errors to warnings
      'import/export': 'warn',

      // Downgrade TypeScript errors to warnings
      '@typescript-eslint/unbound-method': 'warn',
    },
  },

  // Main configuration for all packages
  {
    files: ['**/*.{js,ts,mjs,cjs,tsx,jsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: [
            './tsconfig.json',
            './packages/*/tsconfig.json',
            './packages/*/tsconfig.lib.json',
            './packages/*/tsconfig.node.json',
          ],
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        },
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
    },
    rules: {
      // GRADUAL MIGRATION: All strict rules set to "warn" initially
      // These will be changed to "error" one category at a time after fixing

      // TypeScript strict rules - START AS WARNINGS
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'warn',

      // Security rules - START AS WARNINGS
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',

      // SonarJS rules - START AS WARNINGS
      'sonarjs/cognitive-complexity': 'warn',
      'sonarjs/no-duplicate-string': 'warn',
      'sonarjs/todo-tag': 'warn',

      // Unicorn rules - START AS WARNINGS
      'unicorn/prevent-abbreviations': 'warn',
      'unicorn/no-null': 'warn',
      'unicorn/prefer-node-protocol': 'warn',
      'unicorn/no-array-for-each': 'warn',
      'unicorn/prefer-ternary': 'warn',
      'unicorn/prefer-type-error': 'warn',
      'unicorn/switch-case-braces': 'warn',

      // Import rules - START AS WARNINGS
      'import/no-unresolved': 'warn',
      'import/no-cycle': 'warn',

      // Promise rules - START AS WARNINGS
      'promise/always-return': 'warn',
      'promise/catch-or-return': 'warn',

      // Keep these disabled permanently
      'n/no-missing-import': 'off', // TypeScript handles this
      'security/detect-object-injection': 'off', // Too many false positives
      '@/preserve-caught-error': 'off', // Rule not available in current ESLint version

      // Configure unused vars to ignore parameters/variables prefixed with underscore
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },

  // React-specific configuration (react-app package only)
  {
    files: ['packages/react-app/**/*.{ts,tsx,jsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // React recommended rules
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,

      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // JSX Accessibility rules - START AS WARNINGS
      ...jsxA11yPlugin.configs.recommended.rules,

      // React-specific overrides
      'react/prop-types': 'off', // TypeScript provides type checking
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+
      'import/no-default-export': 'off', // React components often use default exports

      // Apply same gradual migration warnings for React files
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      'sonarjs/cognitive-complexity': 'warn',
      'unicorn/prevent-abbreviations': 'warn',
      'unicorn/no-null': 'warn',

      // Downgrade jsx-a11y errors to warnings (React-specific)
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'warn',
      'jsx-a11y/interactive-supports-focus': 'warn',
      'jsx-a11y/no-redundant-roles': 'warn',
    },
  },

  // Test files configuration - relaxed rules
  {
    files: [
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/test/**/*.ts',
      '**/tests/**/*.ts',
      '**/test-setup.ts',
    ],
    rules: {
      // TypeScript strict rules - relaxed for testing
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/require-await': 'off',

      // SonarJS rules - relaxed for testing
      'sonarjs/no-duplicate-string': 'off',
      'sonarjs/cognitive-complexity': 'off',
      'sonarjs/no-useless-catch': 'off',

      // Unicorn rules - relaxed for testing
      'unicorn/no-array-for-each': 'off',
      'unicorn/no-null': 'off',
      'unicorn/prevent-abbreviations': 'off',

      // Security and other rules
      'security/detect-object-injection': 'off',
      'no-console': 'off',
      'no-useless-catch': 'off',
    },
  },

  // Configuration files - additional rules
  {
    files: [
      '**/*.config.{js,ts,mjs}',
      '**/*.conf.{js,ts}',
      '**/vite.config.ts',
      '**/playwright.config.ts',
      '**/electron-builder.config.ts',
      '**/tailwind.config.js',
      '**/postcss.config.js',
      '**/jest.config.{js,mjs,ts}',
    ],
    rules: {
      'import/no-default-export': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      'unicorn/prefer-module': 'off',
      'n/no-unpublished-import': 'off',
      // Downgrade unicorn rules to warnings for config files
      'unicorn/import-style': 'warn',
      'unicorn/prevent-abbreviations': 'warn',
      'unicorn/prefer-node-protocol': 'warn',
    },
  },

  // Main entry files
  {
    files: ['**/main.ts', '**/main.tsx', '**/index.ts'],
    rules: {
      'unicorn/no-process-exit': 'off',
      'n/no-process-exit': 'off',
    },
  },

  // TypeScript-specific rules
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Disabled: Node plugin doesn't understand TypeScript imports
      'n/no-missing-import': 'off',
    },
  },

  // Prettier integration - must be last
  prettierConfig,
];
