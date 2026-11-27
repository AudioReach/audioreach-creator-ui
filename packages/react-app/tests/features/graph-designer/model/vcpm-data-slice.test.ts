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

  it('queryVcpmData returns false and leaves state untouched on a blocking issue from getVcpmCkvs', async () => {
    (vcpmApi.getVcpmCkvs as jest.Mock).mockResolvedValue({
      issues: [
        {category: 'BLOCKING', code: 'E', message: 'm', severity: 'ERROR'},
      ],
    });
    const store = createTestStore();
    const ok = await store.getState().queryVcpmData('sg-1', 'Subgraph 1');
    expect(ok).toBe(false);
    expect(store.getState().vcpmDataBySubgraphId['sg-1']).toBeUndefined();
    expect(vcpmApi.getVcpmCalData).not.toHaveBeenCalled();
  });

  it('queryVcpmData returns false and leaves state untouched on a blocking issue from getVcpmCalData', async () => {
    (vcpmApi.getVcpmCkvs as jest.Mock).mockResolvedValue({
      data: {configuredParams: []},
    });
    (
      vcpmApi.transformVcpmConfiguredParamsToConfiguredCkvs as jest.Mock
    ).mockReturnValue([{keyValuePairs: [], systemId: 'ckv-1'}]);
    (vcpmApi.getVcpmCalData as jest.Mock).mockResolvedValue({
      issues: [
        {category: 'BLOCKING', code: 'E', message: 'm', severity: 'ERROR'},
      ],
    });
    const store = createTestStore();
    const ok = await store.getState().queryVcpmData('sg-1', 'Subgraph 1');
    expect(ok).toBe(false);
    expect(store.getState().vcpmDataBySubgraphId['sg-1']).toBeUndefined();
  });

  it('queryVcpmData fetches cal data for the default CKV only, by systemId', async () => {
    (vcpmApi.getVcpmCkvs as jest.Mock).mockResolvedValue({
      data: {configuredParams: []},
    });
    (vcpmApi.getVcpmCalData as jest.Mock).mockResolvedValue({
      data: {
        Ckv: [],
        parameters: [
          {elements: [], name: 'Param A', systemId: 'p-1'},
          {elements: [], name: 'Param B', systemId: 'p-2'},
        ],
        systemId: 'ckv-1',
      },
    });
    (
      vcpmApi.transformVcpmConfiguredParamsToConfiguredCkvs as jest.Mock
    ).mockReturnValue([{keyValuePairs: [], systemId: 'ckv-1'}]);
    const store = createTestStore();

    const ok = await store.getState().queryVcpmData('sg-1', 'Subgraph 1');

    expect(ok).toBe(true);
    expect(vcpmApi.getVcpmCalData).toHaveBeenCalledWith(
      'project-1',
      'sg-1',
      'ckv-1',
    );
    const entry = store.getState().vcpmDataBySubgraphId['sg-1'];
    expect(entry.selectedCkvSystemId).toBe('ckv-1');
    expect(entry.calDataByCkvId).toEqual({
      'ckv-1': [
        {elements: [], name: 'Param A', systemId: 'p-1'},
        {elements: [], name: 'Param B', systemId: 'p-2'},
      ],
    });
    expect(entry.uiState?.selectedIds).toEqual(['p-1', 'p-2']);
  });

  it('queryVcpmData skips the cal data call entirely when there are no CKVs', async () => {
    (vcpmApi.getVcpmCkvs as jest.Mock).mockResolvedValue({
      data: {configuredParams: []},
    });
    (
      vcpmApi.transformVcpmConfiguredParamsToConfiguredCkvs as jest.Mock
    ).mockReturnValue([]);
    const store = createTestStore();

    const ok = await store.getState().queryVcpmData('sg-1', 'Subgraph 1');

    expect(ok).toBe(true);
    expect(vcpmApi.getVcpmCalData).not.toHaveBeenCalled();
    const entry = store.getState().vcpmDataBySubgraphId['sg-1'];
    expect(entry.selectedCkvSystemId).toBeUndefined();
    expect(entry.calDataByCkvId).toEqual({});
  });

  describe('selectVcpmCalIndex', () => {
    it('fetches and caches cal data for a CKV not yet loaded', async () => {
      (vcpmApi.getVcpmCalData as jest.Mock).mockResolvedValue({
        data: {
          Ckv: [],
          parameters: [{elements: [], name: 'Param A', systemId: 'p-1'}],
          systemId: 'ckv-2',
        },
      });
      const store = createTestStore();
      store.setState({
        vcpmDataBySubgraphId: {
          'sg-1': {
            calDataByCkvId: {'ckv-1': []},
            selectedCkvSystemId: 'ckv-1',
            status: 'ready',
          },
        },
      });

      await store.getState().selectVcpmCalIndex('sg-1', 'ckv-2');

      expect(vcpmApi.getVcpmCalData).toHaveBeenCalledWith(
        'project-1',
        'sg-1',
        'ckv-2',
      );
      const entry = store.getState().vcpmDataBySubgraphId['sg-1'];
      expect(entry.selectedCkvSystemId).toBe('ckv-2');
      expect(entry.calDataByCkvId).toEqual({
        'ckv-1': [],
        'ckv-2': [{elements: [], name: 'Param A', systemId: 'p-1'}],
      });
    });

    it('reuses already-cached cal data without refetching', async () => {
      const store = createTestStore();
      store.setState({
        vcpmDataBySubgraphId: {
          'sg-1': {
            calDataByCkvId: {'ckv-1': [], 'ckv-2': []},
            selectedCkvSystemId: 'ckv-1',
            status: 'ready',
          },
        },
      });

      await store.getState().selectVcpmCalIndex('sg-1', 'ckv-2');

      expect(vcpmApi.getVcpmCalData).not.toHaveBeenCalled();
      expect(
        store.getState().vcpmDataBySubgraphId['sg-1'].selectedCkvSystemId,
      ).toBe('ckv-2');
    });

    it('clears the selection without fetching when given an empty ckvSystemId', async () => {
      const store = createTestStore();
      store.setState({
        vcpmDataBySubgraphId: {
          'sg-1': {
            calDataByCkvId: {'ckv-1': []},
            selectedCkvSystemId: 'ckv-1',
            status: 'ready',
          },
        },
      });

      await store.getState().selectVcpmCalIndex('sg-1', '');

      expect(vcpmApi.getVcpmCalData).not.toHaveBeenCalled();
      expect(
        store.getState().vcpmDataBySubgraphId['sg-1'].selectedCkvSystemId,
      ).toBe('');
    });

    it('leaves the selection untouched when the fetch for a new CKV fails', async () => {
      (vcpmApi.getVcpmCalData as jest.Mock).mockResolvedValue({
        issues: [
          {category: 'BLOCKING', code: 'E', message: 'm', severity: 'ERROR'},
        ],
      });
      const store = createTestStore();
      store.setState({
        vcpmDataBySubgraphId: {
          'sg-1': {
            calDataByCkvId: {'ckv-1': []},
            selectedCkvSystemId: 'ckv-1',
            status: 'ready',
          },
        },
      });

      await store.getState().selectVcpmCalIndex('sg-1', 'ckv-2');

      const entry = store.getState().vcpmDataBySubgraphId['sg-1'];
      expect(entry.selectedCkvSystemId).toBe('ckv-1');
      expect(entry.calDataByCkvId).toEqual({'ckv-1': []});
    });
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
