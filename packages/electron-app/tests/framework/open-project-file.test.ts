/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {ApiRequest} from '@audioreach-creator-ui/api-utils';
import {expect, test, type ElectronApplication} from '@playwright/test';

import {
  installOpenProjectFileSeam,
  type OpenProjectFileResponse,
} from './open-project-file';

test('installs the exact open-project-file response and reconstructs bytes', async () => {
  const calls: unknown[][] = [];
  let handler:
    | ((event: unknown, request: {requestType: string}) => unknown)
    | undefined;
  const ipcMain = {
    handle: (_channel: string, callback: typeof handler) => {
      handler = callback;
    },
    removeHandler: () => undefined,
  };
  const evaluate = (...args: unknown[]) => {
    calls.push(args);
    const callback = args[0] as (
      electron: {ipcMain: typeof ipcMain},
      data: {openProjectFileResponse: OpenProjectFileResponse; requestType: string},
    ) => void;
    callback(
      {ipcMain},
      {
        ...(args[1] as {
          openProjectFileResponse: OpenProjectFileResponse;
          requestType: string;
        }),
        seamId: 0,
      },
    );
    return Promise.resolve();
  };
  const app = {evaluate} as unknown as ElectronApplication;
  const response: OpenProjectFileResponse = {
    acdbFileData: new Uint8Array([3, 4]),
    cancelled: false,
    project: {
      description: 'Fixture project',
      filepath: '/tmp/fixture.awsp',
      name: 'Fixture project',
    },
    workspaceFileData: new Uint8Array([1, 2]),
  };

  const dispose = await installOpenProjectFileSeam(app, response);
  expect(calls).toHaveLength(1);
  const serialized = (
    calls[0]?.[1] as {openProjectFileResponse: OpenProjectFileResponse}
  ).openProjectFileResponse;
  expect(serialized.workspaceFileData).toBeInstanceOf(Uint8Array);
  expect(serialized.acdbFileData).toBeInstanceOf(Uint8Array);
  expect(ApiRequest.OpenProjectFile).toBe('open-project-file');

  const result = handler?.({}, {requestType: ApiRequest.OpenProjectFile}) as {
    data: OpenProjectFileResponse;
    message: string;
    requestType: string;
  };
  expect(result).toEqual({
    data: {
      acdbFileData: Buffer.from([3, 4]),
      cancelled: false,
      project: response.project,
      workspaceFileData: Buffer.from([1, 2]),
    },
    message: '',
    requestType: ApiRequest.OpenProjectFile,
  });
  await dispose();
});

test('does not turn unknown IPC requests into successful responses', async () => {
  const calls: unknown[][] = [];
  let handler:
    | ((event: unknown, request: {requestType: string}) => unknown)
    | undefined;
  const app = {
    evaluate: (...args: unknown[]) => {
      calls.push(args);
      const callback = args[0] as (
        electron: {ipcMain: {handle: (_channel: string, callback: typeof handler) => void; removeHandler: () => void}},
        data: {openProjectFileResponse: OpenProjectFileResponse; requestType: string},
      ) => void;
      callback(
        {ipcMain: {handle: (_channel, installedHandler) => { handler = installedHandler; }, removeHandler: () => undefined}},
        {
          ...(args[1] as {
            openProjectFileResponse: OpenProjectFileResponse;
            requestType: string;
          }),
          seamId: 1,
        },
      );
      return Promise.resolve();
    },
  } as unknown as ElectronApplication;

  const dispose = await installOpenProjectFileSeam(app, {cancelled: true});
  expect(calls).toHaveLength(1);
  expect(() => handler?.({}, {requestType: 'unknown-request'})).toThrow(
    'Unexpected IPC request: unknown-request',
  );
  await dispose();
});

test('delegates unrelated IPC requests to the existing handler', async () => {
  const delegatedRequest = {requestType: 'existing-request'};
  const existingHandler = () => ({requestType: delegatedRequest.requestType});
  const handlers = new Map<string, (event: unknown, request: {requestType: string}) => unknown>([
    ['ipc::message', existingHandler],
  ]);
  let installedHandler:
    | ((event: unknown, request: {requestType: string}) => unknown)
    | undefined;
  const app = {
    evaluate: (...args: unknown[]) => {
      const callback = args[0] as (
        electron: {ipcMain: unknown},
        data: {openProjectFileResponse: OpenProjectFileResponse; requestType: string},
      ) => void;
      const ipcMain = {
        handle: (_channel: string, handler: typeof installedHandler) => {
          installedHandler = handler;
          handlers.set('ipc::message', handler as typeof existingHandler);
        },
        removeHandler: () => {
          handlers.delete('ipc::message');
        },
      };
      callback(
        {ipcMain: Object.assign(ipcMain, {_invokeHandlers: handlers})},
        {
          ...(args[1] as {
            openProjectFileResponse: OpenProjectFileResponse;
            requestType: string;
          }),
          seamId: 2,
        },
      );
      return Promise.resolve();
    },
  } as unknown as ElectronApplication;

  const dispose = await installOpenProjectFileSeam(app, {cancelled: true});
  expect(installedHandler?.({}, delegatedRequest)).toEqual(delegatedRequest);
  await dispose();
  expect(handlers.get('ipc::message')).toBe(existingHandler);
});

test('disposes seams by identity and restores the original handler out of order', async () => {
  const existingHandler = () => ({requestType: 'existing-request'});
  const handlers = new Map<string, unknown>([['ipc::message', existingHandler]]);
  const app = {
    evaluate: (...args: unknown[]) => {
      const callback = args[0] as (
        electron: {ipcMain: unknown},
        data: unknown,
      ) => unknown;
      const ipcMain = {
        handle: (_channel: string, handler: unknown) => {
          handlers.set('ipc::message', handler);
        },
        removeHandler: () => {
          handlers.delete('ipc::message');
        },
      };
      return Promise.resolve(
        callback(
          {ipcMain: Object.assign(ipcMain, {_invokeHandlers: handlers})},
          args[1],
        ),
      );
    },
  } as unknown as ElectronApplication;

  const firstDispose = await installOpenProjectFileSeam(app, {cancelled: true});
  const firstHandler = handlers.get('ipc::message');
  const secondDispose = await installOpenProjectFileSeam(app, {cancelled: true});
  const secondHandler = handlers.get('ipc::message');

  await firstDispose();
  expect(handlers.get('ipc::message')).toBe(secondHandler);

  await secondDispose();
  expect(handlers.get('ipc::message')).toBe(existingHandler);
  expect(firstHandler).not.toBe(secondHandler);
});

test('disposes the test-scoped IPC handler', async () => {
  let removedChannel: string | undefined;
  const app = {
    evaluate: (...args: unknown[]) => {
      const callback = args[0] as (
        electron: {ipcMain: {handle: () => void; removeHandler: (channel: string) => void}},
        data: unknown,
      ) => void;
      callback(
        {ipcMain: {handle: () => undefined, removeHandler: (channel) => { removedChannel = channel; }}},
        {seamId: 3},
      );
      return Promise.resolve();
    },
  } as unknown as ElectronApplication;

  const dispose = await installOpenProjectFileSeam(app, {cancelled: true});
  await dispose();

  expect(removedChannel).toBe('ipc::message');
});
