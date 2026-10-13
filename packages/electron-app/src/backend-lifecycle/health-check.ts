/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {existsSync} from 'node:fs';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Single-shot check: does the backend at this port respond successfully right now? No retry. */
export async function probeHealthy(
  port: number,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const response = await fetchImpl(`http://localhost:${port}/health/live`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Polls for a file's existence at a fixed interval, indefinitely. Never
 * resolves false — the only way out is the awaited condition becoming
 * true, or the whole process exiting (e.g. via Quit).
 */
export async function waitUntilFileExists(
  path: string,
  intervalMs: number,
): Promise<void> {
  while (!existsSync(path)) {
    await sleep(intervalMs);
  }
}

/**
 * Polls the given health endpoint at a fixed interval, indefinitely, until
 * it responds successfully. Never resolves false.
 */
export async function waitUntilHealthy(
  port: number,
  endpoint: '/health/live' | '/health/ready',
  intervalMs: number,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  while (true) {
    try {
      const response = await fetchImpl(`http://localhost:${port}${endpoint}`);
      if (response.ok) {
        return;
      }
    } catch {
      // not yet reachable — keep polling
    }
    await sleep(intervalMs);
  }
}
