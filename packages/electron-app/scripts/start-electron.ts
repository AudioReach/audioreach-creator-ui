/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type ChildProcess, spawn} from "node:child_process"

let electronProcess: ChildProcess | null = null

export async function startElectron(mainDir: string): Promise<void> {
  try {
    // Kill existing process if it exists
    if (electronProcess) {
      console.log("[build.ts] stopping existing electron process")
      electronProcess.kill("SIGTERM")

      // Wait a moment for graceful shutdown
      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (electronProcess && !electronProcess.killed) {
        electronProcess.kill("SIGKILL")
      }
      electronProcess = null
    }

    // Start new electron process
    console.log("[build.ts] starting electron app")
    electronProcess = spawn("pnpm", ["electron", "./dist/main.cjs"], {
      cwd: mainDir,
      shell: process.platform === "win32",
      stdio: "inherit",
    })

    electronProcess.on("error", (error) => {
      console.error("[build.ts] electron process error:", error.message)
      electronProcess = null
    })

    electronProcess.on("exit", (code, signal) => {
      if (code !== null && code !== 0) {
        console.log(`[build.ts] electron exited with code ${code}`)
      } else if (signal) {
        console.log(`[build.ts] electron killed by signal ${signal}`)
      }
      electronProcess = null
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[build.ts] failed to start electron:", {errorMessage})
    electronProcess = null
  }
}

export function setupProcessCleanup(): void {
  const cleanup = () => {
    if (electronProcess) {
      console.log("[build.ts] cleaning up electron process")
      electronProcess.kill("SIGTERM")
    }
  }

  process.on("SIGINT", cleanup)
  process.on("SIGTERM", cleanup)
  process.on("exit", cleanup)
}
