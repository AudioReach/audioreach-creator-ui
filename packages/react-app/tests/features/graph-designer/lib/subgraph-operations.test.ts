/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');
jest.mock('~shared/controls/global-toaster', () => ({
  showToast: jest.fn(),
}));
jest.mock('~entities/usecases', () => ({
  getSubgraphContents: jest.fn(),
  getSubgraphPairs: jest.fn(),
  getSubgraphsByIds: jest.fn(),
  renameSubgraph: jest.fn(),
}));
jest.mock('~entities/spf-modules', () => ({
  deleteSpfModule: jest.fn(),
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
import {getProjectById} from '~entities/project/api/projects-api';
import {deleteSpfModule} from '~entities/spf-modules';
import {
  getSubgraphContents,
  getSubgraphPairs,
  getSubgraphsByIds,
  renameSubgraph,
} from '~entities/usecases';
import {
  createSubgraphOperations,
  parseSubgraphDropPayload,
} from '~features/graph-designer/lib/subgraph-operations';
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
  makeDataLinkDto,
  makeModuleInstance,
  makeSpfModuleDto,
} from '../test-utils/component-dto-fixtures';

const mockGetSubgraphContents = jest.mocked(getSubgraphContents);
const mockGetSubgraphPairs = jest.mocked(getSubgraphPairs);
const mockGetSubgraphsByIds = jest.mocked(getSubgraphsByIds);
const mockDeleteSpfModule = jest.mocked(deleteSpfModule);
const mockRenameSubgraphApi = jest.mocked(renameSubgraph);
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
  mockGetSubgraphContents.mockReset();
  mockGetSubgraphPairs.mockReset();
  mockDeleteSpfModule.mockReset();
  mockRenameSubgraphApi.mockReset();
  mockShowToast.mockClear();
  mockEndSession.mockResolvedValue({message: 'ok', success: true});
  mockStartSession.mockResolvedValue({
    data: {
      projectId: 'proj-sg-ops-1',
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

function makeTestStore(projectId = 'proj-sg-ops-1') {
  const store = createStore<TestStore>((set, get) => ({
    ...createGraphDataSlice(set, get, projectId),
    ...createModuleListSlice(set, get, projectId),
    ...createEditSessionSlice(set, get, projectId),
  }));
  store.setState({graphData: EMPTY_GRAPH_DATA});

  const subgraphOperations = createSubgraphOperations(
    store.setState,
    projectId,
  );
  const get = store.getState as unknown as () => GraphDesignerStore;

  return {get, store, subgraphOperations};
}

async function flushPromises(count = 1): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    await Promise.resolve();
  }
}

describe('parseSubgraphDropPayload', () => {
  it('parses a well-formed subgraph drop payload', () => {
    const payload = JSON.stringify({kind: 'subgraph', subgraphId: 'sg-1'});
    expect(parseSubgraphDropPayload(payload)).toEqual({
      kind: 'subgraph',
      subgraphId: 'sg-1',
    });
  });

  it('returns null for malformed JSON', () => {
    expect(parseSubgraphDropPayload('{not json')).toBeNull();
  });

  it('returns null when kind does not match', () => {
    const payload = JSON.stringify({kind: 'module', subgraphId: 'sg-1'});
    expect(parseSubgraphDropPayload(payload)).toBeNull();
  });
});

describe('createSubgraphOperations — placeSubgraphFromPalette', () => {
  it('merges the snapshot, re-derives containers/subgraphs, and stamps palette-placed provenance', async () => {
    const {get, store, subgraphOperations} = makeTestStore();
    await store.getState().enterEditMode();
    mockGetSubgraphContents.mockResolvedValueOnce({
      data: {
        controlLinks: [],
        dataLinks: [],
        spfModules: [
          makeSpfModuleDto({
            containerId: 10,
            subgraphId: 'sg-1',
            systemId: 'mod-1',
          }),
        ],
      },
      message: 'ok',
      success: true,
    });
    mockGetSubgraphPairs.mockResolvedValueOnce({
      data: [],
      message: 'ok',
      success: true,
    });

    const ok = await subgraphOperations.placeSubgraphFromPalette(get, 'sg-1', {
      x: 5,
      y: 5,
    });

    expect(ok).toBe(true);
    expect(store.getState().graphData!.moduleInstances['mod-1']).toBeDefined();
    expect(
      store.getState().graphData!.moduleInstances['mod-1'].position,
    ).toEqual({x: 5, y: 5});
    expect(store.getState().graphData!.subgraphs['sg-1']).toBeDefined();
    expect(store.getState().subgraphProvenanceById['sg-1']).toBe(
      'palette-placed',
    );
  });

  it('places a subgraph after empty graph data has been initialized', async () => {
    const {get, store, subgraphOperations} = makeTestStore();
    await store.getState().enterEditMode();
    store.getState().initializeEmptyGraphData();
    mockGetSubgraphContents.mockResolvedValueOnce({
      data: {
        controlLinks: [],
        dataLinks: [],
        spfModules: [
          makeSpfModuleDto({
            containerId: 10,
            subgraphId: 'sg-1',
            systemId: 'mod-1',
          }),
        ],
      },
      message: 'ok',
      success: true,
    });
    mockGetSubgraphPairs.mockResolvedValueOnce({
      data: [],
      message: 'ok',
      success: true,
    });

    const ok = await subgraphOperations.placeSubgraphFromPalette(get, 'sg-1', {
      x: 12,
      y: 34,
    });

    expect(ok).toBe(true);
    expect(store.getState().graphDataStatus).toBe('ready');
    expect(store.getState().graphData).toEqual(
      expect.objectContaining({
        selectedUsecases: [],
      }),
    );
    expect(store.getState().graphData!.moduleInstances['mod-1']).toEqual(
      expect.objectContaining({
        position: {x: 12, y: 34},
        subgraphId: 'sg-1',
      }),
    );
    expect(store.getState().graphData!.subgraphs['sg-1']).toBeDefined();
  });

  it('applies the drop position to every newly-fetched module, without clobbering a module already on canvas', async () => {
    const {get, store, subgraphOperations} = makeTestStore();
    await store.getState().enterEditMode();
    store.setState({
      graphData: {
        ...EMPTY_GRAPH_DATA,
        moduleInstances: {
          'mod-1': {
            containerId: 'cnt-1',
            displayName: 'Mod A',
            inputPorts: [],
            moduleId: '200',
            moduleInstanceId: 'mod-1',
            moduleName: 'Mod A',
            moduleType: '',
            outputPorts: [],
            position: {x: 99, y: 99},
            subgraphId: 'sg-1',
          },
        },
      },
    });
    mockGetSubgraphContents.mockResolvedValueOnce({
      data: {
        controlLinks: [],
        dataLinks: [],
        spfModules: [
          makeSpfModuleDto({
            containerId: 10,
            subgraphId: 'sg-1',
            systemId: 'mod-1',
          }),
          makeSpfModuleDto({
            containerId: 10,
            subgraphId: 'sg-1',
            systemId: 'mod-2',
          }),
        ],
      },
      message: 'ok',
      success: true,
    });
    mockGetSubgraphPairs.mockResolvedValueOnce({
      data: [],
      message: 'ok',
      success: true,
    });

    const ok = await subgraphOperations.placeSubgraphFromPalette(get, 'sg-1', {
      x: 120,
      y: 80,
    });

    expect(ok).toBe(true);
    expect(
      store.getState().graphData!.moduleInstances['mod-1'].position,
    ).toEqual({x: 99, y: 99});
    expect(
      store.getState().graphData!.moduleInstances['mod-2'].position,
    ).toEqual({x: 120, y: 80});
  });

  it('toasts and makes no state change on contents-fetch failure', async () => {
    const {get, store, subgraphOperations} = makeTestStore();
    await store.getState().enterEditMode();
    mockGetSubgraphContents.mockResolvedValueOnce({
      message: 'backend rejected the request',
      success: false,
    });

    const ok = await subgraphOperations.placeSubgraphFromPalette(get, 'sg-1', {
      x: 0,
      y: 0,
    });

    expect(ok).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith(
      'backend rejected the request',
      'danger',
    );
    expect(store.getState().graphData!.subgraphs).toEqual({});
  });

  it('rejects a successful but empty contents response without local state changes', async () => {
    const {get, store, subgraphOperations} = makeTestStore();
    await store.getState().enterEditMode();
    mockGetSubgraphContents.mockResolvedValueOnce({
      data: {
        controlLinks: [],
        dataLinks: [],
        spfModules: [],
      },
      message: 'ok',
      success: true,
    });

    const ok = await subgraphOperations.placeSubgraphFromPalette(get, 'sg-1', {
      x: 0,
      y: 0,
    });

    expect(ok).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith(
      'Subgraph has no modules and cannot be placed',
      'danger',
    );
    expect(mockGetSubgraphPairs).not.toHaveBeenCalled();
    expect(store.getState().graphData).toEqual(EMPTY_GRAPH_DATA);
    expect(store.getState().subgraphProvenanceById).toEqual({});
  });

  it('leaves a successful placement intact when pair-link loading fails', async () => {
    const {get, store, subgraphOperations} = makeTestStore();
    await store.getState().enterEditMode();
    mockGetSubgraphContents.mockResolvedValueOnce({
      data: {
        controlLinks: [],
        dataLinks: [],
        spfModules: [makeSpfModuleDto({subgraphId: 'sg-1', systemId: 'mod-1'})],
      },
      message: 'ok',
      success: true,
    });
    mockGetSubgraphPairs.mockResolvedValueOnce({
      message: 'pairs backend is down',
      success: false,
    });

    const ok = await subgraphOperations.placeSubgraphFromPalette(get, 'sg-1', {
      x: 0,
      y: 0,
    });

    expect(ok).toBe(true);
    expect(store.getState().graphData!.moduleInstances['mod-1']).toBeDefined();
    expect(store.getState().graphData!.subgraphs['sg-1']).toBeDefined();
    expect(mockShowToast).toHaveBeenCalledWith(
      'pairs backend is down',
      'danger',
    );
  });

  it('keeps placement pending until pair-link loading settles', async () => {
    const {get, store, subgraphOperations} = makeTestStore();
    await store.getState().enterEditMode();
    mockGetSubgraphContents.mockResolvedValueOnce({
      data: {
        controlLinks: [],
        dataLinks: [],
        spfModules: [makeSpfModuleDto({subgraphId: 'sg-1', systemId: 'mod-1'})],
      },
      message: 'ok',
      success: true,
    });

    let resolvePairs!: (
      value: Awaited<ReturnType<typeof getSubgraphPairs>>,
    ) => void;
    const pairPromise = new Promise<
      Awaited<ReturnType<typeof getSubgraphPairs>>
    >((resolve) => {
      resolvePairs = resolve;
    });
    mockGetSubgraphPairs.mockReturnValueOnce(pairPromise);

    let settled = false;
    const placement = subgraphOperations
      .placeSubgraphFromPalette(get, 'sg-1', {x: 0, y: 0})
      .then((ok) => {
        settled = true;
        return ok;
      });

    await flushPromises(8);

    expect(mockGetSubgraphPairs).toHaveBeenCalledWith('proj-sg-ops-1', 'sg-1');
    expect(settled).toBe(false);

    resolvePairs({data: [], message: 'ok', success: true});

    await expect(placement).resolves.toBe(true);
    expect(settled).toBe(true);
  });

  it('ignores pair-link responses after the placed subgraph is no longer local', async () => {
    const {get, store, subgraphOperations} = makeTestStore();
    await store.getState().enterEditMode();
    store.setState({
      graphData: {
        ...EMPTY_GRAPH_DATA,
        containers: {
          'cnt-2': {
            containerId: 'cnt-2',
            moduleInstances: ['mod-2'],
            subgraphId: 'sg-2',
          },
        },
        moduleInstances: {
          'mod-2': makeModuleInstance({
            containerId: 'cnt-2',
            inputPorts: [
              {
                activeLinks: 0,
                direction: 'input',
                isStatic: false,
                portId: 'port-b',
                portName: 'B',
                portSystemId: 'port-b',
                portType: 'data',
                totalLinksAtPort: 0,
              },
            ],
            moduleInstanceId: 'mod-2',
            subgraphId: 'sg-2',
          }),
        },
        subgraphs: {
          'sg-2': {
            containers: ['cnt-2'],
            subgraphId: 'sg-2',
            subgraphName: 'SG2',
            subgraphType: '',
          },
        },
      },
    });
    mockGetSubgraphContents.mockResolvedValueOnce({
      data: {
        controlLinks: [],
        dataLinks: [],
        spfModules: [makeSpfModuleDto({subgraphId: 'sg-1', systemId: 'mod-1'})],
      },
      message: 'ok',
      success: true,
    });

    let resolvePairs!: (
      value: Awaited<ReturnType<typeof getSubgraphPairs>>,
    ) => void;
    const pairPromise = new Promise<
      Awaited<ReturnType<typeof getSubgraphPairs>>
    >((resolve) => {
      resolvePairs = resolve;
    });
    mockGetSubgraphPairs.mockReturnValueOnce(pairPromise);

    const placement = subgraphOperations.placeSubgraphFromPalette(get, 'sg-1', {
      x: 0,
      y: 0,
    });

    await flushPromises(8);
    store.setState((state) => ({
      graphData: state.graphData && {
        ...state.graphData,
        subgraphs: {
          'sg-2': state.graphData.subgraphs['sg-2'],
        },
      },
    }));

    resolvePairs({
      data: [
        {
          controlLinks: [],
          dataLinks: [
            makeDataLinkDto({
              destinationPortSystemId: 'port-b',
              destinationSystemId: 'mod-2',
              systemId: 'pair-link-stale',
            }),
          ],
          destinationSubgraphSystemId: 'sg-2',
          sourceSubgraphSystemId: 'sg-1',
        },
      ],
      message: 'ok',
      success: true,
    });

    await expect(placement).resolves.toBe(true);
    expect(
      store
        .getState()
        .graphData!.connections.some(
          (connection) => connection.connectionId === 'pair-link-stale',
        ),
    ).toBe(false);
    expect(store.getState().pairLinksById['sg-1:sg-2']).toBeUndefined();
    expect(
      store.getState().graphData!.moduleInstances['mod-2'].inputPorts[0]
        .totalLinksAtPort,
    ).toBe(0);
  });

  it('only merges a pair whose other side is already present on canvas, and adjusts its port count', async () => {
    const {get, store, subgraphOperations} = makeTestStore();
    await store.getState().enterEditMode();
    store.setState({
      graphData: {
        ...EMPTY_GRAPH_DATA,
        containers: {
          'cnt-2': {
            containerId: 'cnt-2',
            moduleInstances: ['mod-2'],
            subgraphId: 'sg-2',
          },
        },
        moduleInstances: {
          'mod-2': {
            containerId: 'cnt-2',
            displayName: 'Mod B',
            inputPorts: [
              {
                activeLinks: 0,
                direction: 'input',
                isStatic: false,
                portId: 'port-b',
                portName: 'B',
                portSystemId: 'port-b',
                portType: 'data',
                totalLinksAtPort: 0,
              },
            ],
            moduleId: '200',
            moduleInstanceId: 'mod-2',
            moduleName: 'Mod B',
            moduleType: '',
            outputPorts: [],
            position: {x: 0, y: 0},
            subgraphId: 'sg-2',
          },
        },
        subgraphs: {
          'sg-2': {
            containers: ['cnt-2'],
            subgraphId: 'sg-2',
            subgraphName: 'SG2',
            subgraphType: '',
          },
        },
      },
    });
    mockGetSubgraphContents.mockResolvedValueOnce({
      data: {
        controlLinks: [],
        dataLinks: [],
        spfModules: [makeSpfModuleDto({subgraphId: 'sg-1', systemId: 'mod-1'})],
      },
      message: 'ok',
      success: true,
    });
    mockGetSubgraphPairs.mockResolvedValueOnce({
      data: [
        {
          controlLinks: [],
          dataLinks: [
            makeDataLinkDto({
              destinationPortSystemId: 'port-b',
              destinationSystemId: 'mod-2',
              systemId: 'pair-link-1',
            }),
          ],
          destinationSubgraphSystemId: 'sg-2',
          sourceSubgraphSystemId: 'sg-1',
        },
        {
          controlLinks: [],
          dataLinks: [makeDataLinkDto({systemId: 'pair-link-2'})],
          destinationSubgraphSystemId: 'sg-3',
          sourceSubgraphSystemId: 'sg-1',
        },
      ],
      message: 'ok',
      success: true,
    });

    await subgraphOperations.placeSubgraphFromPalette(get, 'sg-1', {
      x: 0,
      y: 0,
    });

    const connectionIds = store
      .getState()
      .graphData!.connections.map((c) => c.connectionId);
    expect(connectionIds).toContain('pair-link-1');
    expect(connectionIds).not.toContain('pair-link-2');
    expect(store.getState().pairLinksById['sg-1:sg-2']).toBeDefined();
    expect(
      store.getState().graphData!.moduleInstances['mod-2'].inputPorts[0]
        .totalLinksAtPort,
    ).toBe(1);
  });
});

describe('createSubgraphOperations — excludeLink / reincludeLink', () => {
  it('moves a connection into excludedLinks and back', () => {
    const {get, store, subgraphOperations} = makeTestStore();
    const connection = {
      connectionId: 'conn-1',
      connectionType: 'data' as const,
      fromModuleId: 'mod-1',
      fromPortId: 'port-1',
      isDangling: false,
      toModuleId: 'mod-2',
      toPortId: 'port-2',
    };
    store.setState({
      graphData: {...EMPTY_GRAPH_DATA, connections: [connection]},
    });

    subgraphOperations.excludeLink(get, 'conn-1');
    expect(store.getState().graphData!.connections).toEqual([]);
    expect(store.getState().excludedLinks).toEqual([connection]);
    expect(store.getState().isDirty).toBe(true);

    store.setState({isDirty: false});

    subgraphOperations.reincludeLink(get, 'conn-1');
    expect(store.getState().graphData!.connections).toEqual([connection]);
    expect(store.getState().excludedLinks).toEqual([]);
    expect(store.getState().isDirty).toBe(true);
  });
});

describe('createSubgraphOperations — deleteSubgraph', () => {
  it('removes a palette-placed subgraph from the UI cache only, with no backend call', async () => {
    const {get, store, subgraphOperations} = makeTestStore();
    await store.getState().enterEditMode();
    store.setState({
      graphData: {
        ...EMPTY_GRAPH_DATA,
        containers: {
          'cnt-1': {
            containerId: 'cnt-1',
            moduleInstances: ['mod-1'],
            subgraphId: 'sg-1',
          },
        },
        moduleInstances: {
          'mod-1': {
            containerId: 'cnt-1',
            displayName: 'Mod A',
            inputPorts: [],
            moduleId: '200',
            moduleInstanceId: 'mod-1',
            moduleName: 'Mod A',
            moduleType: '',
            outputPorts: [],
            position: {x: 0, y: 0},
            subgraphId: 'sg-1',
          },
        },
        subgraphs: {
          'sg-1': {
            containers: ['cnt-1'],
            subgraphId: 'sg-1',
            subgraphName: 'SG1',
            subgraphType: '',
          },
        },
      },
      subgraphProvenanceById: {'sg-1': 'palette-placed'},
    });

    const ok = await subgraphOperations.deleteSubgraph(get, 'sg-1');

    expect(ok).toBe(true);
    expect(mockDeleteSpfModule).not.toHaveBeenCalled();
    expect(store.getState().graphData!.subgraphs).toEqual({});
    expect(store.getState().graphData!.moduleInstances).toEqual({});
    expect(store.getState().subgraphProvenanceById).toEqual({});
  });

  it('removes a palette-placed subgraph from the UI cache only even when a child module has diffState', async () => {
    const {get, store, subgraphOperations} = makeTestStore();
    await store.getState().enterEditMode();
    store.setState({
      graphData: {
        ...EMPTY_GRAPH_DATA,
        containers: {
          'cnt-1': {
            containerId: 'cnt-1',
            moduleInstances: ['mod-1'],
            subgraphId: 'sg-1',
          },
        },
        moduleInstances: {
          'mod-1': {
            containerId: 'cnt-1',
            diffState: 'added',
            displayName: 'Mod A',
            inputPorts: [],
            moduleId: '200',
            moduleInstanceId: 'mod-1',
            moduleName: 'Mod A',
            moduleType: '',
            outputPorts: [],
            position: {x: 0, y: 0},
            subgraphId: 'sg-1',
          },
        },
        subgraphs: {
          'sg-1': {
            containers: ['cnt-1'],
            subgraphId: 'sg-1',
            subgraphName: 'SG1',
            subgraphType: '',
          },
        },
      },
      subgraphProvenanceById: {'sg-1': 'palette-placed'},
    });

    const ok = await subgraphOperations.deleteSubgraph(get, 'sg-1');

    expect(ok).toBe(true);
    expect(mockDeleteSpfModule).not.toHaveBeenCalled();
    expect(store.getState().graphData!.subgraphs).toEqual({});
    expect(store.getState().graphData!.containers).toEqual({});
    expect(store.getState().graphData!.moduleInstances).toEqual({});
  });

  it('removes a palette-placed subgraph from the UI cache only even when a child connection has diffState', async () => {
    const {get, store, subgraphOperations} = makeTestStore();
    await store.getState().enterEditMode();
    store.setState({
      graphData: {
        ...EMPTY_GRAPH_DATA,
        connections: [
          {
            connectionId: 'conn-1',
            connectionType: 'data',
            diffState: 'added',
            fromModuleId: 'mod-1',
            fromPortId: 'port-1',
            isDangling: false,
            toModuleId: 'mod-2',
            toPortId: 'port-2',
          },
        ],
        containers: {
          'cnt-1': {
            containerId: 'cnt-1',
            moduleInstances: ['mod-1'],
            subgraphId: 'sg-1',
          },
        },
        moduleInstances: {
          'mod-1': {
            containerId: 'cnt-1',
            displayName: 'Mod A',
            inputPorts: [],
            moduleId: '200',
            moduleInstanceId: 'mod-1',
            moduleName: 'Mod A',
            moduleType: '',
            outputPorts: [],
            position: {x: 0, y: 0},
            subgraphId: 'sg-1',
          },
        },
        subgraphs: {
          'sg-1': {
            containers: ['cnt-1'],
            subgraphId: 'sg-1',
            subgraphName: 'SG1',
            subgraphType: '',
          },
        },
      },
      subgraphProvenanceById: {'sg-1': 'palette-placed'},
    });

    const ok = await subgraphOperations.deleteSubgraph(get, 'sg-1');

    expect(ok).toBe(true);
    expect(mockDeleteSpfModule).not.toHaveBeenCalled();
    expect(store.getState().graphData!.connections).toEqual([]);
    expect(store.getState().graphData!.subgraphs).toEqual({});
    expect(store.getState().graphData!.containers).toEqual({});
    expect(store.getState().graphData!.moduleInstances).toEqual({});
  });

  it('prunes excluded links touching a cache-only removed palette subgraph', async () => {
    const {get, store, subgraphOperations} = makeTestStore();
    await store.getState().enterEditMode();
    const droppedConnection = {
      connectionId: 'excluded-dropped',
      connectionType: 'data' as const,
      fromModuleId: 'mod-1',
      fromPortId: 'port-1',
      isDangling: false,
      toModuleId: 'mod-2',
      toPortId: 'port-2',
    };
    const survivingConnection = {
      connectionId: 'excluded-surviving',
      connectionType: 'data' as const,
      fromModuleId: 'mod-2',
      fromPortId: 'port-2',
      isDangling: false,
      toModuleId: 'mod-3',
      toPortId: 'port-3',
    };
    store.setState({
      excludedLinks: [droppedConnection, survivingConnection],
      graphData: {
        ...EMPTY_GRAPH_DATA,
        containers: {
          'cnt-1': {
            containerId: 'cnt-1',
            moduleInstances: ['mod-1'],
            subgraphId: 'sg-1',
          },
          'cnt-2': {
            containerId: 'cnt-2',
            moduleInstances: ['mod-2'],
            subgraphId: 'sg-2',
          },
        },
        moduleInstances: {
          'mod-1': makeModuleInstance({
            containerId: 'cnt-1',
            moduleInstanceId: 'mod-1',
            subgraphId: 'sg-1',
          }),
          'mod-2': makeModuleInstance({
            containerId: 'cnt-2',
            moduleInstanceId: 'mod-2',
            subgraphId: 'sg-2',
          }),
        },
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
        },
      },
      subgraphProvenanceById: {'sg-1': 'palette-placed'},
    });

    const ok = await subgraphOperations.deleteSubgraph(get, 'sg-1');

    expect(ok).toBe(true);
    expect(mockDeleteSpfModule).not.toHaveBeenCalled();
    expect(store.getState().excludedLinks).toEqual([survivingConnection]);
  });

  it('decrements surviving endpoint port counts for active links removed with a palette subgraph', async () => {
    const {get, store, subgraphOperations} = makeTestStore();
    await store.getState().enterEditMode();
    store.setState({
      graphData: {
        ...EMPTY_GRAPH_DATA,
        connections: [
          {
            connectionId: 'conn-cross-subgraph',
            connectionType: 'data',
            fromModuleId: 'mod-1',
            fromPortId: 'port-1',
            isDangling: false,
            toModuleId: 'mod-2',
            toPortId: 'port-2',
          },
        ],
        containers: {
          'cnt-1': {
            containerId: 'cnt-1',
            moduleInstances: ['mod-1'],
            subgraphId: 'sg-1',
          },
          'cnt-2': {
            containerId: 'cnt-2',
            moduleInstances: ['mod-2'],
            subgraphId: 'sg-2',
          },
        },
        moduleInstances: {
          'mod-1': makeModuleInstance({
            containerId: 'cnt-1',
            moduleInstanceId: 'mod-1',
            subgraphId: 'sg-1',
          }),
          'mod-2': makeModuleInstance({
            containerId: 'cnt-2',
            inputPorts: [
              {
                activeLinks: 1,
                direction: 'input',
                isStatic: false,
                portId: 'port-2',
                portName: 'B',
                portSystemId: 'port-2',
                portType: 'data',
                totalLinksAtPort: 1,
              },
            ],
            moduleInstanceId: 'mod-2',
            subgraphId: 'sg-2',
          }),
        },
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
        },
      },
      subgraphProvenanceById: {'sg-1': 'palette-placed'},
    });

    const ok = await subgraphOperations.deleteSubgraph(get, 'sg-1');

    expect(ok).toBe(true);
    expect(store.getState().graphData!.connections).toEqual([]);
    expect(
      store.getState().graphData!.moduleInstances['mod-2'].inputPorts[0]
        .totalLinksAtPort,
    ).toBe(0);
  });

  it('deletes every module for a pre-loaded subgraph via the real backend loop', async () => {
    const {get, store, subgraphOperations} = makeTestStore();
    await store.getState().enterEditMode();
    store.setState({
      graphData: {
        ...EMPTY_GRAPH_DATA,
        moduleInstances: {
          'mod-1': {
            containerId: 'cnt-1',
            displayName: 'Mod A',
            inputPorts: [],
            moduleId: '200',
            moduleInstanceId: 'mod-1',
            moduleName: 'Mod A',
            moduleType: '',
            outputPorts: [],
            position: {x: 0, y: 0},
            subgraphId: 'sg-1',
          },
        },
      },
      subgraphProvenanceById: {'sg-1': 'pre-loaded'},
    });
    mockDeleteSpfModule.mockResolvedValueOnce({
      data: {
        deleted: {
          controlLinks: [],
          dataLinks: [],
          spfModules: ['mod-1'],
        },
      },
      message: 'ok',
      success: true,
    });

    const ok = await subgraphOperations.deleteSubgraph(get, 'sg-1');

    expect(ok).toBe(true);
    expect(store.getState().graphData!.moduleInstances).toEqual({});
  });

  it('stops and toasts on the first failed module delete, leaving earlier deletes applied', async () => {
    const {get, store, subgraphOperations} = makeTestStore();
    await store.getState().enterEditMode();
    store.setState({
      graphData: {
        ...EMPTY_GRAPH_DATA,
        moduleInstances: {
          'mod-1': {
            containerId: 'cnt-1',
            displayName: 'Mod A',
            inputPorts: [],
            moduleId: '200',
            moduleInstanceId: 'mod-1',
            moduleName: 'Mod A',
            moduleType: '',
            outputPorts: [],
            position: {x: 0, y: 0},
            subgraphId: 'sg-1',
          },
          'mod-2': {
            containerId: 'cnt-1',
            displayName: 'Mod B',
            inputPorts: [],
            moduleId: '200',
            moduleInstanceId: 'mod-2',
            moduleName: 'Mod B',
            moduleType: '',
            outputPorts: [],
            position: {x: 0, y: 0},
            subgraphId: 'sg-1',
          },
        },
      },
      subgraphProvenanceById: {'sg-1': 'pre-loaded'},
    });
    mockDeleteSpfModule
      .mockResolvedValueOnce({
        data: {
          deleted: {
            controlLinks: [],
            dataLinks: [],
            spfModules: ['mod-1'],
          },
        },
        message: 'ok',
        success: true,
      })
      .mockResolvedValueOnce({message: 'boom', success: false});

    const ok = await subgraphOperations.deleteSubgraph(get, 'sg-1');

    expect(ok).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith('boom', 'danger');
    expect(
      store.getState().graphData!.moduleInstances['mod-1'],
    ).toBeUndefined();
    expect(store.getState().graphData!.moduleInstances['mod-2']).toBeDefined();
  });
});

describe('createSubgraphOperations — renameSubgraph', () => {
  it('writes only subgraphName, leaving other fields unchanged', async () => {
    const {get, store, subgraphOperations} = makeTestStore();
    await store.getState().enterEditMode();
    store.setState({
      graphData: {
        ...EMPTY_GRAPH_DATA,
        subgraphs: {
          'sg-1': {
            containers: ['cnt-1'],
            subgraphId: 'sg-1',
            subgraphName: 'Old',
            subgraphType: 'A',
          },
        },
      },
    });
    mockRenameSubgraphApi.mockResolvedValueOnce({
      data: {
        id: 1,
        name: 'New',
        relatedEndPointLinks: [],
        SGKV: [],
        subGraphSharedType: 'A',
        systemId: 'sg-1',
      },
      message: 'ok',
      success: true,
    });

    await subgraphOperations.renameSubgraph(get, 'sg-1', 'New');

    const subgraph = store.getState().graphData!.subgraphs['sg-1'];
    expect(subgraph.subgraphName).toBe('New');
    expect(subgraph.subgraphType).toBe('A');
    expect(subgraph.containers).toEqual(['cnt-1']);
    expect(store.getState().isDirty).toBe(true);
  });

  it('toasts and leaves subgraphName unchanged on failure', async () => {
    const {get, store, subgraphOperations} = makeTestStore();
    await store.getState().enterEditMode();
    store.setState({
      graphData: {
        ...EMPTY_GRAPH_DATA,
        subgraphs: {
          'sg-1': {
            containers: [],
            subgraphId: 'sg-1',
            subgraphName: 'Old',
            subgraphType: '',
          },
        },
      },
    });
    mockRenameSubgraphApi.mockResolvedValueOnce({
      message: 'backend rejected the rename',
      success: false,
    });

    await subgraphOperations.renameSubgraph(get, 'sg-1', 'New');

    expect(mockShowToast).toHaveBeenCalledWith(
      'backend rejected the rename',
      'danger',
    );
    expect(store.getState().graphData!.subgraphs['sg-1'].subgraphName).toBe(
      'Old',
    );
    expect(store.getState().isDirty).toBe(false);
  });

  it('ignores a rename response whose systemId does not match the requested subgraph', async () => {
    const {get, store, subgraphOperations} = makeTestStore();
    await store.getState().enterEditMode();
    store.setState({
      graphData: {
        ...EMPTY_GRAPH_DATA,
        subgraphs: {
          'sg-1': {
            containers: ['cnt-1'],
            subgraphId: 'sg-1',
            subgraphName: 'Old',
            subgraphType: '',
          },
        },
      },
    });
    mockRenameSubgraphApi.mockResolvedValueOnce({
      data: {
        id: 2,
        name: 'Wrong Subgraph',
        relatedEndPointLinks: [],
        SGKV: [],
        subGraphSharedType: '',
        systemId: 'sg-2',
      },
      message: 'ok',
      success: true,
    });

    await subgraphOperations.renameSubgraph(get, 'sg-1', 'New');

    expect(store.getState().graphData!.subgraphs['sg-1'].subgraphName).toBe(
      'Old',
    );
    expect(store.getState().graphData!.subgraphs['sg-2']).toBeUndefined();
    expect(store.getState().isDirty).toBe(false);
  });

  it('ignores a rename response when the requested subgraph is no longer local', async () => {
    const {get, store, subgraphOperations} = makeTestStore();
    await store.getState().enterEditMode();
    store.setState({graphData: EMPTY_GRAPH_DATA});
    mockRenameSubgraphApi.mockResolvedValueOnce({
      data: {
        id: 1,
        name: 'New',
        relatedEndPointLinks: [],
        SGKV: [],
        subGraphSharedType: '',
        systemId: 'sg-1',
      },
      message: 'ok',
      success: true,
    });

    await subgraphOperations.renameSubgraph(get, 'sg-1', 'New');

    expect(store.getState().graphData!.subgraphs).toEqual({});
    expect(store.getState().isDirty).toBe(false);
  });
});
