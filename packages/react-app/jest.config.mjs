/** @type {import('jest').Config} */
export default {
  // Clear mocks between tests
  clearMocks: true,
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 10,
      statements: 10,
    },
  },

  // Handle ES modules
  extensionsToTreatAsEsm: ['.ts', '.tsx'],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Module name mapping for path aliases
  moduleNameMapper: {
    // Handle CSS and other assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      'jest-transform-stub',
    // flexlayout-react only exports via 'import' condition; map directly to dist for Jest
    '^flexlayout-react$':
      '<rootDir>/node_modules/flexlayout-react/dist/index.js',
    '^~assets/(.*)$': '<rootDir>/src/assets/$1',
    '^~data/(.*)$': '<rootDir>/src/data/$1',
    '^~entities/(.*)$': '<rootDir>/src/entities/$1',
    '^~features/(.*)$': '<rootDir>/src/features/$1',
    '^~pages/(.*)$': '<rootDir>/src/pages/$1',
    '^~shared/(.*)$': '<rootDir>/src/shared/$1',
    '^~widgets/(.*)$': '<rootDir>/src/widgets/$1',
  },

  preset: 'ts-jest/presets/default-esm',

  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        ancestorSeparator: ' › ',
        classNameTemplate: 'react-app.{classname}',
        outputDirectory: 'test-results',
        outputName: 'junit.xml',
        titleTemplate: '{title}',
        usePathForSuiteName: true,
      },
    ],
  ],

  // Root directory for tests
  rootDir: '.',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],

  testEnvironment: 'jsdom',

  // Test environment options
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },

  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.{ts,tsx}',
    '<rootDir>/src/**/*.test.{ts,tsx}',
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
  ],
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx|js)$': [
      'ts-jest',
      {
        tsconfig: {
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          jsx: 'react-jsx',
          module: 'esnext',
        },
        useESM: true,
      },
    ],
  },

  // Several dependencies ship pure ESM that Jest's runtime cannot execute
  // directly; allow ts-jest to transform them to CommonJS. pnpm nests real
  // packages under node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>, so the
  // first path segment after node_modules is `.pnpm`, not the package scope —
  // a naive `(?!@scope)` lookahead never matches. The two entries below cover
  // both the .pnpm store path and any hoisted top-level path. The
  // `@qualcomm-ui` match covers the whole scope, including qui's own
  // transitive sub-packages (qds-core, react-core, utils, core).
  transformIgnorePatterns: [
    '/node_modules/\\.pnpm/(?!(.*(@qualcomm-ui|flexlayout-react)))',
    '/node_modules/(?!\\.pnpm)(?!(@qualcomm-ui|flexlayout-react)/)',
  ],

  // Verbose output
  verbose: true,
};
