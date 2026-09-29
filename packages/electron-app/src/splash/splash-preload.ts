/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  FailureReason,
  SplashApi,
  SplashPhase,
} from '@audioreach-creator-ui/api-utils';
import {contextBridge, ipcRenderer} from 'electron';

const splashApi: SplashApi = {
  onFailed: (callback: (reason: FailureReason, message: string) => void) => {
    const listener = (
      _event: unknown,
      reason: FailureReason,
      message: string,
    ) => callback(reason, message);
    ipcRenderer.on('connect:failed', listener);
    return () => ipcRenderer.removeListener('connect:failed', listener);
  },
  onStatus: (callback: (phase: SplashPhase, message: string) => void) => {
    const listener = (_event: unknown, phase: SplashPhase, message: string) =>
      callback(phase, message);
    ipcRenderer.on('connect:status', listener);
    return () => ipcRenderer.removeListener('connect:status', listener);
  },
  quit: () => ipcRenderer.invoke('connect:quit') as Promise<void>,
};

contextBridge.exposeInMainWorld('splashApi', splashApi);
