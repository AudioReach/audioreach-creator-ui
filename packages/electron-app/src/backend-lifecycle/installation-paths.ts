/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {app} from 'electron';
import {dirname, join, resolve} from 'node:path';

/**
 * Resolves <installation folder>, the parent of the directory containing
 * arc-ui's own executable. In dev mode (unpackaged), __dirname at runtime
 * is packages/electron-app/dist, so three levels up reaches the
 * audioreach-creator-ui checkout root and a fourth reaches its parent —
 * where arc-backend/ and app-data-config.json are placed as siblings of
 * the checkout for local testing.
 */
export function resolveInstallationFolder(): string {
  if (app.isPackaged) {
    return resolve(dirname(app.getPath('exe')), '..');
  }
  return resolve(__dirname, '../../../..');
}

export function resolveArcBackendDir(): string {
  return resolve(resolveInstallationFolder(), 'arc-backend');
}

export function resolveArcBackendMainPath(): string {
  return join(resolveArcBackendDir(), 'main.js');
}

export function resolveAppDataConfigPath(): string {
  return join(resolveInstallationFolder(), 'app-data-config.json');
}
