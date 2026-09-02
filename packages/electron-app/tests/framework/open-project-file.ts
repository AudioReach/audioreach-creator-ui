/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  ApiRequest,
  type ArcWorkspaceFileProperties,
} from '@audioreach-creator-ui/api-utils';
import type {ElectronApplication} from '@playwright/test';

export type OpenProjectFileResponse = {
  readonly acdbFileData?: Uint8Array;
  readonly cancelled: boolean;
  readonly project?: ArcWorkspaceFileProperties;
  readonly workspaceFileData?: Uint8Array;
};

type SerializedOpenProjectFileResponse = {
  readonly acdbFileData?: Uint8Array;
  readonly cancelled: boolean;
  readonly project?: ArcWorkspaceFileProperties;
  readonly workspaceFileData?: Uint8Array;
};

type IpcRequest = {
  readonly requestType?: string;
};

type IpcHandler = (event: unknown, request: IpcRequest) => unknown;

type SeamState = {
  readonly entries: Array<{
    readonly id: number;
    previousHandler: IpcHandler | undefined;
    readonly wrapper: IpcHandler;
  }>;
  nextId: number;
};

let nextSeamId = 0;

export async function installOpenProjectFileSeam(
  app: ElectronApplication,
  response: OpenProjectFileResponse,
): Promise<() => Promise<void>> {
  const serialized: SerializedOpenProjectFileResponse = {
    acdbFileData: response.acdbFileData,
    cancelled: response.cancelled,
    project: response.project,
    workspaceFileData: response.workspaceFileData,
  };
  const seamId = nextSeamId++;

  await app.evaluate(
    ({ipcMain}, {openProjectFileResponse, requestType, seamId: requestedSeamId}) => {
      const channel = 'ipc::message';
      const invokeHandlers = Reflect.get(ipcMain, '_invokeHandlers');
      const previousHandler =
        invokeHandlers instanceof Map &&
        typeof invokeHandlers.get(channel) === 'function'
          ? (invokeHandlers.get(channel) as IpcHandler)
          : undefined;
      const state =
        (Reflect.get(globalThis, '__audioreachOpenProjectFileSeam') as
          | SeamState
          | undefined) ?? {entries: [], nextId: 0};
      const id = requestedSeamId ?? state.nextId++;
      const wrapper: IpcHandler = (_event, request) => {
        if (request.requestType !== requestType) {
          if (previousHandler) {
            return previousHandler(_event, request);
          }

          throw new Error(`Unexpected IPC request: ${request.requestType}`);
        }

        return {
          data: {
            acdbFileData: openProjectFileResponse.acdbFileData
              ? Buffer.from(openProjectFileResponse.acdbFileData)
              : undefined,
            cancelled: openProjectFileResponse.cancelled,
            project: openProjectFileResponse.project,
            workspaceFileData: openProjectFileResponse.workspaceFileData
              ? Buffer.from(openProjectFileResponse.workspaceFileData)
              : undefined,
          },
          message: '',
          requestType,
        };
      };

      state.entries.push({id, previousHandler, wrapper});
      Reflect.set(globalThis, '__audioreachOpenProjectFileSeam', state);
      ipcMain.removeHandler(channel);
      ipcMain.handle(channel, wrapper);

    },
    {
      openProjectFileResponse: serialized,
      requestType: ApiRequest.OpenProjectFile,
      seamId,
    },
  );

  let disposed = false;
  return async () => {
    if (disposed) {
      return;
    }
    disposed = true;

    await app.evaluate(({ipcMain}, {seamId: requestedSeamId}) => {
      const stateKey = '__audioreachOpenProjectFileSeam';
      const state = Reflect.get(globalThis, stateKey) as SeamState | undefined;
      const entryIndex = state?.entries.findIndex(
        (candidate) => candidate.id === requestedSeamId,
      ) ?? -1;
      const entry = entryIndex >= 0 ? state?.entries[entryIndex] : undefined;
      if (!entry) {
        return;
      }

      const handlers = Reflect.get(ipcMain, '_invokeHandlers');
      const currentHandler =
        handlers instanceof Map ? handlers.get('ipc::message') : undefined;
      for (const candidate of state.entries) {
        if (candidate.previousHandler === entry.wrapper) {
          candidate.previousHandler = entry.previousHandler;
        }
      }
      state.entries.splice(entryIndex, 1);
      if (currentHandler !== entry.wrapper) {
        return;
      }

      ipcMain.removeHandler('ipc::message');
      if (entry.previousHandler) {
        ipcMain.handle('ipc::message', entry.previousHandler);
      }
    }, {seamId});
  };
}
