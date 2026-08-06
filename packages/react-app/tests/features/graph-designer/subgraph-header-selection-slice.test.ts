/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import {createStore} from 'zustand';

import type {ModuleDataSlice} from '~features/graph-designer/model/module-data-slice';
import {
  createSubgraphHeaderSelectionSlice,
  type SubgraphHeaderSelectionSlice,
} from '~features/graph-designer/model/subgraph-header-selection-slice';

type TestStore = SubgraphHeaderSelectionSlice &
  Pick<ModuleDataSlice, 'syncEnableOverlays'>;

function makeHeaderSelectionStore(options: {
  syncEnableOverlays?: ModuleDataSlice['syncEnableOverlays'];
}) {
  return createStore<TestStore>((set, get) => ({
    ...createSubgraphHeaderSelectionSlice(set, get),
    syncEnableOverlays: options.syncEnableOverlays ?? (() => {}),
  }));
}

function makeStore() {
  return makeHeaderSelectionStore({});
}

describe('createSubgraphHeaderSelectionSlice — initializeHeaderSelection', () => {
  it('sets defaults for a subgraph not yet present', () => {
    const store = makeStore();

    store.getState().initializeHeaderSelection('sg-1', {'key-1': 'val-1'});

    expect(store.getState().headerSelectionsBySubgraphId['sg-1']).toEqual({
      keyValues: {'key-1': 'val-1'},
      subgraphId: 'sg-1',
    });
  });

  it('does not clobber an already-present subgraph selection', () => {
    const store = makeStore();

    store.getState().initializeHeaderSelection('sg-1', {'key-1': 'val-1'});
    store.getState().setHeaderKeyValue('sg-1', 'key-1', 'val-2');
    store.getState().initializeHeaderSelection('sg-1', {'key-1': 'val-1'});

    expect(
      store.getState().headerSelectionsBySubgraphId['sg-1'].keyValues['key-1'],
    ).toBe('val-2');
  });

  it('syncs enable overlays for a newly seeded subgraph', () => {
    const syncEnableOverlays = jest.fn();
    const store = makeHeaderSelectionStore({syncEnableOverlays});

    store
      .getState()
      .initializeHeaderSelection('503', {DeviceRXSysId: 'BT_RxSysId'});

    expect(syncEnableOverlays).toHaveBeenCalledWith('503');
  });

  it('does not sync when initialize is a no-op on an existing subgraph', () => {
    const syncEnableOverlays = jest.fn();
    const store = makeHeaderSelectionStore({syncEnableOverlays});
    store
      .getState()
      .initializeHeaderSelection('503', {DeviceRXSysId: 'BT_RxSysId'});
    syncEnableOverlays.mockClear();

    store
      .getState()
      .initializeHeaderSelection('503', {DeviceRXSysId: 'HeadsetSysId'});

    expect(syncEnableOverlays).not.toHaveBeenCalled();
  });
});

describe('createSubgraphHeaderSelectionSlice — setHeaderKeyValue', () => {
  it('updates only the targeted key for the targeted subgraph', () => {
    const store = makeStore();

    store
      .getState()
      .initializeHeaderSelection('sg-1', {'key-1': 'val-1', 'key-2': 'val-2'});
    store.getState().initializeHeaderSelection('sg-2', {'key-1': 'val-1'});

    store.getState().setHeaderKeyValue('sg-1', 'key-1', 'val-9');

    expect(
      store.getState().headerSelectionsBySubgraphId['sg-1'].keyValues,
    ).toEqual({'key-1': 'val-9', 'key-2': 'val-2'});
    expect(
      store.getState().headerSelectionsBySubgraphId['sg-2'].keyValues,
    ).toEqual({'key-1': 'val-1'});
  });

  it('initializes the subgraph selection when setting a key on an unknown subgraph', () => {
    const store = makeStore();

    store.getState().setHeaderKeyValue('sg-1', 'key-1', 'val-1');

    expect(store.getState().headerSelectionsBySubgraphId['sg-1']).toEqual({
      keyValues: {'key-1': 'val-1'},
      subgraphId: 'sg-1',
    });
  });

  it('re-syncs enable overlays for the affected subgraph on key change', () => {
    const syncEnableOverlays = jest.fn();
    const store = makeHeaderSelectionStore({syncEnableOverlays});
    store
      .getState()
      .initializeHeaderSelection('503', {DeviceRXSysId: 'BT_RxSysId'});
    syncEnableOverlays.mockClear();

    store.getState().setHeaderKeyValue('503', 'DeviceRXSysId', 'HeadsetSysId');

    expect(syncEnableOverlays).toHaveBeenCalledWith('503');
  });
});
