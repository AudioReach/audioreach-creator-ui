import type {PlaywrightTestConfig} from "@playwright/test"

const config: PlaywrightTestConfig = {
  maxFailures: 2,
  reporter: "list",
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  timeout: 10000,
}

export default config
