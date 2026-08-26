/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');
jest.mock('~shared/controls/global-toaster', () => ({
  showToast: jest.fn(),
}));
jest.mock('~entities/subsystems', () => ({
  createSubsystem: jest.fn(),
  deleteSubsystem: jest.fn(),
  moveSubsystemComponents: jest.fn(),
  patchSubsystem: jest.fn(),
}));
jest.mock('~entities/usecases', () => ({
  getSubgraphsByIds: jest.fn(),
  getUsecaseComponents: jest.fn(),
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

import {createStore, type StoreApi} from 'zustand';

import {endSession, startSession} from '~entities/edit-session';
import {
  createSubsystem,
  deleteSubsystem as deleteSubsystemApi,
  moveSubsystemComponents,
  patchSubsystem,
  type NormalizedMoveSubsystemComponentsResponseDto,
} from '~entities/subsystems';
import {
  canMoveToSubsystem,
  createSubsystemOperations,
} from '~features/graph-designer/lib/subsystem-operations';
import {
  createEditSessionSlice,
  type EditSessionSlice,
} from '~features/graph-designer/model/edit-session-slice';
import {
  createGraphDataSlice,
  type GraphDataSlice,
  type ModuleInstance,
  type Subgraph,
  type Subsystem,
} from '~features/graph-designer/model/graph-data-slice';
import type {GraphDesignerStore} from '~features/graph-designer/model/graph-designer-store';
import {
  createModuleListSlice,
  type ModuleListSlice,
} from '~features/graph-designer/model/module-list-slice';
import {showToast} from '~shared/controls/global-toaster';

import {makeDataLinkDto} from '../test-utils/component-dto-fixtures';

const mockCreateSubsystem = jest.mocked(createSubsystem);
const mockDeleteSubsystemApi = jest.mocked(deleteSubsystemApi);
const mockMoveSubsystemComponents = jest.mocked(moveSubsystemComponents);
const mockPatchSubsystem = jest.mocked(patchSubsystem);
const mockShowToast = jest.mocked(showToast);
const mockEndSession = jest.mocked(endSession);
const mockStartSession = jest.mocked(startSession);

type TestStore = GraphDataSlice & ModuleListSlice & EditSessionSlice;

const EMPTY_MOVE_RESPONSE: NormalizedMoveSubsystemComponentsResponseDto = {
  addedControlLinks: [],
  addedDataLinks: [],
  removedControlLinks: [],
  removedDataLinks: [],
  subsystemPortChanges: [],
  updatedModules: [],
  updatedSubsystems: [],
};

function moveResponseWithModules(
  moduleSystemIds: string[],
  parentSystemId?: string,
): NormalizedMoveSubsystemComponentsResponseDto {
  return {
    ...EMPTY_MOVE_RESPONSE,
    updatedModules: moduleSystemIds.map((systemId) => ({
      parentSystemId,
      systemId,
    })),
  };
}

function makeSubgraphModule(
  moduleInstanceId = 'mod-1',
  subgraphId = 'sg-1',
): ModuleInstance {
  return makeModuleInstance({moduleInstanceId, subgraphId});
}

function moveResponseWithSubsystems(
  subsystemSystemIds: string[],
  parentSystemId?: string,
): NormalizedMoveSubsystemComponentsResponseDto {
  return {
    ...EMPTY_MOVE_RESPONSE,
    updatedSubsystems: subsystemSystemIds.map((systemId) => ({
      parentSystemId,
      systemId,
    })),
  };
}

function makeEmptyGraphData(): TestStore['graphData'] {
  return {
    connections: [],
    containers: {},
    moduleInstances: {},
    selectedUsecases: [],
    subgraphs: {},
    subsystems: {},
  };
}

function makeSubgraph(overrides: Partial<Subgraph> = {}): Subgraph {
  return {
    containers: [],
    subgraphId: 'sg-1',
    subgraphName: 'Subgraph 1',
    subgraphType: '',
    ...overrides,
  };
}

function makeModuleInstance(
  overrides: Partial<ModuleInstance> = {},
): ModuleInstance {
  return {
    containerId: 'container-1',
    displayName: 'Module',
    inputPorts: [],
    moduleId: 'module-def-1',
    moduleInstanceId: 'mod-1',
    moduleName: 'Module',
    moduleType: '',
    outputPorts: [],
    position: {x: 0, y: 0},
    subgraphId: 'sg-1',
    ...overrides,
  };
}

function makeSubsystem(overrides: Partial<Subsystem> = {}): Subsystem {
  return {
    childSubsystemIds: [],
    controlPorts: [],
    dataPorts: [],
    subgraphs: [],
    subsystemId: 'ss-1',
    subsystemName: 'SS1',
    ...overrides,
  };
}

function makeTestStore(projectId = 'proj-ss-ops-1') {
  const store = createStore<TestStore>((set, get) => ({
    ...createGraphDataSlice(set, get, projectId),
    ...createModuleListSlice(set, get, projectId),
    ...createEditSessionSlice(set, get, projectId),
  }));
  store.setState({graphData: makeEmptyGraphData()});

  const subsystemOperations = createSubsystemOperations(
    store.setState,
    projectId,
  );
  const get = store.getState as unknown as () => GraphDesignerStore;

  return {get, store, subsystemOperations};
}

async function enterEditMode(store: StoreApi<TestStore>): Promise<void> {
  const entered = await store.getState().enterEditMode();
  expect(entered).toBe(true);
}

beforeEach(() => {
  mockCreateSubsystem.mockReset();
  mockDeleteSubsystemApi.mockReset();
  mockMoveSubsystemComponents.mockReset();
  mockPatchSubsystem.mockReset();
  mockShowToast.mockClear();
  mockEndSession.mockResolvedValue({message: 'ok', success: true});
  mockStartSession.mockResolvedValue({
    data: {
      projectId: 'proj-ss-ops-1',
      sessionMode: 'DESIGNER',
      summary: 'ok',
    },
    message: 'ok',
    success: true,
  });
});

describe('canMoveToSubsystem', () => {
  it('rejects moving a subsystem into itself', () => {
    expect(canMoveToSubsystem('ss-1', 'ss-1')).toBe(false);
  });

  it('allows moving a different node into a subsystem', () => {
    expect(canMoveToSubsystem('sg-1', 'ss-1')).toBe(true);
    expect(canMoveToSubsystem('ss-2', 'ss-1')).toBe(true);
  });
});

describe('createSubsystemOperations - moveToSubsystem existing destination', () => {
  it('moves a subgraph into the destination subsystem', async () => {
    const {get, store, subsystemOperations} = makeTestStore();
    store.setState({
      graphData: {
        ...makeEmptyGraphData(),
        moduleInstances: {'mod-1': makeSubgraphModule()},
        subgraphs: {'sg-1': makeSubgraph()},
        subsystems: {'ss-1': makeSubsystem()},
      },
    });
    await enterEditMode(store);
    mockMoveSubsystemComponents.mockResolvedValueOnce({
      data: moveResponseWithModules(['mod-1'], 'ss-1'),
      message: 'ok',
      success: true,
    });

    const ok = await subsystemOperations.moveToSubsystem(get, 'sg-1', {
      subsystemId: 'ss-1',
    });

    expect(ok).toBe(true);
    expect(mockMoveSubsystemComponents).toHaveBeenCalledWith('proj-ss-ops-1', {
      subgraphSystemIds: ['sg-1'],
      targetSubsystemSystemId: 'ss-1',
    });
    expect(store.getState().graphData!.subsystems['ss-1'].subgraphs).toEqual([
      'sg-1',
    ]);
    expect(store.getState().isDirty).toBe(true);
  });

  it('does not move request ids that are absent from the response', async () => {
    const {get, store, subsystemOperations} = makeTestStore();
    store.setState({
      graphData: {
        ...makeEmptyGraphData(),
        moduleInstances: {'mod-1': makeSubgraphModule()},
        subgraphs: {
          'sg-1': makeSubgraph({subgraphId: 'sg-1'}),
          'sg-2': makeSubgraph({subgraphId: 'sg-2'}),
        },
        subsystems: {
          'ss-1': makeSubsystem(),
          'ss-source': makeSubsystem({
            subgraphs: ['sg-1', 'sg-2'],
            subsystemId: 'ss-source',
            subsystemName: 'Source',
          }),
        },
      },
    });
    await enterEditMode(store);
    mockMoveSubsystemComponents.mockResolvedValueOnce({
      data: moveResponseWithModules(['mod-1'], 'ss-1'),
      message: 'partial',
      success: true,
      warnings: ['sg-2 was not moved'],
    });

    const ok = await subsystemOperations.moveToSubsystem(get, 'sg-2', {
      subsystemId: 'ss-1',
    });

    expect(ok).toBe(true);
    expect(store.getState().graphData!.subsystems['ss-1'].subgraphs).toEqual(
      [],
    );
    expect(
      store.getState().graphData!.subsystems['ss-source'].subgraphs,
    ).toEqual(['sg-1', 'sg-2']);
  });

  it('rejects a self-nesting move without calling the backend', async () => {
    const {get, store, subsystemOperations} = makeTestStore();
    await enterEditMode(store);

    const ok = await subsystemOperations.moveToSubsystem(get, 'ss-1', {
      subsystemId: 'ss-1',
    });

    expect(ok).toBe(false);
    expect(mockMoveSubsystemComponents).not.toHaveBeenCalled();
  });
});

describe('createSubsystemOperations - moveToSubsystem new destination', () => {
  it('creates the subsystem then moves the node in', async () => {
    const {get, store, subsystemOperations} = makeTestStore();
    store.setState({
      graphData: {
        ...makeEmptyGraphData(),
        moduleInstances: {'mod-1': makeSubgraphModule()},
        subgraphs: {'sg-1': makeSubgraph()},
      },
    });
    await enterEditMode(store);
    mockCreateSubsystem.mockResolvedValueOnce({
      data: {
        name: 'New SS',
        naturalId: 101,
        systemId: 'ss-new',
      },
      message: 'ok',
      success: true,
    });
    mockMoveSubsystemComponents.mockResolvedValueOnce({
      data: moveResponseWithModules(['mod-1'], 'ss-new'),
      message: 'ok',
      success: true,
    });

    const ok = await subsystemOperations.moveToSubsystem(get, 'sg-1', {
      createNew: true,
      name: 'New SS',
    });

    expect(ok).toBe(true);
    expect(mockCreateSubsystem).toHaveBeenCalledWith('proj-ss-ops-1', {
      name: 'New SS',
    });
    expect(mockMoveSubsystemComponents).toHaveBeenCalledWith('proj-ss-ops-1', {
      subgraphSystemIds: ['sg-1'],
      targetSubsystemSystemId: 'ss-new',
    });
    expect(store.getState().graphData!.subsystems['ss-new']).toBeDefined();
  });

  it('leaves the created subsystem when the follow-up move fails', async () => {
    const {get, store, subsystemOperations} = makeTestStore();
    store.setState({
      graphData: {
        ...makeEmptyGraphData(),
        moduleInstances: {'mod-1': makeSubgraphModule()},
        subgraphs: {'sg-1': makeSubgraph()},
      },
    });
    await enterEditMode(store);
    mockCreateSubsystem.mockResolvedValueOnce({
      data: {
        name: 'New SS',
        naturalId: 101,
        systemId: 'ss-new',
      },
      message: 'ok',
      success: true,
    });
    mockMoveSubsystemComponents.mockResolvedValueOnce({
      message: 'boom',
      success: false,
    });

    const ok = await subsystemOperations.moveToSubsystem(get, 'sg-1', {
      createNew: true,
      name: 'New SS',
    });

    expect(ok).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith('boom', 'danger');
    expect(store.getState().graphData!.subsystems['ss-new']).toBeDefined();
    expect(store.getState().isDirty).toBe(true);
  });
});

describe('createSubsystemOperations - removeFromSubsystem', () => {
  it('moves the node to the source subsystem parent', async () => {
    const {get, store, subsystemOperations} = makeTestStore();
    store.setState({
      graphData: {
        ...makeEmptyGraphData(),
        moduleInstances: {'mod-1': makeSubgraphModule()},
        subgraphs: {'sg-1': makeSubgraph()},
        subsystems: {
          'ss-1': makeSubsystem({
            parentSubsystemId: 'ss-parent',
            subgraphs: ['sg-1'],
          }),
          'ss-parent': makeSubsystem({
            subsystemId: 'ss-parent',
            subsystemName: 'Parent',
          }),
        },
      },
    });
    await enterEditMode(store);
    mockMoveSubsystemComponents.mockResolvedValueOnce({
      data: moveResponseWithModules(['mod-1'], 'ss-parent'),
      message: 'ok',
      success: true,
    });

    const ok = await subsystemOperations.removeFromSubsystem(
      get,
      'sg-1',
      'ss-1',
    );

    expect(ok).toBe(true);
    expect(mockMoveSubsystemComponents).toHaveBeenCalledWith('proj-ss-ops-1', {
      subgraphSystemIds: ['sg-1'],
      targetSubsystemSystemId: 'ss-parent',
    });
    expect(store.getState().graphData!.subsystems['ss-1'].subgraphs).toEqual(
      [],
    );
    expect(
      store.getState().graphData!.subsystems['ss-parent'].subgraphs,
    ).toEqual(['sg-1']);
  });
});

describe('createSubsystemOperations - deleteSubsystem', () => {
  it('removes the subsystem from graphData on success', async () => {
    const {get, store, subsystemOperations} = makeTestStore();
    store.setState({
      graphData: {
        ...makeEmptyGraphData(),
        subsystems: {'ss-1': makeSubsystem()},
      },
    });
    await enterEditMode(store);
    mockDeleteSubsystemApi.mockResolvedValueOnce({
      data: {
        name: 'SS1',
        naturalId: 1,
        systemId: 'ss-1',
      },
      message: 'ok',
      success: true,
    });

    const ok = await subsystemOperations.deleteSubsystem(get, 'ss-1');

    expect(ok).toBe(true);
    expect(store.getState().graphData!.subsystems['ss-1']).toBeUndefined();
    expect(store.getState().isDirty).toBe(true);
  });

  it('removes the deleted subsystem id from parent childSubsystemIds', async () => {
    const {get, store, subsystemOperations} = makeTestStore();
    store.setState({
      graphData: {
        ...makeEmptyGraphData(),
        subsystems: {
          'ss-child': makeSubsystem({
            parentSubsystemId: 'ss-parent',
            subsystemId: 'ss-child',
            subsystemName: 'Child',
          }),
          'ss-parent': makeSubsystem({
            childSubsystemIds: ['ss-child', 'ss-sibling'],
            subsystemId: 'ss-parent',
            subsystemName: 'Parent',
          }),
          'ss-sibling': makeSubsystem({
            parentSubsystemId: 'ss-parent',
            subsystemId: 'ss-sibling',
            subsystemName: 'Sibling',
          }),
        },
      },
    });
    await enterEditMode(store);
    mockDeleteSubsystemApi.mockResolvedValueOnce({
      data: {
        name: 'Child',
        naturalId: 2,
        parentSystemId: 'ss-parent',
        systemId: 'ss-child',
      },
      message: 'ok',
      success: true,
    });

    const ok = await subsystemOperations.deleteSubsystem(get, 'ss-child');

    expect(ok).toBe(true);
    expect(
      store.getState().graphData!.subsystems['ss-parent'].childSubsystemIds,
    ).toEqual(['ss-sibling']);
    expect(
      store.getState().graphData!.subsystems['ss-sibling'].parentSubsystemId,
    ).toBe('ss-parent');
  });

  it('toasts and makes no state change when the backend rejects deletion', async () => {
    const {get, store, subsystemOperations} = makeTestStore();
    store.setState({
      graphData: {
        ...makeEmptyGraphData(),
        subsystems: {'ss-1': makeSubsystem({subgraphs: ['sg-1']})},
      },
    });
    await enterEditMode(store);
    mockDeleteSubsystemApi.mockResolvedValueOnce({
      message: 'Subsystem is not empty',
      success: false,
    });

    const ok = await subsystemOperations.deleteSubsystem(get, 'ss-1');

    expect(ok).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith(
      'Subsystem is not empty',
      'danger',
    );
    expect(store.getState().graphData!.subsystems['ss-1']).toBeDefined();
  });

  it('deleteSubsystemInner suppresses the failure toast when requested', async () => {
    const {get, subsystemOperations} = makeTestStore();
    mockDeleteSubsystemApi.mockResolvedValueOnce({
      message: 'boom',
      success: false,
    });

    const ok = await subsystemOperations.deleteSubsystemInner(get, 'ss-1', {
      suppressToast: true,
    });

    expect(ok).toBe(false);
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});

describe('createSubsystemOperations - renameSubsystemNode', () => {
  it('writes only subsystemName, leaving membership and ports unchanged', async () => {
    const {get, store, subsystemOperations} = makeTestStore();
    store.setState({
      graphData: {
        ...makeEmptyGraphData(),
        subsystems: {
          'ss-1': makeSubsystem({
            childSubsystemIds: ['ss-2'],
            subgraphs: ['sg-1'],
            subsystemName: 'Old',
          }),
        },
      },
    });
    await enterEditMode(store);
    mockPatchSubsystem.mockResolvedValueOnce({
      data: {
        controlPorts: [],
        dataPorts: [],
        filteredKeys: [],
        name: 'New',
        naturalId: 1,
        systemId: 'ss-1',
      },
      message: 'ok',
      success: true,
    });

    await subsystemOperations.renameSubsystemNode(get, 'ss-1', 'New');

    const ss = store.getState().graphData!.subsystems['ss-1'];
    expect(ss.subsystemName).toBe('New');
    expect(ss.subgraphs).toEqual(['sg-1']);
    expect(ss.childSubsystemIds).toEqual(['ss-2']);
    expect(store.getState().isDirty).toBe(true);
  });
});

describe('createSubsystemOperations - expandSubsystem', () => {
  it('moves every child out then deletes the subsystem shell', async () => {
    const {get, store, subsystemOperations} = makeTestStore();
    store.setState({
      graphData: {
        ...makeEmptyGraphData(),
        moduleInstances: {'mod-1': makeSubgraphModule()},
        subgraphs: {'sg-1': makeSubgraph()},
        subsystems: {
          'ss-1': makeSubsystem({
            childSubsystemIds: ['ss-2'],
            parentSubsystemId: 'ss-parent',
            subgraphs: ['sg-1'],
          }),
          'ss-2': makeSubsystem({
            subsystemId: 'ss-2',
            subsystemName: 'Child',
          }),
          'ss-parent': makeSubsystem({
            subsystemId: 'ss-parent',
            subsystemName: 'Parent',
          }),
        },
      },
    });
    await enterEditMode(store);
    mockMoveSubsystemComponents.mockResolvedValueOnce({
      data: {
        ...moveResponseWithModules(['mod-1'], 'ss-parent'),
        updatedSubsystems: moveResponseWithSubsystems(['ss-2'], 'ss-parent')
          .updatedSubsystems,
      },
      message: 'ok',
      success: true,
    });
    mockDeleteSubsystemApi.mockResolvedValueOnce({
      data: {
        name: 'SS1',
        naturalId: 1,
        systemId: 'ss-1',
      },
      message: 'ok',
      success: true,
    });

    const ok = await subsystemOperations.expandSubsystem(get, 'ss-1');

    expect(ok).toBe(true);
    expect(mockMoveSubsystemComponents).toHaveBeenCalledWith('proj-ss-ops-1', {
      subgraphSystemIds: ['sg-1'],
      subsystemSystemIds: ['ss-2'],
      targetSubsystemSystemId: 'ss-parent',
    });
    expect(mockDeleteSubsystemApi).toHaveBeenCalledWith(
      'proj-ss-ops-1',
      'ss-1',
    );
    expect(store.getState().graphData!.subsystems['ss-1']).toBeUndefined();
  });

  it('leaves promoted children when the final delete fails', async () => {
    const {get, store, subsystemOperations} = makeTestStore();
    store.setState({
      graphData: {
        ...makeEmptyGraphData(),
        moduleInstances: {'mod-1': makeSubgraphModule()},
        subgraphs: {'sg-1': makeSubgraph()},
        subsystems: {'ss-1': makeSubsystem({subgraphs: ['sg-1']})},
      },
    });
    await enterEditMode(store);
    mockMoveSubsystemComponents.mockResolvedValueOnce({
      data: moveResponseWithModules(['mod-1']),
      message: 'ok',
      success: true,
    });
    mockDeleteSubsystemApi.mockResolvedValueOnce({
      message: 'boom',
      success: false,
    });

    const ok = await subsystemOperations.expandSubsystem(get, 'ss-1');

    expect(ok).toBe(false);
    expect(store.getState().graphData!.subsystems['ss-1'].subgraphs).toEqual(
      [],
    );
  });
});

describe('createSubsystemOperations - move response adapter', () => {
  it('adjusts surviving module port counts for added and removed links', async () => {
    const {get, store, subsystemOperations} = makeTestStore();
    store.setState({
      graphData: {
        ...makeEmptyGraphData(),
        connections: [
          {
            connectionId: 'remove-data-link',
            connectionType: 'data',
            fromModuleId: 'mod-c',
            fromPortId: 'out-c',
            isDangling: false,
            toModuleId: 'mod-d',
            toPortId: 'in-d',
          },
        ],
        moduleInstances: {
          'mod-a': makeModuleInstance({
            moduleInstanceId: 'mod-a',
            outputPorts: [
              {
                activeLinks: 0,
                direction: 'output',
                isStatic: false,
                portId: 'data-out',
                portName: 'data-out',
                portSystemId: 'data-out',
                portType: 'data',
                totalLinksAtPort: 0,
              },
            ],
          }),
          'mod-b': makeModuleInstance({
            inputPorts: [
              {
                activeLinks: 0,
                direction: 'input',
                isStatic: false,
                portId: 'data-in',
                portName: 'data-in',
                portSystemId: 'data-in',
                portType: 'data',
                totalLinksAtPort: 0,
              },
            ],
            moduleInstanceId: 'mod-b',
          }),
          'mod-c': makeModuleInstance({
            moduleInstanceId: 'mod-c',
            outputPorts: [
              {
                activeLinks: 1,
                direction: 'output',
                isStatic: false,
                portId: 'out-c',
                portName: 'out-c',
                portSystemId: 'out-c',
                portType: 'data',
                totalLinksAtPort: 1,
              },
            ],
          }),
          'mod-d': makeModuleInstance({
            inputPorts: [
              {
                activeLinks: 1,
                direction: 'input',
                isStatic: false,
                portId: 'in-d',
                portName: 'in-d',
                portSystemId: 'in-d',
                portType: 'data',
                totalLinksAtPort: 1,
              },
            ],
            moduleInstanceId: 'mod-d',
          }),
        },
        subgraphs: {'sg-1': makeSubgraph()},
        subsystems: {'ss-1': makeSubsystem()},
      },
    });
    await enterEditMode(store);
    mockMoveSubsystemComponents.mockResolvedValueOnce({
      data: {
        ...moveResponseWithModules(['mod-a'], 'ss-1'),
        addedDataLinks: [
          {
            destinationPortSystemId: 'data-in',
            destinationSystemId: 'mod-b',
            isInterUsecase: false,
            sourcePortSystemId: 'data-out',
            sourceSystemId: 'mod-a',
            systemId: 'add-data-link',
          },
        ],
        removedDataLinks: ['remove-data-link'],
      },
      message: 'ok',
      success: true,
    });

    await subsystemOperations.moveToSubsystem(get, 'sg-1', {
      subsystemId: 'ss-1',
    });

    const modules = store.getState().graphData!.moduleInstances;
    expect(modules['mod-a'].outputPorts[0].totalLinksAtPort).toBe(1);
    expect(modules['mod-b'].inputPorts[0].totalLinksAtPort).toBe(1);
    expect(modules['mod-c'].outputPorts[0].totalLinksAtPort).toBe(0);
    expect(modules['mod-d'].inputPorts[0].totalLinksAtPort).toBe(0);
  });

  it('updates added and removed links without touching unrelated connections', async () => {
    const {get, store, subsystemOperations} = makeTestStore();
    store.setState({
      graphData: {
        ...makeEmptyGraphData(),
        connections: [
          {
            connectionId: 'keep-link',
            connectionType: 'data',
            fromModuleId: 'mod-a',
            fromPortId: 'out-a',
            isDangling: false,
            toModuleId: 'mod-b',
            toPortId: 'in-b',
          },
          {
            connectionId: 'remove-data-link',
            connectionType: 'data',
            fromModuleId: 'mod-c',
            fromPortId: 'out-c',
            isDangling: false,
            toModuleId: 'mod-d',
            toPortId: 'in-d',
          },
        ],
        moduleInstances: {'mod-a': makeSubgraphModule('mod-a')},
        subgraphs: {'sg-1': makeSubgraph()},
        subsystems: {'ss-1': makeSubsystem()},
      },
    });
    await enterEditMode(store);
    store.setState({
      excludedLinks: [
        {
          connectionId: 'remove-data-link',
          connectionType: 'data',
          fromModuleId: 'mod-c',
          fromPortId: 'out-c',
          isDangling: false,
          toModuleId: 'mod-d',
          toPortId: 'in-d',
        },
        {
          connectionId: 'excluded-survivor',
          connectionType: 'data',
          fromModuleId: 'mod-e',
          fromPortId: 'out-e',
          isDangling: false,
          toModuleId: 'mod-f',
          toPortId: 'in-f',
        },
      ],
      pairLinksById: {
        'sg-1:sg-2': {
          controlLinks: [],
          dataLinks: [
            makeDataLinkDto({systemId: 'remove-data-link'}),
            makeDataLinkDto({systemId: 'pair-link-survivor'}),
          ],
          destinationSubgraphSystemId: 'sg-2',
          sourceSubgraphSystemId: 'sg-1',
        },
      },
    });
    mockMoveSubsystemComponents.mockResolvedValueOnce({
      data: {
        ...moveResponseWithModules(['mod-a'], 'ss-1'),
        addedControlLinks: [
          {
            destinationPortSystemId: 'ctrl-in',
            destinationSystemId: 'ss-1',
            isInterUsecase: false,
            sourcePortSystemId: 'ctrl-out',
            sourceSystemId: 'mod-a',
            systemId: 'add-control-link',
          },
        ],
        addedDataLinks: [
          {
            destinationPortSystemId: 'data-in',
            destinationSystemId: 'ss-1',
            isInterUsecase: false,
            sourcePortSystemId: 'data-out',
            sourceSystemId: 'mod-a',
            systemId: 'add-data-link',
          },
        ],
        removedDataLinks: ['remove-data-link'],
      },
      message: 'ok',
      success: true,
    });

    await subsystemOperations.moveToSubsystem(get, 'sg-1', {
      subsystemId: 'ss-1',
    });

    expect(store.getState().graphData!.connections).toEqual([
      {
        connectionId: 'keep-link',
        connectionType: 'data',
        fromModuleId: 'mod-a',
        fromPortId: 'out-a',
        isDangling: false,
        toModuleId: 'mod-b',
        toPortId: 'in-b',
      },
      {
        connectionId: 'add-data-link',
        connectionType: 'data',
        fromModuleId: 'mod-a',
        fromPortId: 'data-out',
        isDangling: false,
        toModuleId: 'ss-1',
        toPortId: 'data-in',
      },
      {
        connectionId: 'add-control-link',
        connectionType: 'control',
        fromModuleId: 'mod-a',
        fromPortId: 'ctrl-out',
        isDangling: false,
        toModuleId: 'ss-1',
        toPortId: 'ctrl-in',
      },
    ]);
    expect(store.getState().excludedLinks.map((l) => l.connectionId)).toEqual([
      'excluded-survivor',
    ]);
    expect(
      store
        .getState()
        .pairLinksById['sg-1:sg-2']?.dataLinks.map((l) => l.systemId),
    ).toEqual(['pair-link-survivor']);
  });

  it('applies subsystem port additions and removals', async () => {
    const {get, store, subsystemOperations} = makeTestStore();
    store.setState({
      graphData: {
        ...makeEmptyGraphData(),
        moduleInstances: {'mod-1': makeSubgraphModule()},
        subgraphs: {'sg-1': makeSubgraph()},
        subsystems: {
          'ss-1': makeSubsystem({
            controlPorts: [
              {
                direction: 'input',
                portId: 'old-control',
                portName: 'old-control',
                portType: 'control',
              },
            ],
            dataPorts: [
              {
                direction: 'input',
                portId: 'old-data',
                portName: 'old-data',
                portType: 'data',
              },
            ],
          }),
        },
      },
    });
    await enterEditMode(store);
    mockMoveSubsystemComponents.mockResolvedValueOnce({
      data: {
        ...moveResponseWithModules(['mod-1'], 'ss-1'),
        subsystemPortChanges: [
          {
            addedControlPorts: [
              {
                name: 'new-control',
                portType: 'Dynamic',
                systemId: 'new-control',
              },
            ],
            addedDataPorts: [
              {
                name: 'new-data',
                portIoType: 'Output',
                portType: 'Dynamic',
                systemId: 'new-data',
              },
            ],
            removedControlPorts: ['old-control'],
            removedDataPorts: ['old-data'],
            systemId: 'ss-1',
          },
        ],
      },
      message: 'ok',
      success: true,
    });

    await subsystemOperations.moveToSubsystem(get, 'sg-1', {
      subsystemId: 'ss-1',
    });

    expect(store.getState().graphData!.subsystems['ss-1'].controlPorts).toEqual(
      [
        {
          direction: 'input',
          portId: 'new-control',
          portName: 'new-control',
          portType: 'control',
        },
      ],
    );
    expect(store.getState().graphData!.subsystems['ss-1'].dataPorts).toEqual([
      {
        direction: 'output',
        portId: 'new-data',
        portName: 'new-data',
        portType: 'data',
      },
    ]);
  });
});
