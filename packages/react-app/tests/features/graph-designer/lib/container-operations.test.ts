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
import {getSubgraphsByIds} from '~entities/usecases';
import {createContainerOperations} from '~features/graph-designer/lib/container-operations';
import {
  createEditSessionSlice,
  type EditSessionSlice,
} from '~features/graph-designer/model/edit-session-slice';
import {
  createGraphDataSlice,
  type GraphDataSlice,
} from '~features/graph-designer/model/graph-data-slice';
import {
  createModuleListSlice,
  type ModuleListSlice,
} from '~features/graph-designer/model/module-list-slice';
import {showToast} from '~shared/controls/global-toaster';

import {makeModuleInstance} from '../test-utils/component-dto-fixtures';

const mockDeleteSpfModule = jest.mocked(deleteSpfModule);
const mockGetSubgraphsByIds = jest.mocked(getSubgraphsByIds);
const mockShowToast = jest.mocked(showToast);
const mockEndSession = jest.mocked(endSession);
const mockStartSession = jest.mocked(startSession);
const mockGetProjectById = jest.mocked(getProjectById);

type DeleteSpfModuleResult = Awaited<ReturnType<typeof deleteSpfModule>>;

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolvePromise: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return {promise, resolve: resolvePromise};
}

async function flushPromises(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

beforeEach(() => {
  mockGetSubgraphsByIds.mockResolvedValue({
    data: [],
    message: undefined as never,
    success: true,
  });
  mockDeleteSpfModule.mockReset();
  mockShowToast.mockClear();
  mockEndSession.mockResolvedValue({message: 'ok', success: true});
  mockStartSession.mockResolvedValue({
    data: {
      projectId: 'proj-cnt-ops-1',
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

function makeTestStore(projectId = 'proj-cnt-ops-1') {
  const store = createStore<TestStore>((set, get) => ({
    ...createGraphDataSlice(set, get, projectId),
    ...createModuleListSlice(set, get, projectId),
    ...createEditSessionSlice(set, get, projectId),
  }));
  store.setState({graphData: EMPTY_GRAPH_DATA});

  const containerOperations = createContainerOperations(projectId);
  const get = store.getState;

  return {containerOperations, get, store};
}

describe('createContainerOperations - deleteContainers', () => {
  it('deletes every module in the container and lets recompute drop the container', async () => {
    const {containerOperations, get, store} = makeTestStore();
    await store.getState().enterEditMode();
    store.setState({
      graphData: {
        ...EMPTY_GRAPH_DATA,
        moduleInstances: {
          'mod-1': makeModuleInstance({
            containerId: 'cnt-1',
            moduleInstanceId: 'mod-1',
          }),
          'mod-2': makeModuleInstance({
            containerId: 'cnt-1',
            moduleInstanceId: 'mod-2',
          }),
          'mod-3': makeModuleInstance({
            containerId: 'cnt-2',
            moduleInstanceId: 'mod-3',
          }),
        },
      },
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
      .mockResolvedValueOnce({
        data: {
          deleted: {
            controlLinks: [],
            dataLinks: [],
            spfModules: ['mod-2'],
          },
        },
        message: 'ok',
        success: true,
      });

    const ok = await containerOperations.deleteContainers(get, ['cnt-1']);

    expect(ok).toBe(true);
    expect(mockDeleteSpfModule).toHaveBeenCalledTimes(2);
    expect(mockDeleteSpfModule).toHaveBeenCalledWith('proj-cnt-ops-1', 'mod-1');
    expect(mockDeleteSpfModule).toHaveBeenCalledWith('proj-cnt-ops-1', 'mod-2');
    expect(
      store.getState().graphData!.moduleInstances['mod-1'],
    ).toBeUndefined();
    expect(
      store.getState().graphData!.moduleInstances['mod-2'],
    ).toBeUndefined();
    expect(store.getState().graphData!.moduleInstances['mod-3']).toBeDefined();
  });

  it('stops and toasts on the first failed delete, leaving earlier deletes applied', async () => {
    const {containerOperations, get, store} = makeTestStore();
    await store.getState().enterEditMode();
    store.setState({
      graphData: {
        ...EMPTY_GRAPH_DATA,
        moduleInstances: {
          'mod-1': makeModuleInstance({
            containerId: 'cnt-1',
            moduleInstanceId: 'mod-1',
          }),
          'mod-2': makeModuleInstance({
            containerId: 'cnt-1',
            moduleInstanceId: 'mod-2',
          }),
        },
      },
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

    const ok = await containerOperations.deleteContainers(get, ['cnt-1']);

    expect(ok).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith('boom', 'danger');
    expect(
      store.getState().graphData!.moduleInstances['mod-1'],
    ).toBeUndefined();
    expect(store.getState().graphData!.moduleInstances['mod-2']).toBeDefined();
  });

  it('deleteContainers holds one mutation lock for all container roots', async () => {
    const {containerOperations, get, store} = makeTestStore();
    const firstDelete = deferred<DeleteSpfModuleResult>();
    const secondDelete = deferred<DeleteSpfModuleResult>();
    await store.getState().enterEditMode();
    store.setState({
      graphData: {
        ...EMPTY_GRAPH_DATA,
        moduleInstances: {
          'mod-1': makeModuleInstance({
            containerId: 'cnt-1',
            moduleInstanceId: 'mod-1',
          }),
          'mod-2': makeModuleInstance({
            containerId: 'cnt-2',
            moduleInstanceId: 'mod-2',
          }),
        },
      },
    });
    mockDeleteSpfModule
      .mockReturnValueOnce(firstDelete.promise)
      .mockReturnValueOnce(secondDelete.promise);

    const batchPromise = containerOperations.deleteContainers(get, [
      'cnt-1',
      'cnt-2',
    ]);

    expect(store.getState().isMutating).toBe(true);
    expect(mockDeleteSpfModule).toHaveBeenCalledTimes(1);
    firstDelete.resolve({
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
    await flushPromises();

    expect(store.getState().isMutating).toBe(true);
    expect(mockDeleteSpfModule).toHaveBeenCalledTimes(2);
    secondDelete.resolve({
      data: {
        deleted: {
          controlLinks: [],
          dataLinks: [],
          spfModules: ['mod-2'],
        },
      },
      message: 'ok',
      success: true,
    });

    await expect(batchPromise).resolves.toBe(true);
    expect(store.getState().isMutating).toBe(false);
  });

  it('deleteContainerInner with suppressToast does not call showToast on failure', async () => {
    const {containerOperations, get, store} = makeTestStore();
    store.setState({
      graphData: {
        ...EMPTY_GRAPH_DATA,
        moduleInstances: {
          'mod-1': makeModuleInstance({
            containerId: 'cnt-1',
            moduleInstanceId: 'mod-1',
          }),
        },
      },
    });
    mockDeleteSpfModule.mockResolvedValueOnce({
      message: 'backend error',
      success: false,
    });

    const ok = await containerOperations.deleteContainerInner(get, 'cnt-1', {
      suppressToast: true,
    });

    expect(ok).toBe(false);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('prunes session-local subgraph state when container delete removes a subgraph', async () => {
    const {containerOperations, get, store} = makeTestStore();
    await store.getState().enterEditMode();
    store.setState({
      graphData: {
        ...EMPTY_GRAPH_DATA,
        moduleInstances: {
          'mod-1': makeModuleInstance({
            containerId: 'cnt-1',
            moduleInstanceId: 'mod-1',
            subgraphId: 'sg-1',
          }),
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
          subgraphs: ['sg-1'],
        },
      },
      message: 'ok',
      success: true,
    });

    const ok = await containerOperations.deleteContainers(get, ['cnt-1']);

    expect(ok).toBe(true);
    expect(store.getState().subgraphProvenanceById).toEqual({});
  });
});
