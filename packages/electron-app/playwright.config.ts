import type {PlaywrightTestConfig} from "@playwright/test"

const isCI = !!process.env.IS_CI

const config: PlaywrightTestConfig = {
  expect: {timeout: isCI ? 10000 : 5000},
  maxFailures: 2,
  // Output directory for screenshots, videos, traces
  outputDir: "test-results/artifacts",
  // Multiple reporters for CI/CD integration
  reporter: [
    ["list"], // Console output (existing)
    ["junit", {outputFile: "test-results/junit.xml"}], // For Jenkins integration
    [
      "html",
      {
        open: "never",
        outputFolder: "test-results/html",
      },
    ], // Visual HTML reports
    ["json", {outputFile: "test-results/results.json"}], // Machine-readable results
  ],
  retries: isCI ? 1 : 0,
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  timeout: isCI ? 30000 : 15000,
  // Capture artifacts on failure for debugging
  use: {
    screenshot: "only-on-failure", // Screenshots when tests fail
    trace: "retain-on-failure", // Detailed traces when tests fail
  },
  workers: isCI ? 1 : undefined,
}

export default config
