/** @type {import('jest').Config} */
export default {
  clearMocks: true,
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  preset: 'ts-jest/presets/default-esm',
  reporters: [
    'default',
    [
      'jest-junit',
      {
        ancestorSeparator: ' › ',
        classNameTemplate: 'electron-app.{classname}',
        outputDirectory: 'test-results',
        outputName: 'unit-junit.xml',
        titleTemplate: '{title}',
        usePathForSuiteName: true,
      },
    ],
  ],
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/out/',
  ],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          module: 'esnext',
          moduleResolution: 'bundler',
        },
        useESM: true,
      },
    ],
  },
  verbose: true,
};
