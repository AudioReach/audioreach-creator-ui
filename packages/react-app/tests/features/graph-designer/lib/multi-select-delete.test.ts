/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');
jest.mock('~shared/controls/global-toaster', () => ({showToast: jest.fn()}));

import {showToast} from '~shared/controls/global-toaster';
import {
  deleteSelection,
  filterCascadeRoots,
  filterEdgesCoveredByCascade,
  isAncestorOf,
  resolveNodeKind,
} from '~features/graph-designer/lib/multi-select-delete';
import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import type {GraphDesignerStore} from '~features/graph-designer/model/graph-designer-store';

const mockShowToast = jest.mocked(showToast);

function graphData(): UsecaseGraphData {
  return {
    connections: [
      {
        connectionId: 'link-in-c1',
        connectionType: 'data',
        fromModuleId: 'mod-1',
        fromPortId: 'out-1',
        isDangling: false,
        toModuleId: 'mod-2',
        toPortId: 'in-1',
      },
      {
        connectionId: 'link-independent',
        connectionType: 'control',
        fromModuleId: 'mod-3',
        fromPortId: 'ctl-1',
        isDangling: false,
        toModuleId: 'mod-4',
        toPortId: 'ctl-2',
      },
    ],
    containers: {
      'cnt-1': {
        containerId: 'cnt-1',
        moduleInstances: ['mod-1', 'mod-2'],
        subgraphId: 'sg-1',
      },
      'cnt-2': {
        containerId: 'cnt-2',
        moduleInstances: ['mod-3'],
        subgraphId: 'sg-2',
      },
      'cnt-3': {
        containerId: 'cnt-3',
        moduleInstances: ['mod-4'],
        subgraphId: 'sg-3',
      },
    },
    moduleInstances: {
      'mod-1': {
        containerId: 'cnt-1',
        displayName: 'M1',
        inputPorts: [],
        moduleId: 'def-1',
        moduleInstanceId: 'mod-1',
        moduleName: 'M1',
        moduleType: 'COPP',
        outputPorts: [],
        position: {x: 0, y: 0},
        subgraphId: 'sg-1',
      },
      'mod-2': {
        containerId: 'cnt-1',
        displayName: 'M2',
        inputPorts: [],
        moduleId: 'def-2',
        moduleInstanceId: 'mod-2',
        moduleName: 'M2',
        moduleType: 'COPP',
        outputPorts: [],
        position: {x: 0, y: 0},
        subgraphId: 'sg-1',
      },
      'mod-3': {
        containerId: 'cnt-2',
        displayName: 'M3',
        inputPorts: [],
        moduleId: 'def-3',
        moduleInstanceId: 'mod-3',
        moduleName: 'M3',
        moduleType: 'COPP',
        outputPorts: [],
        position: {x: 0, y: 0},
        subgraphId: 'sg-2',
      },
      'mod-4': {
        containerId: 'cnt-3',
        displayName: 'M4',
        inputPorts: [],
        moduleId: 'def-4',
        moduleInstanceId: 'mod-4',
        moduleName: 'M4',
        moduleType: 'COPP',
        outputPorts: [],
        position: {x: 0, y: 0},
        subgraphId: 'sg-3',
      },
    },
    selectedUsecases: ['uc-1'],
    subgraphs: {
      'sg-1': {
        containers: ['cnt-1'],
        subgraphId: 'sg-1',
        subgraphName: 'SG1',
        subgraphType: '',
      },
      'sg-2': {
        containers: ['cnt-2'],
        subgraphId: 'sg-2',
        subgraphName: 'SG2',
        subgraphType: '',
      },
      'sg-3': {
        containers: ['cnt-3'],
        subgraphId: 'sg-3',
        subgraphName: 'SG3',
        subgraphType: '',
      },
    },
    subsystems: {
      'ss-1': {
        childSubsystemIds: [],
        controlPorts: [],
        dataPorts: [],
        subgraphs: ['sg-1'],
        subsystemId: 'ss-1',
        subsystemName: 'SS1',
      },
    },
  };
}

function makeStore(
  overrides: Partial<GraphDesignerStore> = {},
): GraphDesignerStore {
  return {
    beginMutation: jest.fn(),
    deleteContainerInner: jest.fn().mockResolvedValue(true),
    deleteLinkInner: jest.fn().mockResolvedValue(true),
    deleteModuleInstanceInner: jest.fn().mockResolvedValue(true),
    deleteSubgraphInner: jest.fn().mockResolvedValue(true),
    deleteSubsystemInner: jest.fn().mockResolvedValue(true),
    endMutation: jest.fn(),
    graphData: graphData(),
    isMutating: false,
    mode: 'edit',
    ...overrides,
  } as unknown as GraphDesignerStore;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('multi-select-delete pure helpers', () => {
  it('resolves ancestry across containers, subgraphs, and subsystems', () => {
    const data = graphData();
    expect(isAncestorOf(data, 'cnt-1', 'mod-1')).toBe(true);
    expect(isAncestorOf(data, 'sg-1', 'mod-1')).toBe(true);
    expect(isAncestorOf(data, 'ss-1', 'mod-1')).toBe(true);
    expect(isAncestorOf(data, 'cnt-2', 'mod-1')).toBe(false);
  });

  it('filters selected descendants when their ancestor is selected', () => {
    expect(
      filterCascadeRoots(graphData(), ['cnt-1', 'mod-1', 'mod-3']),
    ).toEqual(['cnt-1', 'mod-3']);
  });

  it('resolves graph-data node kinds', () => {
    const data = graphData();
    expect(resolveNodeKind(data, 'cnt-1')).toBe('container');
    expect(resolveNodeKind(data, 'mod-1')).toBe('module');
    expect(resolveNodeKind(data, 'sg-1')).toBe('subgraph');
    expect(resolveNodeKind(data, 'ss-1')).toBe('subsystem');
  });

  it('filters edges already covered by selected cascade roots', () => {
    expect(
      filterEdgesCoveredByCascade(
        graphData(),
        ['cnt-1'],
        ['link-in-c1', 'link-independent'],
      ),
    ).toEqual(['link-independent']);
  });
});

describe('deleteSelection', () => {
  it('returns silently outside edit mode', async () => {
    const store = makeStore({mode: 'view'});
    await deleteSelection(() => store, ['mod-1'], ['link-independent']);
    expect(store.deleteModuleInstanceInner).not.toHaveBeenCalled();
    expect(store.deleteLinkInner).not.toHaveBeenCalled();
  });

  it('passes suppressToast to inner operations and emits one summary toast', async () => {
    const store = makeStore({
      deleteContainerInner: jest.fn().mockResolvedValue(true),
      deleteLinkInner: jest.fn().mockResolvedValue(false),
    });
    await deleteSelection(() => store, ['cnt-1'], ['link-independent']);
    expect(store.deleteContainerInner).toHaveBeenCalledWith(
      expect.any(Function),
      'cnt-1',
      {suppressToast: true},
    );
    expect(store.deleteLinkInner).toHaveBeenCalledWith(
      expect.any(Function),
      'link-independent',
      'control',
      {suppressToast: true},
    );
    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith(
      '1 of 2 deletions succeeded',
      'warning',
    );
  });
});
