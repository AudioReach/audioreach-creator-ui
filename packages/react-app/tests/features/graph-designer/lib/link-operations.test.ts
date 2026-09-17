/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');
jest.mock('~shared/controls/global-toaster');
jest.mock('~entities/usecases/api/usecases-api');
jest.mock('~shared/store/project-store-registry', () => ({
  projectStoreRegistry: {
    get: jest.fn(() => undefined),
  },
}));

import {createStore} from 'zustand';

import {
  createControlLink,
  createControlLinkWithSubsystems,
  createDataLink,
  createDataLinkWithSubsystems,
  deleteControlLink,
  deleteDataLink,
} from '~entities/usecases/api/usecases-api';
import {createLinkOperations} from '~features/graph-designer/lib/link-operations';
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
  makeControlLinkDto,
  makeDataLinkDto,
} from '../test-utils/component-dto-fixtures';

const mockCreateControlLink = jest.mocked(createControlLink);
const mockCreateControlLinkWithSubsystems = jest.mocked(
  createControlLinkWithSubsystems,
);
const mockCreateDataLink = jest.mocked(createDataLink);
const mockCreateDataLinkWithSubsystems = jest.mocked(
  createDataLinkWithSubsystems,
);
const mockDeleteControlLink = jest.mocked(deleteControlLink);
const mockDeleteDataLink = jest.mocked(deleteDataLink);
const mockShowToast = jest.mocked(showToast);

type TestStore = GraphDataSlice & ModuleListSlice & EditSessionSlice;

function makeStore() {
  const store = createStore<TestStore>((set, get) => ({
    ...createGraphDataSlice(set, get, 'proj-1'),
    ...createModuleListSlice(set, get, 'proj-1'),
    ...createEditSessionSlice(set, get, 'proj-1'),
  }));
  store.setState({mode: 'edit'});
  const get = store.getState as unknown as () => GraphDesignerStore;
  return {get, store};
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createLinkOperations — connectPorts', () => {
  it('calls createDataLink when neither endpoint is a subsystem, and merges the result into graphData', async () => {
    const {get, store} = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {},
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {},
      },
    });
    mockCreateDataLink.mockResolvedValue({
      data: {
        controlLinks: [],
        dataLinks: [
          makeDataLinkDto({
            destinationSystemId: 'mod-B',
            sourceSystemId: 'mod-A',
          }),
        ],
        spfModules: [],
      },
      message: 'ok',
      success: true,
    });

    const {connectPorts} = createLinkOperations('proj-1');
    const result = await connectPorts(
      get,
      'mod-A',
      '10',
      'mod-B',
      '20',
      'data',
      'normal',
    );

    expect(result).toBe(true);
    expect(mockCreateDataLink).toHaveBeenCalledWith('proj-1', {
      destinationNodeSystemId: 'mod-B',
      destinationPortSystemId: '20',
      sourceNodeSystemId: 'mod-A',
      sourcePortSystemId: '10',
      type: 'normal',
    });
    expect(mockCreateDataLinkWithSubsystems).not.toHaveBeenCalled();
    expect(
      store
        .getState()
        .graphData?.connections.find((c) => c.systemId === 'link-1'),
    ).toBeDefined();
  });

  it('calls createControlLink when neither endpoint is a subsystem, and merges the result into graphData', async () => {
    const {get, store} = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {},
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {},
      },
    });
    mockCreateControlLink.mockResolvedValue({
      data: {
        controlLinks: [
          makeControlLinkDto({
            destinationSystemId: 'mod-B',
            sourceSystemId: 'mod-A',
          }),
        ],
        dataLinks: [],
        spfModules: [],
      },
      message: 'ok',
      success: true,
    });

    const {connectPorts} = createLinkOperations('proj-1');
    const result = await connectPorts(
      get,
      'mod-A',
      '10',
      'mod-B',
      '20',
      'control',
      'normal',
    );

    expect(result).toBe(true);
    expect(mockCreateControlLink).toHaveBeenCalledWith('proj-1', {
      endComponentSystemId: 'mod-B',
      endPortSystemId: '20',
      isInterUsecase: false,
      startComponentSystemId: 'mod-A',
      startPortSystemId: '10',
    });
    expect(mockCreateControlLinkWithSubsystems).not.toHaveBeenCalled();
    expect(
      store
        .getState()
        .graphData?.connections.find((c) => c.systemId === 'link-1'),
    ).toBeDefined();
  });

  it('passes EC type to the data-link API', async () => {
    const {get} = makeStore();
    mockCreateDataLink.mockResolvedValue({
      data: {controlLinks: [], dataLinks: [makeDataLinkDto()], spfModules: []},
      message: 'ok',
      success: true,
    });

    const {connectPorts} = createLinkOperations('proj-1');
    await connectPorts(get, 'mod-A', '10', 'mod-B', '20', 'data', 'EC');

    expect(mockCreateDataLink).toHaveBeenCalledWith('proj-1', {
      destinationNodeSystemId: 'mod-B',
      destinationPortSystemId: '20',
      sourceNodeSystemId: 'mod-A',
      sourcePortSystemId: '10',
      type: 'EC',
    });
  });

  it('uses the dangling field for Dangling control links', async () => {
    const {get} = makeStore();
    mockCreateControlLink.mockResolvedValue({
      data: {
        controlLinks: [makeControlLinkDto()],
        dataLinks: [],
        spfModules: [],
      },
      message: 'ok',
      success: true,
    });

    const {connectPorts} = createLinkOperations('proj-1');
    await connectPorts(
      get,
      'mod-A',
      '10',
      'mod-B',
      '20',
      'control',
      'dangling',
    );

    expect(mockCreateControlLink).toHaveBeenCalledWith('proj-1', {
      endComponentSystemId: 'mod-B',
      endPortSystemId: '20',
      isInterUsecase: true,
      startComponentSystemId: 'mod-A',
      startPortSystemId: '10',
    });
  });

  it('calls createDataLinkWithSubsystems when the source node is a subsystem', async () => {
    const {get, store} = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {},
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {
          'ss-1': {
            controlPorts: [],
            dataPorts: [],
            subgraphs: [],
            subsystemId: 'ss-1',
            subsystemName: 'Subsystem A',
          },
        },
      },
    });
    mockCreateDataLinkWithSubsystems.mockResolvedValue({
      data: {controlLinks: [], dataLinks: [makeDataLinkDto()], spfModules: []},
      message: 'ok',
      success: true,
    });

    const {connectPorts} = createLinkOperations('proj-1');
    await connectPorts(get, 'ss-1', '10', 'mod-B', '20', 'data', 'normal');

    expect(mockCreateDataLinkWithSubsystems).toHaveBeenCalledWith('proj-1', {
      destinationNodeSystemId: 'mod-B',
      destinationPortSystemId: '20',
      sourceNodeSystemId: 'ss-1',
      sourcePortSystemId: '10',
      type: 'normal',
    });
    expect(mockCreateDataLink).not.toHaveBeenCalled();
  });

  it('calls createControlLinkWithSubsystems when the source node is a subsystem', async () => {
    const {get, store} = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {},
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {
          'ss-1': {
            controlPorts: [],
            dataPorts: [],
            subgraphs: [],
            subsystemId: 'ss-1',
            subsystemName: 'Subsystem A',
          },
        },
      },
    });
    mockCreateControlLinkWithSubsystems.mockResolvedValue({
      data: {
        controlLinks: [makeControlLinkDto()],
        dataLinks: [],
        spfModules: [],
      },
      message: 'ok',
      success: true,
    });

    const {connectPorts} = createLinkOperations('proj-1');
    await connectPorts(get, 'ss-1', '10', 'mod-B', '20', 'control', 'normal');

    expect(mockCreateControlLinkWithSubsystems).toHaveBeenCalledWith('proj-1', {
      endComponentSystemId: 'mod-B',
      endPortSystemId: '20',
      isInterUsecase: false,
      startComponentSystemId: 'ss-1',
      startPortSystemId: '10',
    });
    expect(mockCreateControlLink).not.toHaveBeenCalled();
  });

  it('calls createDataLinkWithSubsystems when both endpoints are subsystems', async () => {
    const {get, store} = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {},
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {
          'sys-ss-1': {
            controlPorts: [],
            dataPorts: [],
            subgraphs: [],
            subsystemId: 'sys-ss-1',
            subsystemName: 'Subsystem A',
          },
          'sys-ss-2': {
            controlPorts: [],
            dataPorts: [],
            subgraphs: [],
            subsystemId: 'sys-ss-2',
            subsystemName: 'Subsystem B',
          },
        },
      },
    });
    mockCreateDataLinkWithSubsystems.mockResolvedValue({
      data: {controlLinks: [], dataLinks: [makeDataLinkDto()], spfModules: []},
      message: 'ok',
      success: true,
    });

    const {connectPorts} = createLinkOperations('proj-1');
    await connectPorts(
      get,
      'sys-ss-1',
      '10',
      'sys-ss-2',
      '20',
      'data',
      'normal',
    );

    expect(mockCreateDataLinkWithSubsystems).toHaveBeenCalledWith('proj-1', {
      destinationNodeSystemId: 'sys-ss-2',
      destinationPortSystemId: '20',
      sourceNodeSystemId: 'sys-ss-1',
      sourcePortSystemId: '10',
      type: 'normal',
    });
    expect(mockCreateDataLink).not.toHaveBeenCalled();
  });

  it('calls createControlLinkWithSubsystems when both endpoints are subsystems', async () => {
    const {get, store} = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {},
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {
          'sys-ss-1': {
            controlPorts: [],
            dataPorts: [],
            subgraphs: [],
            subsystemId: 'sys-ss-1',
            subsystemName: 'Subsystem A',
          },
          'sys-ss-2': {
            controlPorts: [],
            dataPorts: [],
            subgraphs: [],
            subsystemId: 'sys-ss-2',
            subsystemName: 'Subsystem B',
          },
        },
      },
    });
    mockCreateControlLinkWithSubsystems.mockResolvedValue({
      data: {
        controlLinks: [makeControlLinkDto()],
        dataLinks: [],
        spfModules: [],
      },
      message: 'ok',
      success: true,
    });

    const {connectPorts} = createLinkOperations('proj-1');
    await connectPorts(
      get,
      'sys-ss-1',
      '10',
      'sys-ss-2',
      '20',
      'control',
      'normal',
    );

    expect(mockCreateControlLinkWithSubsystems).toHaveBeenCalledWith('proj-1', {
      endComponentSystemId: 'sys-ss-2',
      endPortSystemId: '20',
      isInterUsecase: false,
      startComponentSystemId: 'sys-ss-1',
      startPortSystemId: '10',
    });
    expect(mockCreateControlLink).not.toHaveBeenCalled();
  });

  it('shows a danger toast and returns false when the backend call fails', async () => {
    const {get, store} = makeStore();
    mockCreateDataLink.mockResolvedValue({
      issues: [{code: 'INCOMPATIBLE_PORTS', message: 'Ports are incompatible', severity: 'ERROR'}],
    });

    const {connectPorts} = createLinkOperations('proj-1');
    const result = await connectPorts(
      get,
      'mod-A',
      '10',
      'mod-B',
      '20',
      'data',
      'normal',
    );

    expect(result).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith(
      'Ports are incompatible',
      'danger',
    );
    expect(store.getState().graphData).toBeNull();
  });

  it('throws when called outside edit mode', async () => {
    const {get, store} = makeStore();
    store.setState({mode: 'view'});

    const {connectPorts} = createLinkOperations('proj-1');

    await expect(
      connectPorts(get, 'mod-A', '10', 'mod-B', '20', 'data', 'normal'),
    ).rejects.toThrow('withMutationLock called outside Edit mode');
  });
});

describe('createLinkOperations — deleteLink', () => {
  it('calls deleteDataLink and removes the connection from graphData on success', async () => {
    const {get, store} = makeStore();
    store.setState({
      graphData: {
        connections: [
          {
            destinationPortSystemId: '20',
            destinationSystemId: 'mod-B',
            isInterUsecase: false,
            linkKind: 'data',
            sourcePortSystemId: '10',
            sourceSystemId: 'mod-A',
            systemId: 'link-1',
          },
        ],
        containers: {},
        moduleInstances: {},
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {},
      },
    });
    mockDeleteDataLink.mockResolvedValue({
      data: makeDataLinkDto({systemId: 'link-1'}),
      message: 'ok',
      success: true,
    });

    const {deleteLink} = createLinkOperations('proj-1');
    const result = await deleteLink(get, 'link-1', 'data');

    expect(result).toBe(true);
    expect(mockDeleteDataLink).toHaveBeenCalledWith('proj-1', 'link-1');
    expect(
      store
        .getState()
        .graphData?.connections.find((c) => c.systemId === 'link-1'),
    ).toBeUndefined();
  });

  it('calls deleteControlLink and removes the connection from graphData on success', async () => {
    const {get, store} = makeStore();
    store.setState({
      graphData: {
        connections: [
          {
            destinationPortSystemId: '20',
            destinationSystemId: 'mod-B',
            isInterUsecase: false,
            linkKind: 'control',
            sourcePortSystemId: '10',
            sourceSystemId: 'mod-A',
            systemId: 'link-1',
          },
        ],
        containers: {},
        moduleInstances: {},
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {},
      },
    });
    mockDeleteControlLink.mockResolvedValue({
      data: makeControlLinkDto({systemId: 'link-1'}),
      message: 'ok',
      success: true,
    });

    const {deleteLink} = createLinkOperations('proj-1');
    const result = await deleteLink(get, 'link-1', 'control');

    expect(result).toBe(true);
    expect(mockDeleteControlLink).toHaveBeenCalledWith('proj-1', 'link-1');
    expect(
      store
        .getState()
        .graphData?.connections.find((c) => c.systemId === 'link-1'),
    ).toBeUndefined();
  });

  it('shows a danger toast and returns false when the backend call fails', async () => {
    const {get} = makeStore();
    mockDeleteDataLink.mockResolvedValue({
      issues: [{code: 'LINK_NOT_FOUND', message: 'Link not found', severity: 'ERROR'}],
    });

    const {deleteLink} = createLinkOperations('proj-1');
    const result = await deleteLink(get, 'link-1', 'data');

    expect(result).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith('Link not found', 'danger');
  });

  it('shows a danger toast and returns false when deleteControlLink fails', async () => {
    const {get} = makeStore();
    mockDeleteControlLink.mockResolvedValue({
      issues: [{code: 'LINK_NOT_FOUND', message: 'Link not found', severity: 'ERROR'}],
    });

    const {deleteLink} = createLinkOperations('proj-1');
    const result = await deleteLink(get, 'link-1', 'control');

    expect(result).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith('Link not found', 'danger');
  });
});
