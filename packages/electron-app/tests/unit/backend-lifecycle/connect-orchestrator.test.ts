/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {jest} from '@jest/globals';

import {
  type ConnectDeps,
  runConnectSequence,
} from '../../../src/backend-lifecycle/connect-orchestrator';

function makeDeps(overrides: Partial<ConnectDeps> = {}): ConnectDeps {
  return {
    backendBinaryExists: jest.fn().mockReturnValue(true),
    createHiddenMainWindow: jest.fn(),
    notifyFailed: jest.fn(),
    notifyStatus: jest.fn(),
    probeHealthy: jest.fn().mockResolvedValue(false),
    readBackendPort: jest.fn().mockReturnValue(3000),
    resolveAppDataConfig: jest
      .fn()
      .mockReturnValue({configJsonPath: '/app-data/config.json'}),
    resolveArcBackendDir: jest.fn().mockReturnValue('/install/arc-backend'),
    resolveBackendMainPath: jest
      .fn()
      .mockReturnValue('/install/arc-backend/main.js'),
    showMainWindowAndCloseSplash: jest.fn(),
    spawnBackend: jest.fn(),
    waitForConfigFile: jest.fn().mockResolvedValue(undefined),
    waitForRegistrationResult: jest.fn().mockResolvedValue(true),
    waitUntilLive: jest.fn().mockResolvedValue(undefined),
    waitUntilReady: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as ConnectDeps;
}

describe('runConnectSequence', () => {
  it('reports app-data-config-missing and stops when app-data-config.json cannot be resolved', async () => {
    const deps = makeDeps({
      resolveAppDataConfig: jest
        .fn()
        .mockReturnValue(null) as unknown as ConnectDeps['resolveAppDataConfig'],
    });

    await runConnectSequence(deps);

    expect(deps.notifyFailed).toHaveBeenCalledWith(
      'app-data-config-missing',
      expect.any(String),
    );
    expect(deps.backendBinaryExists).not.toHaveBeenCalled();
    expect(deps.spawnBackend).not.toHaveBeenCalled();
  });

  it('reports backend-binary-missing and stops when arc-backend/main.js does not exist', async () => {
    const deps = makeDeps({
      backendBinaryExists: jest
        .fn()
        .mockReturnValue(false) as unknown as ConnectDeps['backendBinaryExists'],
    });

    await runConnectSequence(deps);

    expect(deps.notifyFailed).toHaveBeenCalledWith(
      'backend-binary-missing',
      expect.any(String),
    );
    expect(deps.spawnBackend).not.toHaveBeenCalled();
  });

  it('skips spawning and proceeds to registration when a backend is already healthy', async () => {
    const deps = makeDeps({
      probeHealthy: jest
        .fn()
        .mockResolvedValue(true) as unknown as ConnectDeps['probeHealthy'],
    });

    await runConnectSequence(deps);

    expect(deps.spawnBackend).not.toHaveBeenCalled();
    expect(deps.waitForConfigFile).not.toHaveBeenCalled();
    expect(deps.waitUntilLive).not.toHaveBeenCalled();
    expect(deps.waitUntilReady).toHaveBeenCalledWith(3000, 5000);
    expect(deps.createHiddenMainWindow).toHaveBeenCalledTimes(1);
    expect(deps.showMainWindowAndCloseSplash).toHaveBeenCalledTimes(1);
  });

  it('does not probe health when no port can be read from an existing config.json', async () => {
    const deps = makeDeps({
      readBackendPort: jest
        .fn()
        .mockReturnValue(null) as unknown as ConnectDeps['readBackendPort'],
    });

    await runConnectSequence(deps);

    expect(deps.probeHealthy).not.toHaveBeenCalled();
    expect(deps.spawnBackend).toHaveBeenCalledWith('/install/arc-backend');
  });

  it('spawns the backend, waits for config/live/ready, and reports spawn-failed when spawn throws', async () => {
    const deps = makeDeps({
      spawnBackend: jest.fn(() => {
        throw new Error('EPERM');
      }) as unknown as ConnectDeps['spawnBackend'],
    });

    await runConnectSequence(deps);

    expect(deps.notifyFailed).toHaveBeenCalledWith(
      'spawn-failed',
      expect.any(String),
    );
    expect(deps.waitForConfigFile).not.toHaveBeenCalled();
    expect(deps.createHiddenMainWindow).not.toHaveBeenCalled();
  });

  it('spawns the backend and waits for config.json, live, then ready before registering', async () => {
    const deps = makeDeps();

    await runConnectSequence(deps);

    expect(deps.spawnBackend).toHaveBeenCalledWith('/install/arc-backend');
    expect(deps.waitForConfigFile).toHaveBeenCalledWith(
      '/app-data/config.json',
      3000,
    );
    expect(deps.waitUntilLive).toHaveBeenCalledWith(3000, 3000);
    expect(deps.waitUntilReady).toHaveBeenCalledWith(3000, 5000);
    expect(deps.createHiddenMainWindow).toHaveBeenCalledTimes(1);
    expect(deps.showMainWindowAndCloseSplash).toHaveBeenCalledTimes(1);
    expect(deps.notifyFailed).not.toHaveBeenCalled();
  });

  it('reports registration-failed when the backend is ready but registration fails', async () => {
    const deps = makeDeps({
      waitForRegistrationResult: jest
        .fn()
        .mockResolvedValue(
          false,
        ) as unknown as ConnectDeps['waitForRegistrationResult'],
    });

    await runConnectSequence(deps);

    expect(deps.createHiddenMainWindow).toHaveBeenCalledTimes(1);
    expect(deps.notifyFailed).toHaveBeenCalledWith(
      'registration-failed',
      expect.any(String),
    );
    expect(deps.showMainWindowAndCloseSplash).not.toHaveBeenCalled();
  });

  it('notifies the starting phase before checking for an existing backend', async () => {
    const deps = makeDeps();

    await runConnectSequence(deps);

    expect(deps.notifyStatus).toHaveBeenCalledWith(
      'starting',
      expect.any(String),
    );
  });
});
