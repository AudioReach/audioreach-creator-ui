/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {createStore, type StoreApi} from 'zustand';

jest.mock('~shared/lib/logger');

import type {CkvDto} from '~entities/spf-module-data';
import {
  type GraphDesignerStore,
  GraphDesignerStoreContext,
} from '~features/graph-designer';
import type {ModuleInstance} from '~features/graph-designer/model/graph-data-slice';
import {SubgraphHeader} from '~features/graph-designer/ui/subgraph-header/subgraph-header';

const SUBGRAPH_ID = 'sg-1';

interface TestStoreShape {
  graphData: {moduleInstances: Record<string, ModuleInstance>};
  headerSelectionsBySubgraphId: GraphDesignerStore['headerSelectionsBySubgraphId'];
  initializeHeaderSelection: jest.Mock;
  setHeaderKeyValue: jest.Mock;
}

function makeCkv(systemId: string, keyValues: [string, string][]): CkvDto {
  return {
    keyValueCollection: keyValues.map(([keySystemId, valueSystemId]) => ({
      keyInfo: {keyId: 0, keyLabel: keySystemId, keySystemId},
      valueInfo: {valueId: 0, valueLabel: valueSystemId, valueSystemId},
    })),
    supportedParameters: [],
    systemId,
  };
}

function makeModule(moduleInstanceId: string, ckvs: CkvDto[]): ModuleInstance {
  return {
    ckvs,
    containerId: 'cnt-1',
    displayName: 'Module',
    inputPorts: [],
    moduleId: 'mod-1',
    moduleInstanceId,
    moduleName: 'Module',
    moduleType: '',
    outputPorts: [],
    position: {x: 0, y: 0},
    subgraphId: SUBGRAPH_ID,
  };
}

function makeStore(
  moduleInstances: Record<string, ModuleInstance>,
  headerSelectionsBySubgraphId: GraphDesignerStore['headerSelectionsBySubgraphId'] = {},
): StoreApi<TestStoreShape> {
  return createStore<TestStoreShape>(() => ({
    graphData: {moduleInstances},
    headerSelectionsBySubgraphId,
    initializeHeaderSelection: jest.fn(),
    setHeaderKeyValue: jest.fn(),
  }));
}

function renderHeader(store: StoreApi<TestStoreShape>) {
  return render(
    <GraphDesignerStoreContext.Provider
      value={store as unknown as StoreApi<GraphDesignerStore>}
    >
      <SubgraphHeader subgraphId={SUBGRAPH_ID} />
    </GraphDesignerStoreContext.Provider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SubgraphHeader — rendering', () => {
  it('renders one Select per unique CKV key across the subgraph modules', () => {
    const store = makeStore({
      'inst-1': makeModule('inst-1', [
        makeCkv('ckv-1', [
          ['key-1', 'v1'],
          ['key-2', 'va'],
        ]),
      ]),
    });
    renderHeader(store);

    expect(screen.getAllByTestId('q-select')).toHaveLength(2);
  });

  it('renders nothing when the subgraph has no modules with CKVs', () => {
    const store = makeStore({'inst-1': makeModule('inst-1', [])});
    renderHeader(store);

    expect(screen.queryAllByTestId('q-select')).toHaveLength(0);
  });

  it('marks the header wrapper as nodrag/nopan so canvas drag does not intercept select interaction', () => {
    const store = makeStore({
      'inst-1': makeModule('inst-1', [makeCkv('ckv-1', [['key-1', 'v1']])]),
    });
    renderHeader(store);

    const header = screen.getByTestId('subgraph-header');
    expect(header.className).toContain('nodrag');
    expect(header.className).toContain('nopan');
  });
});

describe('SubgraphHeader — mount initialization', () => {
  it('dispatches initializeHeaderSelection with the first sorted value of each key as default', () => {
    const store = makeStore({
      'inst-1': makeModule('inst-1', [
        makeCkv('ckv-1', [
          ['key-1', 'v2'],
          ['key-2', 'vb'],
        ]),
        makeCkv('ckv-2', [
          ['key-1', 'v1'],
          ['key-2', 'va'],
        ]),
      ]),
    });
    renderHeader(store);

    expect(store.getState().initializeHeaderSelection).toHaveBeenCalledWith(
      SUBGRAPH_ID,
      {'key-1': 'v1', 'key-2': 'va'},
    );
  });

  it('does not include the NA sentinel in the mount defaults', () => {
    const store = makeStore({
      'inst-1': makeModule('inst-1', [
        makeCkv('ckv-1', [['key-1', 'v1']]),
        makeCkv('ckv-2', [['key-1', 'v2']]),
      ]),
      'inst-2': makeModule('inst-2', [makeCkv('ckv-3', [['key-2', 'va']])]),
    });
    renderHeader(store);

    const [, defaults] = store.getState().initializeHeaderSelection.mock
      .calls[0] as [string, Record<string, string>];
    expect(Object.values(defaults)).not.toContain('NA');
  });
});

describe('SubgraphHeader — NA sentinel option', () => {
  it('adds an NA option only when the aggregated CKV set is dependent', () => {
    const store = makeStore({
      'inst-1': makeModule('inst-1', [
        makeCkv('ckv-1', [
          ['key-1', 'v1'],
          ['key-2', 'va'],
        ]),
        makeCkv('ckv-2', [
          ['key-1', 'v2'],
          ['key-2', 'vb'],
        ]),
      ]),
    });
    renderHeader(store);

    const selects = screen.getAllByTestId('q-select');
    fireEvent.change(selects[0], {target: {value: 'NA'}});
    expect(store.getState().setHeaderKeyValue).toHaveBeenCalledWith(
      SUBGRAPH_ID,
      'key-1',
      'NA',
    );
  });
});

describe('SubgraphHeader — change dispatch', () => {
  it('dispatches setHeaderKeyValue with the changed key/value on Select change', () => {
    const store = makeStore(
      {
        'inst-1': makeModule('inst-1', [
          makeCkv('ckv-1', [['key-1', 'v1']]),
          makeCkv('ckv-2', [['key-1', 'v2']]),
        ]),
      },
      {[SUBGRAPH_ID]: {keyValues: {'key-1': 'v1'}, subgraphId: SUBGRAPH_ID}},
    );
    renderHeader(store);

    fireEvent.change(screen.getByTestId('q-select'), {
      target: {value: 'v2'},
    });

    expect(store.getState().setHeaderKeyValue).toHaveBeenCalledWith(
      SUBGRAPH_ID,
      'key-1',
      'v2',
    );
  });

  it('reflects the current header selection value as the Select value', () => {
    const store = makeStore(
      {
        'inst-1': makeModule('inst-1', [
          makeCkv('ckv-1', [['key-1', 'v1']]),
          makeCkv('ckv-2', [['key-1', 'v2']]),
        ]),
      },
      {[SUBGRAPH_ID]: {keyValues: {'key-1': 'v2'}, subgraphId: SUBGRAPH_ID}},
    );
    renderHeader(store);

    expect(screen.getByTestId('q-select')).toHaveValue('v2');
  });
});
