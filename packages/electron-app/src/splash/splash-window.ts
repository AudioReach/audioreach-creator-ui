/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  FailureReason,
  SplashPhase,
} from '@audioreach-creator-ui/api-utils';
import {BrowserWindow} from 'electron';
import {resolve} from 'node:path';

let splashWindow: BrowserWindow | null = null;

export async function createSplashWindow(): Promise<BrowserWindow> {
  splashWindow = new BrowserWindow({
    frame: false,
    height: 320,
    resizable: false,
    webPreferences: {
      preload: resolve(__dirname, './splash-preload.cjs'),
    },
    width: 420,
  });

  await splashWindow.loadFile(resolve(__dirname, './splash/index.html'));

  return splashWindow;
}

export function sendSplashStatus(phase: SplashPhase, message: string): void {
  splashWindow?.webContents.send('connect:status', phase, message);
}

export function sendSplashFailed(reason: FailureReason, message: string): void {
  splashWindow?.webContents.send('connect:failed', reason, message);
}

export function closeSplashWindow(): void {
  splashWindow?.close();
  splashWindow = null;
}
