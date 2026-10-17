/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger', () => ({
  logger: {debug: jest.fn(), error: jest.fn(), warn: jest.fn()},
}));

import type {CalibrationKeyConfigSlice} from '~features/graph-designer/model/calibration-key-config-slice';
import {
  createKeyConfigSlice,
  type ConfigurationContext,
  type KeyConfigSlice,
} from '~features/graph-designer/model/key-config-slice';
import type {ModuleTagKeyConfigSlice} from '~features/graph-designer/model/module-tag-key-config-slice';

type TestStore = KeyConfigSlice &
  CalibrationKeyConfigSlice &
  ModuleTagKeyConfigSlice;

function makeHarness({
  calibrationOk = true,
  tagOk = true,
}: {calibrationOk?: boolean; tagOk?: boolean} = {}) {
  let state: TestStore;
  const set = (partial: Partial<TestStore>) => {
    state = {...state, ...partial};
  };
  const get = () => state;
  const calibrationSlice: CalibrationKeyConfigSlice = {
    availableCalibrationKeys: {},
    initializeCalibrationKeyConfiguration: jest.fn(async () => calibrationOk),
    removeConfiguredCkv: jest.fn(),
    resetCalibrationKeyConfiguration: jest.fn(),
    updateConfiguredCkvs: jest.fn(),
  };
  const moduleTagKeySlice: ModuleTagKeyConfigSlice = {
    addConfiguredTkv: jest.fn(),
    initializeModuleTagKeyConfiguration: jest.fn(async () => tagOk),
    moduleTagKeys: {},
    removeConfiguredTkv: jest.fn(),
    resetModuleTagKeyConfiguration: jest.fn(),
    updateConfiguredTkvs: jest.fn(),
  };
  const keyConfigSlice = createKeyConfigSlice<TestStore>(set, get);
  state = {...keyConfigSlice, ...calibrationSlice, ...moduleTagKeySlice};
  return {get, slice: keyConfigSlice};
}

const context: ConfigurationContext = {
  itemId: 'mod-1',
  itemType: 'module',
  projectId: 'proj-1',
};

describe('createKeyConfigSlice', () => {
  it('initializeConfiguration sets status ready on success', async () => {
    const {get, slice} = makeHarness();

    const result = await slice.initializeConfiguration(context);

    expect(result).toBe(true);
    expect(get().keyConfigStatus).toBe('ready');
  });

  it('initializeConfiguration calls initializeCalibrationKeyConfiguration with the same projectId', async () => {
    const {get, slice} = makeHarness();

    await slice.initializeConfiguration(context);

    expect(get().initializeCalibrationKeyConfiguration).toHaveBeenCalledWith(
      'proj-1',
    );
  });

  it('initializeConfiguration calls initializeModuleTagKeyConfiguration with the same projectId', async () => {
    const {get, slice} = makeHarness();

    await slice.initializeConfiguration(context);

    expect(get().initializeModuleTagKeyConfiguration).toHaveBeenCalledWith(
      'proj-1',
    );
  });

  it('initializeConfiguration sets status error when calibration init fails', async () => {
    const {get, slice} = makeHarness({calibrationOk: false});

    const result = await slice.initializeConfiguration(context);

    expect(result).toBe(false);
    expect(get().keyConfigStatus).toBe('error');
  });

  it('initializeConfiguration sets status error when tag init fails', async () => {
    const {get, slice} = makeHarness({tagOk: false});

    const result = await slice.initializeConfiguration(context);

    expect(result).toBe(false);
    expect(get().keyConfigStatus).toBe('error');
  });

  it('resetConfiguration calls resetCalibrationKeyConfiguration', () => {
    const {get, slice} = makeHarness();

    slice.resetConfiguration();

    expect(get().resetCalibrationKeyConfiguration).toHaveBeenCalledTimes(1);
  });

  it('resetConfiguration calls resetModuleTagKeyConfiguration', () => {
    const {get, slice} = makeHarness();

    slice.resetConfiguration();

    expect(get().resetModuleTagKeyConfiguration).toHaveBeenCalledTimes(1);
  });

  it('resetConfiguration resets key-config slice state', () => {
    const {get, slice} = makeHarness();

    slice.resetConfiguration();

    expect(get().isEditable).toBe(false);
    expect(get().keyConfigStatus).toBe('uninitialized');
    expect(get().subgraphConfig).toBeNull();
    expect(get().subsystemConfig).toBeNull();
  });

  it('saveConfiguration returns true on success with a valid context and does not call any CKV action', async () => {
    const {get, slice} = makeHarness();
    await slice.initializeConfiguration(context);

    const result = await slice.saveConfiguration();

    expect(result).toBe(true);
    expect(get().removeConfiguredCkv).not.toHaveBeenCalled();
    expect(get().updateConfiguredCkvs).not.toHaveBeenCalled();
  });
});
