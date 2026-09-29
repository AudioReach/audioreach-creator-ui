/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {spawn} from 'node:child_process';
import {join} from 'node:path';

export interface BackendSpawnOptions {
  args: string[];
  command: string;
  options: {
    cwd: string;
    detached: boolean;
    env: Record<string, string | undefined>;
    stdio: 'ignore';
  };
}

/**
 * Builds the arguments to launch the backend using Electron's own bundled
 * Node runtime (via ELECTRON_RUN_AS_NODE), detached from the client's
 * process tree so it outlives the client regardless of how it later exits.
 * No PORT env var — the backend chooses its own port and writes it to
 * config.json.
 */
export function buildBackendSpawnOptions(
  arcBackendDir: string,
  execPath: string = process.execPath,
): BackendSpawnOptions {
  return {
    args: [join(arcBackendDir, 'main.js')],
    command: execPath,
    options: {
      cwd: arcBackendDir,
      detached: true,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        PROCESS_TITLE: 'ARC Backend',
      },
      stdio: 'ignore',
    },
  };
}

/**
 * Spawns the backend as an independent, detached process. No reference to
 * the child is retained after this call — the client never signals or
 * kills it (INV2).
 */
export function spawnBackendProcess(arcBackendDir: string): void {
  const {args, command, options} = buildBackendSpawnOptions(arcBackendDir);
  const child = spawn(command, args, options);
  child.unref();
}
