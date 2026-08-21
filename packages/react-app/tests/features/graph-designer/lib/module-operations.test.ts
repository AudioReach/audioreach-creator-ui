/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');
jest.mock('~shared/controls/global-toaster', () => ({
  showToast: jest.fn(),
}));
jest.mock('~entities/usecases', () => ({
  getSubgraphsByIds: jest.fn(),
}));
jest.mock('~entities/spf-modules', () => ({
  createSpfModule: jest.fn(),
  deleteSpfModule: jest.fn(),
  patchSpfModule: jest.fn(),
}));
jest.mock('~entities/edit-session', () => ({
  endSession: jest.fn(),
  startSession: jest.fn(),
}));
jest.mock('~entities/project/api/projects-api', () => ({
  getProjectById: jest.fn(),
}));
jest.mock('~shared/store/project-store-registry', () => ({
  projectStoreRegistry: {
    get: jest.fn(() => ({
      getState: () => ({
        releaseExclusiveMode: jest.fn(),
        setActiveExclusiveMode: jest.fn(() => true),
        setEditModeState: jest.fn(),
      }),
    })),
  },
}));

import {createStore} from 'zustand';

import {endSession, startSession} from '~entities/edit-session';
import {type AnyNode, NODE_KIND} from '~entities/graph';
import {getProjectById} from '~entities/project/api/projects-api';
import {
  createSpfModule,
  deleteSpfModule,
  patchSpfModule,
} from '~entities/spf-modules';
import {getSubgraphsByIds} from '~entities/usecases';
import {
  createModuleOperations,
  parseModuleDropPayload,
  resolveModuleDropTarget,
} from '~features/graph-designer/lib/module-operations';
import {
  createEditSessionSlice,
  type EditSessionSlice,
} from '~features/graph-designer/model/edit-session-slice';
import {
  createGraphDataSlice,
  type GraphDataSlice,
} from '~features/graph-designer/model/graph-data-slice';
import type {GraphDesignerStore} from '~features/graph-designer/model/graph-designer-store';
import {
  createModuleListSlice,
  type ModuleListSlice,
} from '~features/graph-designer/model/module-list-slice';
import {showToast} from '~shared/controls/global-toaster';

import {
  makeModuleInstance,
  makeSpfModuleDto,
} from '../test-utils/component-dto-fixtures';

const mockCreateSpfModule = jest.mocked(createSpfModule);
const mockDeleteSpfModule = jest.mocked(deleteSpfModule);
const mockGetSubgraphsByIds = jest.mocked(getSubgraphsByIds);
const mockPatchSpfModule = jest.mocked(patchSpfModule);
const mockShowToast = jest.mocked(showToast);
const mockEndSession = jest.mocked(endSession);
const mockStartSession = jest.mocked(startSession);
const mockGetProjectById = jest.mocked(getProjectById);

beforeEach(() => {
  mockGetSubgraphsByIds.mockResolvedValue({
    data: [],
    message: undefined as never,
    success: true,
  });
  mockEndSession.mockResolvedValue({message: 'ok', success: true});
  mockStartSession.mockResolvedValue({
    data: {
      projectId: 'proj-mod-ops-1',
      sessionMode: 'DESIGNER',
      summary: 'ok',
    },
    message: 'ok',
    success: true,
  });
  mockGetProjectById.mockReset();
});

type TestStore = GraphDataSlice & ModuleListSlice & EditSessionSlice;

const EMPTY_GRAPH_DATA: TestStore['graphData'] = {
  connections: [],
  containers: {},
  moduleInstances: {},
  selectedUsecases: [],
  subgraphs: {},
  subsystems: {},
};

function makeTestStore(projectId = 'proj-mod-ops-1') {
  const store = createStore<TestStore>((set, get) => ({
    ...createGraphDataSlice(set, get, projectId),
    ...createModuleListSlice(set, get, projectId),
    ...createEditSessionSlice(set, get, projectId),
  }));
  store.setState({graphData: EMPTY_GRAPH_DATA});

  const moduleOperations = createModuleOperations(store.setState, projectId);
  const get = store.getState as unknown as () => GraphDesignerStore;

  return {get, moduleOperations, store};
}

function baseNode(overrides: Partial<AnyNode>): AnyNode {
  return {
    height: 10,
    id: 'node-1',
    label: 'Node',
    width: 10,
    x: 0,
    y: 0,
    ...overrides,
  } as AnyNode;
}

describe('resolveModuleDropTarget', () => {
  it('resolves the empty-canvas sentinel', () => {
    expect(resolveModuleDropTarget('empty-canvas')).toEqual({
      kind: 'empty-canvas',
    });
  });

  it('resolves a container target to its containerId', () => {
    const target = baseNode({containerId: 42, nodeKind: NODE_KIND.CONTAINER});
    expect(resolveModuleDropTarget(target)).toEqual({
      containerId: '42',
      kind: 'container',
    });
  });

  it('resolves a subgraph target to subgraph-no-container', () => {
    const target = baseNode({nodeKind: NODE_KIND.SUBGRAPH, subgraphId: 7});
    expect(resolveModuleDropTarget(target)).toEqual({
      kind: 'subgraph-no-container',
      subgraphId: '7',
    });
  });

  it('resolves a module target to its parent container', () => {
    const target = baseNode({
      moduleId: 1,
      moduleType: 'SOURCE',
      nodeKind: NODE_KIND.MODULE,
      parentId: 'container-9',
      ports: [],
    });
    expect(resolveModuleDropTarget(target)).toEqual({
      containerId: 'container-9',
      kind: 'container',
    });
  });

  it('throws when a module target has no parentId', () => {
    const target = baseNode({
      moduleId: 1,
      moduleType: 'SOURCE',
      nodeKind: NODE_KIND.MODULE,
      ports: [],
    });
    expect(() => resolveModuleDropTarget(target)).toThrow(/has no parentId/);
  });

  it('rejects a subgraph-proxy target', () => {
    const target = baseNode({
      nodeKind: NODE_KIND.SUBGRAPH_PROXY,
      ports: [],
      subgraphId: 1,
    });
    expect(resolveModuleDropTarget(target)).toEqual({kind: 'rejected'});
  });

  it('rejects a subsystem target', () => {
    const target = baseNode({
      nodeKind: NODE_KIND.SUBSYSTEM,
      ports: [],
      subsystemId: 'ss-1',
    });
    expect(resolveModuleDropTarget(target)).toEqual({kind: 'rejected'});
  });
});

describe('parseModuleDropPayload', () => {
  it('parses a well-formed module drop payload', () => {
    const payload = JSON.stringify({
      kind: 'module',
      moduleDefinitionSystemId: 'mod-def-200',
      processorSystemId: '5',
    });
    expect(parseModuleDropPayload(payload)).toEqual({
      kind: 'module',
      moduleDefinitionSystemId: 'mod-def-200',
      processorSystemId: '5',
    });
  });

  it('returns null for malformed JSON', () => {
    expect(parseModuleDropPayload('{not json')).toBeNull();
  });

  it('returns null when kind does not match', () => {
    const payload = JSON.stringify({
      kind: 'subgraph',
      moduleDefinitionSystemId: 'mod-def-200',
      processorSystemId: '5',
    });
    expect(parseModuleDropPayload(payload)).toBeNull();
  });
});

describe('createModuleOperations — addModuleToEmptyCanvas', () => {
  beforeEach(() => {
    mockCreateSpfModule.mockReset();
    mockShowToast.mockClear();
  });

  it('creates the module, writes the drop position, and stamps newly-created provenance', async () => {
    const {get, moduleOperations, store} = makeTestStore();
    await store.getState().enterEditMode();

    mockCreateSpfModule.mockResolvedValueOnce({
      data: makeSpfModuleDto({
        containerId: 10,
        subgraphId: '5',
        systemId: 'sys-mod-1',
      }),
      message: 'ok',
      success: true,
    });

    const result = await moduleOperations.addModuleToEmptyCanvas(
      get,
      '200',
      {x: 33, y: 44},
      '7',
    );

    expect(result).toBe('sys-mod-1');
    expect(mockCreateSpfModule).toHaveBeenCalledWith('proj-mod-ops-1', {
      moduleDefinitionSystemId: '200',
      processorSystemId: '7',
    });

    const instance = store.getState().graphData!.moduleInstances['sys-mod-1'];
    expect(instance.position).toEqual({x: 33, y: 44});
    expect(store.getState().subgraphProvenanceById['5']).toBe('newly-created');
    expect(store.getState().isDirty).toBe(true);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('toasts and makes no state change on failure', async () => {
    const {get, moduleOperations, store} = makeTestStore();
    await store.getState().enterEditMode();

    mockCreateSpfModule.mockResolvedValueOnce({
      message: 'backend rejected the request',
      success: false,
    });

    const result = await moduleOperations.addModuleToEmptyCanvas(
      get,
      '200',
      {x: 33, y: 44},
      '7',
    );

    expect(result).toBeNull();
    expect(mockShowToast).toHaveBeenCalledWith(
      'backend rejected the request',
      'danger',
    );
    expect(store.getState().graphData!.moduleInstances).toEqual({});
    expect(store.getState().subgraphProvenanceById).toEqual({});
  });
});

describe('createModuleOperations — addModuleToContainer', () => {
  beforeEach(() => {
    mockCreateSpfModule.mockReset();
    mockShowToast.mockClear();
  });

  it('sends containerSystemId and does not stamp subgraph provenance', async () => {
    const {get, moduleOperations, store} = makeTestStore();
    await store.getState().enterEditMode();

    mockCreateSpfModule.mockResolvedValueOnce({
      data: makeSpfModuleDto({
        containerId: 10,
        subgraphId: '5',
        systemId: 'sys-mod-2',
      }),
      message: 'ok',
      success: true,
    });

    const result = await moduleOperations.addModuleToContainer(
      get,
      '10',
      '5',
      '200',
      {x: 1, y: 2},
      '7',
    );

    expect(result).toBe('sys-mod-2');
    expect(mockCreateSpfModule).toHaveBeenCalledWith('proj-mod-ops-1', {
      containerSystemId: '10',
      moduleDefinitionSystemId: '200',
      processorSystemId: '7',
      subgraphSystemId: '5',
    });
    expect(store.getState().subgraphProvenanceById).toEqual({});
  });
});

describe('createModuleOperations — addModuleToSubgraphNoContainer', () => {
  beforeEach(() => {
    mockCreateSpfModule.mockReset();
    mockShowToast.mockClear();
  });

  it('sends subgraphSystemId and does not stamp subgraph provenance', async () => {
    const {get, moduleOperations, store} = makeTestStore();
    await store.getState().enterEditMode();

    mockCreateSpfModule.mockResolvedValueOnce({
      data: makeSpfModuleDto({
        containerId: 20,
        subgraphId: '5',
        systemId: 'sys-mod-3',
      }),
      message: 'ok',
      success: true,
    });

    const result = await moduleOperations.addModuleToSubgraphNoContainer(
      get,
      '5',
      '200',
      {x: 1, y: 2},
      '7',
    );

    expect(result).toBe('sys-mod-3');
    expect(mockCreateSpfModule).toHaveBeenCalledWith('proj-mod-ops-1', {
      moduleDefinitionSystemId: '200',
      processorSystemId: '7',
      subgraphSystemId: '5',
    });
    expect(store.getState().subgraphProvenanceById).toEqual({});
  });
});

describe('createModuleOperations — delete', () => {
  beforeEach(() => {
    mockDeleteSpfModule.mockReset();
    mockShowToast.mockClear();
  });

  it('deleteModuleInstance removes the module via applyComponentCollection on success', async () => {
    const {get, moduleOperations, store} = makeTestStore();
    await store.getState().enterEditMode();
    store.setState({
      graphData: {
        ...EMPTY_GRAPH_DATA,
        moduleInstances: {
          'sys-mod-1': makeModuleInstance(),
        },
      },
    });

    mockDeleteSpfModule.mockResolvedValueOnce({
      data: {
        deleted: {
          containers: [],
          controlLinks: [],
          dataLinks: [],
          spfModules: ['sys-mod-1'],
          subgraphs: [],
        },
      },
      message: 'ok',
      success: true,
    });

    const result = await moduleOperations.deleteModuleInstance(
      get,
      'sys-mod-1',
    );

    expect(result).toBe(true);
    expect(
      store.getState().graphData!.moduleInstances['sys-mod-1'],
    ).toBeUndefined();
  });

  it('marks the session dirty and prunes session-local maps for a subgraph the backend reports as deleted', async () => {
    const {get, moduleOperations, store} = makeTestStore();
    await store.getState().enterEditMode();
    store.setState({
      graphData: {
        ...EMPTY_GRAPH_DATA,
        moduleInstances: {
          'sys-mod-1': makeModuleInstance({subgraphId: '1'}),
        },
      },
      kvSelectionsById: {
        '1': [{keyValuePairs: [], selected: true, systemId: 'kv-1'}],
      },
      subgraphProvenanceById: {'1': 'pre-loaded'},
    });

    mockDeleteSpfModule.mockResolvedValueOnce({
      data: {
        deleted: {
          containers: ['10'],
          controlLinks: [],
          dataLinks: [],
          spfModules: ['sys-mod-1'],
          subgraphs: ['1'],
        },
      },
      message: 'ok',
      success: true,
    });

    const result = await moduleOperations.deleteModuleInstance(
      get,
      'sys-mod-1',
    );

    expect(result).toBe(true);
    expect(store.getState().isDirty).toBe(true);
    expect(store.getState().subgraphProvenanceById).toEqual({});
    expect(store.getState().kvSelectionsById).toEqual({});
  });

  it('deleteModuleInstanceInner with suppressToast does not call showToast on failure', async () => {
    const {get, moduleOperations} = makeTestStore();

    mockDeleteSpfModule.mockResolvedValueOnce({
      message: 'backend error',
      success: false,
    });

    const result = await moduleOperations.deleteModuleInstanceInner(
      get,
      'sys-mod-1',
      {suppressToast: true},
    );

    expect(result).toBe(false);
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});

describe('createModuleOperations — renameModuleInstance', () => {
  beforeEach(() => {
    mockPatchSpfModule.mockReset();
    mockShowToast.mockClear();
  });

  it('writes only displayName, leaving position and moduleType unchanged', async () => {
    const {get, moduleOperations, store} = makeTestStore();
    await store.getState().enterEditMode();
    store.setState({
      graphData: {
        ...EMPTY_GRAPH_DATA,
        moduleInstances: {
          'sys-mod-1': makeModuleInstance({
            displayName: 'Old Name',
            moduleType: 'SOURCE',
            position: {x: 5, y: 6},
          }),
        },
      },
    });

    mockPatchSpfModule.mockResolvedValueOnce({
      data: makeSpfModuleDto({alias: 'New Name', systemId: 'sys-mod-1'}),
      message: 'ok',
      success: true,
    });

    await moduleOperations.renameModuleInstance(get, 'sys-mod-1', 'New Name');

    const instance = store.getState().graphData!.moduleInstances['sys-mod-1'];
    expect(instance.displayName).toBe('New Name');
    expect(instance.position).toEqual({x: 5, y: 6});
    expect(instance.moduleType).toBe('SOURCE');
    expect(store.getState().isDirty).toBe(true);
  });

  it('toasts and leaves displayName unchanged on failure', async () => {
    const {get, moduleOperations, store} = makeTestStore();
    await store.getState().enterEditMode();
    store.setState({
      graphData: {
        ...EMPTY_GRAPH_DATA,
        moduleInstances: {
          'sys-mod-1': makeModuleInstance({
            displayName: 'Old Name',
            moduleType: 'SOURCE',
            position: {x: 5, y: 6},
          }),
        },
      },
    });

    mockPatchSpfModule.mockResolvedValueOnce({
      message: 'backend rejected the rename',
      success: false,
    });

    await moduleOperations.renameModuleInstance(get, 'sys-mod-1', 'New Name');

    expect(mockShowToast).toHaveBeenCalledWith(
      'backend rejected the rename',
      'danger',
    );
    const instance = store.getState().graphData!.moduleInstances['sys-mod-1'];
    expect(instance.displayName).toBe('Old Name');
  });

  it('skips the state write and does not mark dirty when the local module instance no longer exists', async () => {
    const {get, moduleOperations, store} = makeTestStore();
    await store.getState().enterEditMode();
    store.setState({graphData: EMPTY_GRAPH_DATA});

    mockPatchSpfModule.mockResolvedValueOnce({
      data: makeSpfModuleDto({alias: 'New Name', systemId: 'sys-mod-1'}),
      message: 'ok',
      success: true,
    });

    await moduleOperations.renameModuleInstance(get, 'sys-mod-1', 'New Name');

    expect(store.getState().graphData!.moduleInstances).toEqual({});
    expect(store.getState().isDirty).toBe(false);
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});
