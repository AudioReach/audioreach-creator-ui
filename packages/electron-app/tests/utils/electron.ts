/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {_electron as electron} from "@playwright/test"
import path from "node:path"

// TODO: https://www.electronjs.org/docs/latest/tutorial/testing-on-headless-ci
export async function getTestApp() {
  try {
    const distDir = path.resolve(process.cwd(), "dist")
    const app = await electron.launch({
      args: [path.join(distDir, "main.cjs")],
      bypassCSP: true,
    })
    return app
  } catch (error) {
    console.error("Failed to launch Electron app:", error)
    throw error
  }
}
