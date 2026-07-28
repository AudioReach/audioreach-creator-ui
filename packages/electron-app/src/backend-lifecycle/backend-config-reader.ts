/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {readFileSync} from 'node:fs';
import {join} from 'node:path';

export interface AppDataConfig {
  /** Absolute path to <appData>/config.json */
  configJsonPath: string;
}

/**
 * Reads and parses app-data-config.json. Returns null on any failure:
 * missing file, invalid JSON, or a missing/empty "app-data" key.
 */
export function readAppDataConfig(path: string): AppDataConfig | null {
  try {
    const raw = readFileSync(path, 'utf-8');
    const parsed = JSON.parse(raw) as {'app-data'?: string};
    if (!parsed['app-data']) {
      return null;
    }
    return {configJsonPath: join(parsed['app-data'], 'config.json')};
  } catch {
    return null;
  }
}

/**
 * Reads ARC_PORT from the backend's config.json. Returns null if the file
 * is missing, unparseable, or ARC_PORT is not a valid port number — this
 * is treated as "not yet written" (an expected, transient state during
 * startup), not an error.
 */
export function readBackendPort(configJsonPath: string): number | null {
  try {
    const raw = readFileSync(configJsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as {ARC_PORT?: string};
    const port = Number(parsed.ARC_PORT);
    return Number.isInteger(port) && port > 0 && port <= 65535
      ? port
      : null;
  } catch {
    return null;
  }
}
