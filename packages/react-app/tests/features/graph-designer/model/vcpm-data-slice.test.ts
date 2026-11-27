/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {createStore} from 'zustand';

import {
  createVcpmDataSlice,
  type VcpmDataSlice,
} from '~features/graph-designer/model/vcpm-data-slice';
import type {
  ConfiguredCkv,
  GraphKey,
} from '~shared/types/key-configurator-config.types';
import * as vcpmApi from '~entities/vcpm';

jest.mock('~shared/lib/logger', () => ({
  logger: {debug: jest.fn(), error: jest.fn()},
}));
jest.mock('~shared/controls/global-toaster', () => ({showToast: jest.fn()}));
jest.mock('~entities/vcpm');

type TestStore = VcpmDataSlice & {
  calibrationKeys: Record<string, GraphKey>;
  configuredVcpmCkvsBySubgraphId: Record<string, ConfiguredCkv[]>;
};

function createTestStore() {
  return createStore<TestStore>((set, get) => ({
    ...createVcpmDataSlice(set, get, 'project-1'),
    calibrationKeys: {},
    configuredVcpmCkvsBySubgraphId: {},
  }));
}

describe('vcpm-data-slice', () => {
  it('starts with no cached subgraph entries', () => {
    const store = createTestStore();
    expect(store.getState().vcpmDataBySubgraphId).toEqual({});
    expect(store.getState().vcpmOpenTabs).toEqual({});
  });

  it('queryVcpmData returns false and leaves state untouched on a blocking issue', async () => {
    (vcpmApi.getVcpmCkvs as jest.Mock).mockResolvedValue({
      issues: [
        {category: 'BLOCKING', code: 'E', message: 'm', severity: 'ERROR'},
      ],
    });
    (vcpmApi.getVcpmCalData as jest.Mock).mockResolvedValue({
      data: {calData: []},
    });
    const store = createTestStore();
    const ok = await store.getState().queryVcpmData('sg-1', 'Subgraph 1');
    expect(ok).toBe(false);
    expect(store.getState().vcpmDataBySubgraphId['sg-1']).toBeUndefined();
  });

  it('queryVcpmData selects every available parameter by default', async () => {
    (vcpmApi.getVcpmCkvs as jest.Mock).mockResolvedValue({
      data: {ckv: []},
    });
    (vcpmApi.getVcpmCalData as jest.Mock).mockResolvedValue({
      data: {
        calData: [
          {
            ckvSystemId: 'ckv-1',
            parameters: [
              {elements: [], name: 'Param A', systemId: 'p-1'},
              {elements: [], name: 'Param B', systemId: 'p-2'},
            ],
          },
        ],
      },
    });
    (vcpmApi.transformVcpmCkvsToConfiguredCkvs as jest.Mock).mockReturnValue([
      {keyValuePairs: [], systemId: 'ckv-1'},
    ]);
    const store = createTestStore();

    const ok = await store.getState().queryVcpmData('sg-1', 'Subgraph 1');

    expect(ok).toBe(true);
    const entry = store.getState().vcpmDataBySubgraphId['sg-1'];
    expect(entry.selectedCkvSystemId).toBe('ckv-1');
    expect(entry.uiState?.selectedIds).toEqual(['p-1', 'p-2']);
  });

  it('setVcpmUiState merges the patch without touching selectedCkvSystemId', () => {
    const store = createTestStore();
    store.setState({
      vcpmDataBySubgraphId: {
        'sg-1': {selectedCkvSystemId: 'ckv-1', status: 'ready'},
      },
    });
    store.getState().setVcpmUiState('sg-1', {selectedIds: ['p-1']});
    const entry = store.getState().vcpmDataBySubgraphId['sg-1'];
    expect(entry.uiState?.selectedIds).toEqual(['p-1']);
    expect(entry.selectedCkvSystemId).toBe('ckv-1');
  });

  it('clearVcpmData removes the subgraph entry', () => {
    const store = createTestStore();
    store.setState({vcpmDataBySubgraphId: {'sg-1': {status: 'ready'}}});
    store.getState().clearVcpmData('sg-1');
    expect(store.getState().vcpmDataBySubgraphId['sg-1']).toBeUndefined();
  });
});
