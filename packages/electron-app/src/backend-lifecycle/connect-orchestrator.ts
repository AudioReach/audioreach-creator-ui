/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  FailureReason,
  SplashPhase,
} from '@audioreach-creator-ui/api-utils';

import type {AppDataConfig} from './backend-config-reader';

export interface ConnectDeps {
  backendBinaryExists: (path: string) => boolean;
  createHiddenMainWindow: () => void;
  notifyFailed: (reason: FailureReason, message: string) => void;
  notifyStatus: (phase: SplashPhase, message: string) => void;
  probeHealthy: (port: number) => Promise<boolean>;
  readBackendPort: (configJsonPath: string) => number | null;
  resolveAppDataConfig: () => AppDataConfig | null;
  resolveArcBackendDir: () => string;
  resolveBackendMainPath: () => string;
  showMainWindowAndCloseSplash: () => void;
  spawnBackend: (arcBackendDir: string) => void;
  waitForConfigFile: (path: string, intervalMs: number) => Promise<void>;
  waitForRegistrationResult: () => Promise<boolean>;
  waitUntilLive: (port: number, intervalMs: number) => Promise<void>;
  waitUntilReady: (port: number, intervalMs: number) => Promise<void>;
}

/**
 * Runs the 8-step backend connect sequence: resolve app-data-config.json
 * → resolve arc-backend/main.js → check for an already-healthy backend
 * (skip spawn if found) → spawn if needed → wait for config.json → wait
 * for /health/live → wait for /health/ready → create hidden main window
 * → register → show. Every wait is indefinite (no timeout) — the only
 * way to stop is Quit, which exits the whole process. This is the only
 * entry point; there is no Retry.
 */
export async function runConnectSequence(deps: ConnectDeps): Promise<void> {
  const appDataConfig = deps.resolveAppDataConfig();
  if (!appDataConfig) {
    deps.notifyFailed(
      'app-data-config-missing',
      'Installation configuration file not found or invalid. Please reinstall the application.',
    );
    return;
  }

  const backendMainPath = deps.resolveBackendMainPath();
  if (!deps.backendBinaryExists(backendMainPath)) {
    deps.notifyFailed(
      'backend-binary-missing',
      `AudioReach Creator backend not found at ${backendMainPath}. Please reinstall the application.`,
    );
    return;
  }

  deps.notifyStatus('starting', 'Checking for running backend...');

  const configPath = appDataConfig.configJsonPath;
  const existingPort = deps.readBackendPort(configPath);

  let port: number;

  if (existingPort !== null && (await deps.probeHealthy(existingPort))) {
    port = existingPort;
  } else {
    deps.notifyStatus('starting', 'Starting AudioReach Creator backend...');
    try {
      deps.spawnBackend(deps.resolveArcBackendDir());
    } catch {
      deps.notifyFailed(
        'spawn-failed',
        'Failed to start the AudioReach Creator backend process.',
      );
      return;
    }

    deps.notifyStatus(
      'waiting-for-config',
      'Waiting for backend to initialize...',
    );
    await deps.waitForConfigFile(configPath, 3000);

    port = deps.readBackendPort(configPath) as number;

    deps.notifyStatus('waiting-for-live', 'Waiting for backend to start...');
    await deps.waitUntilLive(port, 3000);
  }

  deps.notifyStatus(
    'waiting-for-ready',
    'Waiting for backend to become ready...',
  );
  await deps.waitUntilReady(port, 5000);

  deps.createHiddenMainWindow();
  deps.notifyStatus('registering', 'Registering client...');
  const registered = await deps.waitForRegistrationResult();

  if (!registered) {
    deps.notifyFailed('registration-failed', 'Client registration failed.');
    return;
  }

  deps.showMainWindowAndCloseSplash();
}
