/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {app, ipcMain} from 'electron';

/** Registers the IPC channel used by the splash's Quit action. */
export function registerBackendLifecycleIpcHandlers(): void {
  ipcMain.handle('connect:quit', (): void => {
    app.quit();
  });
}
