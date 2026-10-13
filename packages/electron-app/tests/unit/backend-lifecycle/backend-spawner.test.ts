/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {join} from 'node:path';

import {buildBackendSpawnOptions} from '../../../src/backend-lifecycle/backend-spawner';

describe('buildBackendSpawnOptions', () => {
  it('builds spawn arguments pointing at main.js in the given directory', () => {
    const result = buildBackendSpawnOptions(
      '/opt/arc-backend',
      '/fake/electron-node',
    );

    expect(result.command).toBe('/fake/electron-node');
    expect(result.args).toEqual([join('/opt/arc-backend', 'main.js')]);
  });

  it('sets ELECTRON_RUN_AS_NODE in the child environment, with no PORT', () => {
    const result = buildBackendSpawnOptions(
      '/opt/arc-backend',
      '/fake/electron-node',
    );

    expect(result.options.env?.ELECTRON_RUN_AS_NODE).toBe('1');
    expect(result.options.env?.PORT).toBeUndefined();
  });

  it('detaches the process and ignores stdio', () => {
    const result = buildBackendSpawnOptions(
      '/opt/arc-backend',
      '/fake/electron-node',
    );

    expect(result.options.detached).toBe(true);
    expect(result.options.stdio).toBe('ignore');
    expect(result.options.cwd).toBe('/opt/arc-backend');
  });

  it('defaults execPath to process.execPath when not supplied', () => {
    const result = buildBackendSpawnOptions('/opt/arc-backend');

    expect(result.command).toBe(process.execPath);
  });
});
