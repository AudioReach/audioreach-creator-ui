/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {createStore} from 'zustand';

import * as keyDefinitionsApi from '~entities/key-definitions';
import * as vcpmApi from '~entities/vcpm';
import type {VcpmCalDataEntry} from '~features/graph-designer/model/vcpm-data-slice';
import {
  createVcpmKeyConfigSlice,
  type VcpmKeyConfigSlice,
} from '~features/graph-designer/model/vcpm-key-config-slice';
import type {GraphKey} from '~shared/types/key-configurator-config.types';

jest.mock('~shared/controls/global-toaster', () => ({showToast: jest.fn()}));
jest.mock('~shared/lib/logger', () => ({
  logger: {debug: jest.fn(), error: jest.fn()},
}));
jest.mock('~entities/vcpm');
jest.mock('~entities/key-definitions');

type TestStore = VcpmKeyConfigSlice & {
  calibrationKeys: Record<string, GraphKey>;
  selectVcpmCalIndex: jest.Mock;
  vcpmDataBySubgraphId: Record<string, VcpmCalDataEntry>;
};

function createTestStore() {
  return createStore<TestStore>((set, get) => ({
    calibrationKeys: {},
    ...createVcpmKeyConfigSlice(set, get, 'project-1'),
    selectVcpmCalIndex: jest.fn(),
    vcpmDataBySubgraphId: {},
  }));
}

describe('vcpm-key-config-slice', () => {
  it('addVcpmCkvs appends the returned CKVs on success', async () => {
    (vcpmApi.createVcpmCkvs as jest.Mock).mockResolvedValue({
      data: {
        addedCkvs: [{keyValuePairs: [], systemId: 'ckv-1'}],
        removedCkvSystemIds: [],
      },
    });
    (vcpmApi.transformVcpmCkvsToConfiguredCkvs as jest.Mock).mockReturnValue([
      {keyValuePairs: [], pidConfig: [], systemId: 'ckv-1'},
    ]);
    const store = createTestStore();
    const ok = await store.getState().addVcpmCkvs('sg-1', [['v1']]);
    expect(ok).toBe(true);
    expect(
      store.getState().configuredVcpmCkvsBySubgraphId['sg-1'],
    ).toHaveLength(1);
    expect(store.getState().selectVcpmCalIndex).toHaveBeenCalledWith(
      'sg-1',
      'ckv-1',
    );
  });

  it('addVcpmCkvs leaves the list unchanged on a blocking issue', async () => {
    (vcpmApi.createVcpmCkvs as jest.Mock).mockResolvedValue({
      issues: [
        {category: 'BLOCKING', code: 'E', message: 'm', severity: 'ERROR'},
      ],
    });
    const store = createTestStore();
    const ok = await store.getState().addVcpmCkvs('sg-1', [['v1']]);
    expect(ok).toBe(false);
    expect(
      store.getState().configuredVcpmCkvsBySubgraphId['sg-1'],
    ).toBeUndefined();
  });

  it('deleteVcpmCkv treats a bodyless success as success and shifts selection', async () => {
    (vcpmApi.deleteVcpmCkv as jest.Mock).mockResolvedValue({data: undefined});
    const store = createTestStore();
    store.setState({
      configuredVcpmCkvsBySubgraphId: {
        'sg-1': [
          {keyValuePairs: [], pidConfig: [], systemId: 'ckv-1'},
          {keyValuePairs: [], pidConfig: [], systemId: 'ckv-2'},
        ],
      },
      vcpmDataBySubgraphId: {
        'sg-1': {selectedCkvSystemId: 'ckv-1', status: 'ready'},
      },
    });
    const ok = await store.getState().deleteVcpmCkv('sg-1', 'ckv-1');
    expect(ok).toBe(true);
    expect(store.getState().configuredVcpmCkvsBySubgraphId['sg-1']).toEqual([
      {keyValuePairs: [], pidConfig: [], systemId: 'ckv-2'},
    ]);
    expect(store.getState().selectVcpmCalIndex).toHaveBeenCalledWith(
      'sg-1',
      'ckv-2',
    );
  });

  it('deleteVcpmCkv returns false on a blocking issue and leaves the list untouched', async () => {
    (vcpmApi.deleteVcpmCkv as jest.Mock).mockResolvedValue({
      issues: [
        {category: 'BLOCKING', code: 'E', message: 'm', severity: 'ERROR'},
      ],
    });
    const store = createTestStore();
    store.setState({
      configuredVcpmCkvsBySubgraphId: {
        'sg-1': [{keyValuePairs: [], pidConfig: [], systemId: 'ckv-1'}],
      },
    });
    const ok = await store.getState().deleteVcpmCkv('sg-1', 'ckv-1');
    expect(ok).toBe(false);
    expect(store.getState().configuredVcpmCkvsBySubgraphId['sg-1']).toEqual([
      {keyValuePairs: [], pidConfig: [], systemId: 'ckv-1'},
    ]);
    expect(store.getState().selectVcpmCalIndex).not.toHaveBeenCalled();
  });

  it('loadVoiceKeys sets voiceKeys from the filtered key definitions on success', async () => {
    (keyDefinitionsApi.getAllKeyDefinitions as jest.Mock).mockResolvedValue({
      data: [
        {
          id: 1,
          isVoice: true,
          name: 'voice-key',
          naturalId: 1,
          systemId: 'k-1',
          values: [],
        },
      ],
    });
    const store = createTestStore();
    await store.getState().loadVoiceKeys();
    expect(store.getState().voiceKeys).toEqual({
      'voice-key': {id: 1, name: 'voice-key', systemId: 'k-1', values: []},
    });
  });

  it('loadVoiceKeys populates voiceKeys even when calibrationKeys is empty', async () => {
    // Regression guard: calibrationKeys is only populated once the generic
    // Key Configurator panel has been opened for some item, which never
    // happens when a user opens VCPM Config directly from the subgraph
    // card. voiceKeys must not depend on that slice's state.
    (keyDefinitionsApi.getAllKeyDefinitions as jest.Mock).mockResolvedValue({
      data: [
        {
          id: 1,
          isVoice: true,
          name: 'voice-key',
          naturalId: 1,
          systemId: 'k-1',
          values: [],
        },
      ],
    });
    const store = createTestStore();
    expect(store.getState().calibrationKeys).toEqual({});
    await store.getState().loadVoiceKeys();
    expect(store.getState().voiceKeys).toEqual({
      'voice-key': {id: 1, name: 'voice-key', systemId: 'k-1', values: []},
    });
  });

  it('loadVoiceKeys leaves voiceKeys untouched on a blocking issue', async () => {
    (keyDefinitionsApi.getAllKeyDefinitions as jest.Mock).mockResolvedValue({
      issues: [
        {category: 'BLOCKING', code: 'E', message: 'm', severity: 'ERROR'},
      ],
    });
    const store = createTestStore();
    await store.getState().loadVoiceKeys();
    expect(store.getState().voiceKeys).toEqual({});
  });
});
