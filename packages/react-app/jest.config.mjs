/** @type {import('jest').Config} */
export default {
  // Clear mocks between tests
  clearMocks: true,
  // Coverage configuration
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/main.tsx",
    "!src/vite-env.d.ts",
    "!src/**/*.stories.{ts,tsx}",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/*.spec.{ts,tsx}",
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Handle ES modules
  extensionsToTreatAsEsm: [".ts", ".tsx"],

  // Module file extensions
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],

  // Module name mapping for path aliases
  moduleNameMapper: {
    // Handle CSS and other assets
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "jest-transform-stub",
    "^~assets/(.*)$": "<rootDir>/src/assets/$1",
    "^~data/(.*)$": "<rootDir>/src/data/$1",
    "^~entities/(.*)$": "<rootDir>/src/entities/$1",
    "^~features/(.*)$": "<rootDir>/src/features/$1",
    "^~pages/(.*)$": "<rootDir>/src/pages/$1",
    "^~shared/(.*)$": "<rootDir>/src/shared/$1",
    "^~widgets/(.*)$": "<rootDir>/src/widgets/$1",
  },

  preset: "ts-jest/presets/default-esm",

  // Root directory for tests
  rootDir: ".",

  // Setup files
  setupFilesAfterEnv: ["<rootDir>/src/test-setup.ts"],

  testEnvironment: "jsdom",

  // Test environment options
  testEnvironmentOptions: {
    customExportConditions: ["node", "node-addons"],
  },

  // Test file patterns
  testMatch: [
    "<rootDir>/tests/**/*.test.{ts,tsx}",
    "<rootDir>/src/**/*.test.{ts,tsx}",
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/dist/",
    "<rootDir>/build/",
  ],

  // Transform configuration
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          jsx: "react-jsx",
          module: "esnext",
        },
        useESM: true,
      },
    ],
  },

  // Verbose output
  verbose: true,
}
