/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {CkvDto} from '~entities/spf-module-data';
import {selectActiveCkvForModule} from '~features/graph-designer/lib/select-active-ckv-for-module';
import type {ModuleInstance} from '~features/graph-designer/model/graph-data-slice';
import type {GraphDesignerStore} from '~features/graph-designer/model/graph-designer-store';

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

function makeModule(overrides?: Partial<ModuleInstance>): ModuleInstance {
  return {
    containerId: 'cnt-1',
    displayName: 'Module',
    inputPorts: [],
    moduleId: 'mod-1',
    moduleInstanceId: 'inst-1',
    moduleName: 'Module',
    moduleType: '',
    outputPorts: [],
    position: {x: 0, y: 0},
    subgraphId: 'sg-1',
    ...overrides,
  };
}

function makeState(
  moduleInstances: Record<string, ModuleInstance>,
  headerSelectionsBySubgraphId: GraphDesignerStore['headerSelectionsBySubgraphId'],
): GraphDesignerStore {
  return {
    graphData: {
      connections: [],
      containers: {},
      moduleInstances,
      selectedUsecases: [],
      subgraphs: {},
      subsystems: {},
    },
    headerSelectionsBySubgraphId,
  } as unknown as GraphDesignerStore;
}

describe('selectActiveCkvForModule', () => {
  it('resolves when the module has a CKV matching the subgraph header selection', () => {
    const moduleInstance = makeModule({
      ckvs: [makeCkv('ckv-1', [['key-1', 'v1']])],
    });
    const state = makeState(
      {'inst-1': moduleInstance},
      {'sg-1': {keyValues: {'key-1': 'v1'}, subgraphId: 'sg-1'}},
    );

    const result = selectActiveCkvForModule(state, 'inst-1');

    expect(result).toEqual({ckvSystemId: 'ckv-1', isResolved: true});
  });

  it('is unresolved when no CKV matches the current header selection', () => {
    const moduleInstance = makeModule({
      ckvs: [makeCkv('ckv-1', [['key-1', 'v1']])],
    });
    const state = makeState(
      {'inst-1': moduleInstance},
      {'sg-1': {keyValues: {'key-1': 'v9'}, subgraphId: 'sg-1'}},
    );

    const result = selectActiveCkvForModule(state, 'inst-1');

    expect(result).toEqual({isResolved: false});
  });

  it('is unresolved when the subgraph has no header selection yet', () => {
    const moduleInstance = makeModule({
      ckvs: [makeCkv('ckv-1', [['key-1', 'v1']])],
    });
    const state = makeState({'inst-1': moduleInstance}, {});

    const result = selectActiveCkvForModule(state, 'inst-1');

    expect(result).toEqual({isResolved: false});
  });

  it('is unresolved when the module instance is not found', () => {
    const state = makeState({}, {});

    const result = selectActiveCkvForModule(state, 'missing');

    expect(result).toEqual({isResolved: false});
  });
});
