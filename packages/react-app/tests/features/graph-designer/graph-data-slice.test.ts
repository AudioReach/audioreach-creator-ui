/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');
jest.mock('~entities/usecases/api/usecases-api');
jest.mock('~entities/spf-modules', () => ({
  patchSpfModule: jest.fn(),
}));
jest.mock('~shared/store/project-store-registry', () => ({
  projectStoreRegistry: {
    get: jest.fn(() => undefined),
  },
}));

import {createStore} from 'zustand';

import {
  getSubgraphsByIds,
  getUsecaseComponents,
} from '~entities/usecases/api/usecases-api';
import {patchSpfModule} from '~entities/spf-modules';
import {
  createEditSessionSlice,
  type EditSessionSlice,
} from '~features/graph-designer/model/edit-session-slice';
import {
  createGraphDataSlice,
  type GraphDataSlice,
  type ModuleInstance,
  toConnection,
} from '~features/graph-designer/model/graph-data-slice';
import {
  createModuleListSlice,
  type ModuleDefinition,
  type ModuleListSlice,
} from '~features/graph-designer/model/module-list-slice';
import {
  createSubsystemSlice,
  type SubsystemSlice,
} from '~shared/store/tab-store-slices/subsystem-slice';

import {
  makeDataLinkDto,
  makeSpfModuleDto,
  makeSubsystemDto,
} from './test-utils/component-dto-fixtures';

const mockGetUsecaseComponents = jest.mocked(getUsecaseComponents);
const mockGetSubgraphsByIds = jest.mocked(getSubgraphsByIds);
const mockPatchSpfModule = jest.mocked(patchSpfModule);

beforeEach(() => {
  mockGetSubgraphsByIds.mockResolvedValue({
    data: [],
    message: undefined as never,
    success: true,
  });
});

type TestStore = GraphDataSlice &
  ModuleListSlice &
  EditSessionSlice &
  SubsystemSlice;

function makeStore(moduleList: ModuleDefinition[] = []) {
  const store = createStore<TestStore>((set, get) => ({
    ...createGraphDataSlice(set, get, 'proj-1'),
    ...createModuleListSlice(set, get, 'proj-1'),
    ...createEditSessionSlice(set, get, 'proj-1'),
    ...createSubsystemSlice(set, get),
  }));
  if (moduleList.length > 0) {
    store.setState({moduleList});
  }
  return store;
}

function moduleWithPort(overrides: {
  activeLinks?: number;
  portId: string;
  portSystemId?: string;
  systemId: string;
  totalLinksAtPort: number;
}): ModuleInstance {
  return {
    containerSystemId: 'c1',
    displayName: 'M',
    inputPorts: [
      {
        activeLinks: overrides.activeLinks ?? 0,
        direction: 'input',
        isStatic: false,
        portId: overrides.portId,
        portName: 'in',
        portSystemId: overrides.portSystemId ?? overrides.portId,
        portType: 'data',
        totalLinksAtPort: overrides.totalLinksAtPort,
      },
    ],
    moduleDefinitionSystemId: '1',
    moduleName: 'M',
    moduleType: '',
    naturalId: 1,
    outputPorts: [],
    position: {x: 0, y: 0},
    subgraphSystemId: 'sg-1',
    systemId: overrides.systemId,
  };
}

const minimalDto = {
  controlLinks: [],
  dataLinks: [],
  spfModules: [
    {
      alias: '',
      containerSystemId: '10',
      controlPorts: [],
      dataPorts: [],
      moduleDefinitionSystemId: 'mod-def-200',
      name: 'AudioDecoder',
      naturalId: 200,
      subgraphSystemId: 'sys-sg-1',
      systemId: 'sys-mod-1',
    },
  ],
  subsystems: [],
};

describe('toConnection', () => {
  it('maps a DataLinkDto to a Connection with linkKind "data"', () => {
    const link = makeDataLinkDto({
      destinationPortSystemId: 'port-2',
      destinationSystemId: 'mod-2',
      sourcePortSystemId: 'port-1',
      sourceSystemId: 'mod-1',
      systemId: 'link-1',
    });

    expect(toConnection(link, 'data')).toEqual({
      destinationPortSystemId: 'port-2',
      destinationSystemId: 'mod-2',
      isInterUsecase: false,
      linkKind: 'data',
      sourcePortSystemId: 'port-1',
      sourceSystemId: 'mod-1',
      systemId: 'link-1',
    });
  });

  it('does not set diffState — callers that need it set it themselves', () => {
    const link = makeDataLinkDto({systemId: 'link-2'});
    expect(toConnection(link, 'data').diffState).toBeUndefined();
  });
});

describe('createGraphDataSlice — initializeEmptyGraphData', () => {
  it('sets an empty ready graph snapshot', () => {
    const store = makeStore();

    store.getState().initializeEmptyGraphData();

    expect(store.getState().graphData).toEqual({
      connections: [],
      containers: {},
      moduleInstances: {},
      selectedUsecases: [],
      subgraphs: {},
      subsystems: {},
    });
    expect(store.getState().graphDataError).toBeNull();
    expect(store.getState().graphDataStatus).toBe('ready');
    expect(store.getState().isDirty).toBe(false);
  });
});

describe('createGraphDataSlice — moduleType resolution', () => {
  it('resolves moduleType from moduleList moduleType when a matching definition exists', async () => {
    const store = makeStore([
      {
        builtIn: false,
        category: 'WR_SHARED_MEM_EP',
        description: '',
        dspType: 'ADSP',
        inputPorts: [],
        moduleDefinitionSystemId: 'mod-def-200',
        moduleId: '200',
        moduleName: 'AudioDecoder',
        moduleType: 'SOURCE',
        outputPorts: [],
        processorSystemId: 'ADSP',
      },
    ]);

    mockGetUsecaseComponents.mockResolvedValueOnce({
      data: minimalDto as never,
      message: undefined,
      success: true,
    });

    await store.getState().loadGraphData(['uc-1']);

    const instance = store.getState().graphData?.moduleInstances['sys-mod-1'];
    expect(instance?.moduleType).toBe('SOURCE');
  });

  it('falls back to empty string when no matching module definition exists', async () => {
    const store = makeStore([]);

    mockGetUsecaseComponents.mockResolvedValueOnce({
      data: minimalDto as never,
      message: undefined,
      success: true,
    });

    await store.getState().loadGraphData(['uc-1']);

    const instance = store.getState().graphData?.moduleInstances['sys-mod-1'];
    expect(instance?.moduleType).toBe('');
  });

  it('uses empty string moduleType for instances whose definition is absent from moduleList', async () => {
    const store = makeStore([
      {
        builtIn: false,
        category: 'SINK_MODULE',
        description: '',
        dspType: 'ADSP',
        inputPorts: [],
        moduleDefinitionSystemId: 'mod-def-999',
        moduleId: '999', // different moduleId — won't match
        moduleName: 'SomeSink',
        moduleType: 'SINK',
        outputPorts: [],
        processorSystemId: 'ADSP',
      },
    ]);

    mockGetUsecaseComponents.mockResolvedValueOnce({
      data: minimalDto as never,
      message: undefined,
      success: true,
    });

    await store.getState().loadGraphData(['uc-1']);

    const instance = store.getState().graphData?.moduleInstances['sys-mod-1'];
    expect(instance?.moduleType).toBe('');
  });
});

describe('createGraphDataSlice — subgraph name enrichment', () => {
  it('queries getSubgraphsByIds with the loaded subgraph ids and overlays the real name/type onto the placeholder', async () => {
    const store = makeStore([]);
    mockGetUsecaseComponents.mockResolvedValueOnce({
      data: minimalDto as never,
      message: undefined,
      success: true,
    });
    mockGetSubgraphsByIds.mockResolvedValueOnce({
      data: [
        {
          name: 'RealSubgraphName',
          naturalId: 1,
          relatedEndPointLinks: [],
          SGKV: [],
          subGraphSharedType: 'AUDIO_PLAYBACK',
          systemId: 'sys-sg-1',
        },
      ],
      message: undefined,
      success: true,
    });

    await store.getState().loadGraphData(['uc-1']);

    expect(mockGetSubgraphsByIds).toHaveBeenCalledWith('proj-1', ['sys-sg-1']);
    const subgraph = store.getState().graphData?.subgraphs['sys-sg-1'];
    expect(subgraph?.subgraphName).toBe('RealSubgraphName');
    expect(subgraph?.subgraphType).toBe('AUDIO_PLAYBACK');
  });

  it('leaves the placeholder subgraph name in place when getSubgraphsByIds fails', async () => {
    const store = makeStore([]);
    mockGetUsecaseComponents.mockResolvedValueOnce({
      data: minimalDto as never,
      message: undefined,
      success: true,
    });
    mockGetSubgraphsByIds.mockResolvedValueOnce({
      message: 'boom',
      success: false,
    });

    await store.getState().loadGraphData(['uc-1']);

    const subgraph = store.getState().graphData?.subgraphs['sys-sg-1'];
    expect(subgraph?.subgraphName).toBe('Subgraph sys-sg-1');
  });

  it('carries forward a real subgraph name across an incremental recompute rather than resetting to the placeholder', () => {
    const store = makeStore([]);
    store.setState({
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {
          'sys-mod-1': {
            containerSystemId: '10',
            displayName: 'AudioDecoder',
            inputPorts: [],
            moduleId: '200',
            moduleName: 'AudioDecoder',
            moduleType: '',
            outputPorts: [],
            position: {x: 0, y: 0},
            subgraphSystemId: 'sys-sg-1',
            systemId: 'sys-mod-1',
          },
        },
        selectedUsecases: [],
        subgraphs: {
          'sys-sg-1': {
            containers: [],
            subgraphName: 'RealSubgraphName',
            subgraphSystemId: 'sys-sg-1',
            subgraphType: 'AUDIO_PLAYBACK',
          },
        },
        subsystems: {},
      },
    });

    store.getState().recomputeContainersAndSubgraphs();

    const subgraph = store.getState().graphData?.subgraphs['sys-sg-1'];
    expect(subgraph?.subgraphName).toBe('RealSubgraphName');
    expect(subgraph?.subgraphType).toBe('AUDIO_PLAYBACK');
  });
});

describe('createGraphDataSlice — Subsystem.subgraphs population (B5)', () => {
  const dtoWithSubsystem = {
    controlLinks: [],
    dataLinks: [],
    spfModules: [
      {
        alias: '',
        containerSystemId: 10,
        controlPorts: [],
        dataPorts: [],
        moduleId: 200,
        name: 'AudioDecoder',
        naturalId: 1,
        parentSystemId: 'sys-ss-20',
        subgraphSystemId: 'sys-sg-5',
        systemId: 'sys-mod-1',
      },
    ],
    subsystems: [
      {
        controlPorts: [],
        dataPorts: [],
        name: 'AudioSubsystem',
        naturalId: 20,
        systemId: 'sys-ss-20',
      },
    ],
  };

  it('populates Subsystem.subgraphs with the subgraph IDs whose modules have parentSystemId matching the subsystem', async () => {
    const store = makeStore([]);
    mockGetUsecaseComponents.mockResolvedValueOnce({
      data: dtoWithSubsystem as never,
      message: undefined,
      success: true,
    });

    await store.getState().loadGraphData(['uc-1']);

    const subsystem = store.getState().graphData?.subsystems['sys-ss-20'];
    expect(subsystem?.subgraphs).toContain('sys-sg-5');
  });

  it('leaves Subsystem.subgraphs empty when no module has a parent linking it to that subsystem', async () => {
    const dtoNoParent = {
      ...dtoWithSubsystem,
      spfModules: [
        {...dtoWithSubsystem.spfModules[0], parentSystemId: undefined},
      ],
    };
    const store = makeStore([]);
    mockGetUsecaseComponents.mockResolvedValueOnce({
      data: dtoNoParent as never,
      message: undefined,
      success: true,
    });

    await store.getState().loadGraphData(['uc-1']);

    const subsystem = store.getState().graphData?.subsystems['sys-ss-20'];
    expect(subsystem?.subgraphs).toHaveLength(0);
  });

  it('populates childSubsystemIds from subsystem parentSystemId values', async () => {
    const store = makeStore([]);
    mockGetUsecaseComponents.mockResolvedValueOnce({
      data: {
        ...dtoWithSubsystem,
        subsystems: [
          makeSubsystemDto({
            name: 'Parent',
            naturalId: 20,
            systemId: 'sys-ss-parent',
          }),
          makeSubsystemDto({
            name: 'Child',
            naturalId: 21,
            parentSystemId: 'sys-ss-parent',
            systemId: 'sys-ss-child',
          }),
        ],
      },
      message: undefined,
      success: true,
    });

    await store.getState().loadGraphData(['uc-1']);

    const graphData = store.getState().graphData!;
    expect(graphData.subsystems['sys-ss-parent'].childSubsystemIds).toEqual([
      'sys-ss-child',
    ]);
    expect(graphData.subsystems['sys-ss-child'].childSubsystemIds).toEqual([]);
    expect(graphData.subsystems['sys-ss-child'].parentSubsystemId).toBe(
      'sys-ss-parent',
    );
  });
});

describe('applyAddedCollection / applyDeletedCollection — modules', () => {
  it('upserts a new module into moduleInstances, resolving moduleType from moduleList', () => {
    const store = makeStore([
      {
        builtIn: false,
        category: '',
        description: '',
        dspType: '',
        inputPorts: [],
        moduleDefinitionSystemId: 'mod-def-200',
        moduleId: '200',
        moduleName: 'AudioDecoder',
        moduleType: 'SOURCE',
        outputPorts: [],
        processorSystemId: '',
      },
    ]);
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

    store.getState().applyAddedCollection({
      controlLinks: [],
      dataLinks: [],
      spfModules: [makeSpfModuleDto()],
    });

    const instance = store.getState().graphData!.moduleInstances['sys-mod-1'];
    expect(instance).toBeDefined();
    expect(instance.moduleType).toBe('SOURCE');
  });

  it('preserves an existing module\'s position when it is upserted again (an "updated" entry)', () => {
    const store = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {
          'sys-mod-1': {
            containerSystemId: '10',
            displayName: 'AudioDecoder',
            inputPorts: [],
            moduleId: '200',
            moduleName: 'AudioDecoder',
            moduleType: '',
            outputPorts: [],
            position: {x: 42, y: 7},
            subgraphSystemId: '1',
            systemId: 'sys-mod-1',
          },
        },
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {},
      },
    });

    store.getState().applyAddedCollection({
      controlLinks: [],
      dataLinks: [],
      spfModules: [makeSpfModuleDto({name: 'AudioDecoderRenamed'})],
    });

    const instance = store.getState().graphData!.moduleInstances['sys-mod-1'];
    expect(instance.displayName).toBe('AudioDecoderRenamed');
    expect(instance.position).toEqual({x: 42, y: 7});
  });

  it('recomputes activeLinks from live connections for an updated module with no link diff of its own', () => {
    const store = makeStore();
    store.setState({
      graphData: {
        connections: [
          {
            destinationPortSystemId: 'sys-port-20',
            destinationSystemId: 'sys-mod-2',
            isInterUsecase: false,
            linkKind: 'data',
            sourcePortSystemId: 'sys-port-10',
            sourceSystemId: 'sys-mod-1',
            systemId: 'link-1',
          },
        ],
        containers: {},
        moduleInstances: {
          'sys-mod-1': {
            containerSystemId: '10',
            displayName: 'AudioDecoder',
            inputPorts: [],
            moduleId: '200',
            moduleName: 'AudioDecoder',
            moduleType: '',
            outputPorts: [
              {
                activeLinks: 1,
                direction: 'output',
                isStatic: false,
                portId: '10',
                portName: 'out1',
                portSystemId: 'sys-port-10',
                portType: 'data',
                totalLinksAtPort: 1,
              },
            ],
            position: {x: 0, y: 0},
            subgraphSystemId: '1',
            systemId: 'sys-mod-1',
          },
        },
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {},
      },
    });

    // "updated" entry for sys-mod-1 carries no accompanying link diff —
    // applyAddedCollection must recompute activeLinks from the still-intact
    // connection rather than resetting it to 0.
    store.getState().applyAddedCollection({
      controlLinks: [],
      dataLinks: [],
      spfModules: [
        makeSpfModuleDto({
          dataPorts: [
            {
              changeInfo: {changeType: 'UPDATE'},
              name: 'out1',
              naturalId: 10,
              portIoType: 'Output',
              portType: 'Static',
              relatedEndPointLinks: [],
              systemId: 'sys-port-10',
              totalLinksAtPort: 1,
            } as never,
          ],
          name: 'AudioDecoderRenamed',
        }),
      ],
    });

    const instance = store.getState().graphData!.moduleInstances['sys-mod-1'];
    expect(instance.displayName).toBe('AudioDecoderRenamed');
    expect(instance.outputPorts[0].activeLinks).toBe(1);
  });

  it('reflects a new link delivered in the same collection as its own new module (connections merge before modules upsert)', () => {
    const store = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {
          'sys-mod-1': {
            containerSystemId: '10',
            displayName: 'Existing',
            inputPorts: [],
            moduleId: '200',
            moduleName: 'Existing',
            moduleType: '',
            outputPorts: [
              {
                activeLinks: 0,
                direction: 'output',
                isStatic: false,
                portId: '10',
                portName: 'out1',
                portSystemId: 'sys-port-10',
                portType: 'data',
                totalLinksAtPort: 0,
              },
            ],
            position: {x: 0, y: 0},
            subgraphSystemId: '1',
            systemId: 'sys-mod-1',
          },
        },
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {},
      },
    });

    // Both the new module and the link connecting to it arrive in the same
    // "added" collection — upsertModule must see the link merged into
    // connections already, not the pre-merge snapshot.
    store.getState().applyAddedCollection({
      controlLinks: [],
      dataLinks: [
        makeDataLinkDto({
          destinationPortSystemId: 'sys-port-20',
          destinationSystemId: 'sys-mod-2',
          sourcePortSystemId: 'sys-port-10',
          sourceSystemId: 'sys-mod-1',
          systemId: 'link-new',
        }),
      ],
      spfModules: [
        makeSpfModuleDto({
          dataPorts: [
            {
              changeInfo: {changeType: 'CREATE'},
              name: 'in1',
              naturalId: 20,
              portIoType: 'Input',
              portType: 'Static',
              relatedEndPointLinks: [],
              systemId: 'sys-port-20',
              totalLinksAtPort: 1,
            } as never,
          ],
          name: 'New',
          systemId: 'sys-mod-2',
        }),
      ],
    });

    const newModule = store.getState().graphData!.moduleInstances['sys-mod-2'];
    expect(newModule.inputPorts[0].activeLinks).toBe(1);
  });

  it('removes a module from moduleInstances via applyDeletedCollection', () => {
    const store = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {
          'sys-mod-1': {
            containerSystemId: '10',
            displayName: 'AudioDecoder',
            inputPorts: [],
            moduleId: '200',
            moduleName: 'AudioDecoder',
            moduleType: '',
            outputPorts: [],
            position: {x: 0, y: 0},
            subgraphSystemId: '1',
            systemId: 'sys-mod-1',
          },
        },
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {},
      },
    });

    store.getState().applyDeletedCollection({
      controlLinks: [],
      dataLinks: [],
      spfModules: ['sys-mod-1'],
    });

    expect(
      store.getState().graphData!.moduleInstances['sys-mod-1'],
    ).toBeUndefined();
  });
});

describe('applyAddedCollection / applyDeletedCollection — links', () => {
  it('upserts a data link, using the link DTO endpoint systemIds directly', () => {
    const store = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {
          'sys-mod-1': {
            containerSystemId: '10',
            displayName: 'AudioDecoder',
            inputPorts: [],
            moduleId: '200',
            moduleName: 'AudioDecoder',
            moduleType: '',
            outputPorts: [],
            position: {x: 0, y: 0},
            subgraphSystemId: '1',
            systemId: 'sys-mod-1',
          },
        },
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {
          'sys-ss-1': {
            childSubsystemIds: [],
            controlPorts: [],
            dataPorts: [],
            subgraphs: [],
            subsystemId: 'sys-ss-1',
            subsystemName: 'Subsystem A',
          },
        },
      },
    });

    store.getState().applyAddedCollection({
      controlLinks: [],
      dataLinks: [
        makeDataLinkDto({
          destinationSystemId: 'sys-ss-1',
          sourceSystemId: 'sys-mod-1',
          systemId: 'link-1',
        }),
      ],
      spfModules: [],
    });

    const conn = store
      .getState()
      .graphData!.connections.find((c) => c.systemId === 'link-1');
    expect(conn).toEqual({
      destinationPortSystemId: '20',
      destinationSystemId: 'sys-ss-1',
      isInterUsecase: false,
      linkKind: 'data',
      sourcePortSystemId: '10',
      sourceSystemId: 'sys-mod-1',
      systemId: 'link-1',
    });
  });

  it('removes a link via applyDeletedCollection, leaving other connections untouched', () => {
    const store = makeStore();
    store.setState({
      graphData: {
        connections: [
          {
            destinationPortSystemId: '20',
            destinationSystemId: 'sys-ss-1',
            isInterUsecase: false,
            linkKind: 'data',
            sourcePortSystemId: '10',
            sourceSystemId: 'sys-mod-1',
            systemId: 'link-1',
          },
          {
            destinationPortSystemId: '21',
            destinationSystemId: 'sys-mod-3',
            isInterUsecase: false,
            linkKind: 'data',
            sourcePortSystemId: '11',
            sourceSystemId: 'sys-mod-2',
            systemId: 'link-survivor',
          },
        ],
        containers: {},
        moduleInstances: {},
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {},
      },
    });

    store.getState().applyDeletedCollection({
      controlLinks: [],
      dataLinks: ['link-1'],
      spfModules: [],
    });

    expect(
      store.getState().graphData!.connections.map((c) => c.systemId),
    ).toEqual(['link-survivor']);
  });
});

describe('applyAddedCollection / applyDeletedCollection — subsystems', () => {
  it('upserts a new subsystem into graphData.subsystems', () => {
    const store = makeStore();
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

    store.getState().applyAddedCollection({
      controlLinks: [],
      dataLinks: [],
      spfModules: [],
      subsystems: [makeSubsystemDto()],
    });

    const ss = store.getState().graphData!.subsystems['sys-ss-1'];
    expect(ss).toBeDefined();
    expect(ss.childSubsystemIds).toEqual([]);
    expect(ss.subgraphs).toEqual([]);
  });

  it('defaults childSubsystemIds to an empty array on both initial load and incremental upsert', async () => {
    const store = makeStore();
    mockGetUsecaseComponents.mockResolvedValueOnce({
      data: {
        controlLinks: [],
        dataLinks: [],
        spfModules: [],
        subsystems: [makeSubsystemDto()],
      },
      message: undefined,
      success: true,
    });

    await store.getState().loadGraphData(['uc-1']);

    expect(
      store.getState().graphData!.subsystems['sys-ss-1'].childSubsystemIds,
    ).toEqual([]);

    store.getState().applyAddedCollection({
      controlLinks: [],
      dataLinks: [],
      spfModules: [],
      subsystems: [makeSubsystemDto({name: 'Subsystem A Renamed'})],
    });

    expect(
      store.getState().graphData!.subsystems['sys-ss-1'].childSubsystemIds,
    ).toEqual([]);
  });

  it('preserves the existing subgraphs membership list when a subsystem is upserted again', () => {
    const store = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {},
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {
          'sys-ss-1': {
            childSubsystemIds: ['sys-ss-2'],
            controlPorts: [],
            dataPorts: [],
            subgraphs: ['subgraph-1', 'subgraph-2'],
            subsystemId: 'sys-ss-1',
            subsystemName: 'Subsystem A',
          },
        },
      },
    });

    store.getState().applyAddedCollection({
      controlLinks: [],
      dataLinks: [],
      spfModules: [],
      subsystems: [makeSubsystemDto({name: 'Subsystem A Renamed'})],
    });

    const ss = store.getState().graphData!.subsystems['sys-ss-1'];
    expect(ss.subsystemName).toBe('Subsystem A Renamed');
    expect(ss.childSubsystemIds).toEqual(['sys-ss-2']);
    expect(ss.subgraphs).toEqual(['subgraph-1', 'subgraph-2']);
  });

  it('removes a subsystem via applyDeletedCollection', () => {
    const store = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {},
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {
          'sys-ss-1': {
            childSubsystemIds: [],
            controlPorts: [],
            dataPorts: [],
            subgraphs: [],
            subsystemId: 'sys-ss-1',
            subsystemName: 'Subsystem A',
          },
        },
      },
    });

    store.getState().applyDeletedCollection({
      controlLinks: [],
      dataLinks: [],
      spfModules: [],
      subsystems: ['sys-ss-1'],
    });

    expect(store.getState().graphData!.subsystems['sys-ss-1']).toBeUndefined();
  });

  it('resolves a link endpoint against a subsystem newly added in the same collection (upsert ordering)', () => {
    const store = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {
          'sys-mod-1': {
            containerSystemId: '10',
            displayName: 'AudioDecoder',
            inputPorts: [],
            moduleId: '200',
            moduleName: 'AudioDecoder',
            moduleType: '',
            outputPorts: [],
            position: {x: 0, y: 0},
            subgraphSystemId: '1',
            systemId: 'sys-mod-1',
          },
        },
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {},
      },
    });

    store.getState().applyAddedCollection({
      controlLinks: [],
      dataLinks: [
        makeDataLinkDto({
          destinationSystemId: 'sys-ss-1',
          sourceSystemId: 'sys-mod-1',
          systemId: 'link-1',
        }),
      ],
      spfModules: [],
      subsystems: [makeSubsystemDto()],
    });

    const conn = store
      .getState()
      .graphData!.connections.find((c) => c.systemId === 'link-1');
    expect(conn?.destinationSystemId).toBe('sys-ss-1');
  });
});

describe('recomputeContainersAndSubgraphs', () => {
  it('re-derives containers/subgraphs from moduleInstances, dropping any that no longer have a surviving module', async () => {
    const store = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {
          'old-container': {
            containerSystemId: 'old-container',
            moduleInstances: ['gone-module'],
            subgraphSystemId: 'old-subgraph',
          },
        },
        moduleInstances: {
          'mod-1': {
            containerSystemId: 'container-1',
            displayName: 'Mod 1',
            inputPorts: [],
            moduleId: '100',
            moduleName: 'Mod 1',
            moduleType: '',
            outputPorts: [],
            position: {x: 0, y: 0},
            subgraphSystemId: 'subgraph-1',
            systemId: 'mod-1',
          },
        },
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {},
      },
    });

    await store.getState().recomputeContainersAndSubgraphs();

    const {containers, subgraphs} = store.getState().graphData!;
    expect(Object.keys(containers)).toEqual(['container-1']);
    expect(containers['container-1'].moduleInstances).toEqual(['mod-1']);
    expect(Object.keys(subgraphs)).toEqual(['subgraph-1']);
    expect(subgraphs['subgraph-1'].containers).toEqual(['container-1']);
  });

  it('carries a module diffState onto its subgraph', async () => {
    const store = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {
          'mod-1': {
            containerSystemId: 'container-1',
            diffState: 'added',
            displayName: 'Mod 1',
            inputPorts: [],
            moduleId: '100',
            moduleName: 'Mod 1',
            moduleType: '',
            outputPorts: [],
            position: {x: 0, y: 0},
            subgraphSystemId: 'subgraph-1',
            systemId: 'mod-1',
          },
        },
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {},
      },
    });

    await store.getState().recomputeContainersAndSubgraphs();

    expect(store.getState().graphData!.subgraphs['subgraph-1'].diffState).toBe(
      'added',
    );
  });

  it('fetches real names only for subgraphs newly created by this mutation, leaving already-named subgraphs untouched', async () => {
    const store = makeStore();
    mockGetSubgraphsByIds.mockResolvedValueOnce({
      data: [
        {
          name: 'Real New Subgraph',
          naturalId: 2,
          relatedEndPointLinks: [],
          SGKV: [],
          subGraphSharedType: 'AUDIO_PLAYBACK',
          systemId: 'subgraph-new',
        },
      ],
      message: undefined,
      success: true,
    });
    store.setState({
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {
          'mod-existing': {
            containerSystemId: 'container-1',
            displayName: 'Mod Existing',
            inputPorts: [],
            moduleId: '100',
            moduleName: 'Mod Existing',
            moduleType: '',
            outputPorts: [],
            position: {x: 0, y: 0},
            subgraphSystemId: 'subgraph-existing',
            systemId: 'mod-existing',
          },
          'mod-new': {
            containerSystemId: 'container-2',
            displayName: 'Mod New',
            inputPorts: [],
            moduleId: '100',
            moduleName: 'Mod New',
            moduleType: '',
            outputPorts: [],
            position: {x: 0, y: 0},
            subgraphSystemId: 'subgraph-new',
            systemId: 'mod-new',
          },
        },
        selectedUsecases: [],
        subgraphs: {
          'subgraph-existing': {
            containers: ['container-1'],
            subgraphName: 'Existing Subgraph',
            subgraphSystemId: 'subgraph-existing',
            subgraphType: 'AUDIO_RECORD',
          },
        },
        subsystems: {},
      },
    });

    await store.getState().recomputeContainersAndSubgraphs();

    expect(mockGetSubgraphsByIds).toHaveBeenCalledWith('proj-1', [
      'subgraph-new',
    ]);
    const {subgraphs} = store.getState().graphData!;
    expect(subgraphs['subgraph-existing'].subgraphName).toBe(
      'Existing Subgraph',
    );
    expect(subgraphs['subgraph-new'].subgraphName).toBe('Real New Subgraph');
    expect(subgraphs['subgraph-new'].subgraphType).toBe('AUDIO_PLAYBACK');
  });
});

describe('pruneDeletedLinkBookkeeping', () => {
  it('removes a deleted link from its pair entry, dropping the pair once both link arrays are empty', () => {
    const store = makeStore();
    store.setState({
      excludedLinks: [
        {
          destinationPortSystemId: 'p2',
          destinationSystemId: 'm2',
          isInterUsecase: false,
          linkKind: 'data',
          sourcePortSystemId: 'p1',
          sourceSystemId: 'm1',
          systemId: 'link-deleted',
        },
        {
          destinationPortSystemId: 'p4',
          destinationSystemId: 'm4',
          isInterUsecase: false,
          linkKind: 'data',
          sourcePortSystemId: 'p3',
          sourceSystemId: 'm3',
          systemId: 'link-survivor',
        },
      ],
      pairLinksById: {
        'sg-1:sg-2': {
          controlLinks: [],
          dataLinks: [makeDataLinkDto({systemId: 'link-deleted'})],
          destinationSubgraphSystemId: 'sg-2',
          sourceSubgraphSystemId: 'sg-1',
        },
        'sg-3:sg-4': {
          controlLinks: [],
          dataLinks: [makeDataLinkDto({systemId: 'link-survivor'})],
          destinationSubgraphSystemId: 'sg-4',
          sourceSubgraphSystemId: 'sg-3',
        },
      },
    });

    store.getState().pruneDeletedLinkBookkeeping(['link-deleted']);

    expect(store.getState().pairLinksById['sg-1:sg-2']).toBeUndefined();
    expect(store.getState().pairLinksById['sg-3:sg-4']?.dataLinks).toHaveLength(
      1,
    );
    expect(store.getState().excludedLinks.map((l) => l.systemId)).toEqual([
      'link-survivor',
    ]);
  });

  it('filters the deleted link out of a pair without dropping the pair when a sibling link survives', () => {
    const store = makeStore();
    store.setState({
      pairLinksById: {
        'sg-1:sg-2': {
          controlLinks: [],
          dataLinks: [
            makeDataLinkDto({systemId: 'link-deleted'}),
            makeDataLinkDto({systemId: 'link-survivor'}),
          ],
          destinationSubgraphSystemId: 'sg-2',
          sourceSubgraphSystemId: 'sg-1',
        },
      },
    });

    store.getState().pruneDeletedLinkBookkeeping(['link-deleted']);

    const pair = store.getState().pairLinksById['sg-1:sg-2'];
    expect(pair?.dataLinks.map((l) => l.systemId)).toEqual(['link-survivor']);
  });

  it('is a no-op when the deleted bucket has no links', () => {
    const store = makeStore();
    const before = store.getState();

    store.getState().pruneDeletedLinkBookkeeping([]);

    expect(store.getState().pairLinksById).toBe(before.pairLinksById);
    expect(store.getState().excludedLinks).toBe(before.excludedLinks);
  });
});

describe('adjustSurvivingPortCounts', () => {
  it('increments totalLinksAtPort on both endpoints of an added link', () => {
    const store = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {
          'mod-dst': moduleWithPort({
            portId: '20',
            systemId: 'mod-dst',
            totalLinksAtPort: 1,
          }),
          'mod-src': moduleWithPort({
            portId: '10',
            systemId: 'mod-src',
            totalLinksAtPort: 0,
          }),
        },
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {},
      },
    });

    store.getState().adjustSurvivingPortCounts(
      [
        makeDataLinkDto({
          destinationPortSystemId: '20',
          destinationSystemId: 'mod-dst',
          sourcePortSystemId: '10',
          sourceSystemId: 'mod-src',
        }),
      ],
      [],
    );

    const {moduleInstances} = store.getState().graphData!;
    expect(moduleInstances['mod-src'].inputPorts[0].totalLinksAtPort).toBe(1);
    expect(moduleInstances['mod-dst'].inputPorts[0].totalLinksAtPort).toBe(2);
  });

  it('decrements totalLinksAtPort on both endpoints of a deleted link', () => {
    const store = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {
          'mod-dst': moduleWithPort({
            portId: '20',
            systemId: 'mod-dst',
            totalLinksAtPort: 2,
          }),
          'mod-src': moduleWithPort({
            portId: '10',
            systemId: 'mod-src',
            totalLinksAtPort: 1,
          }),
        },
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {},
      },
    });

    store.getState().adjustSurvivingPortCounts(
      [],
      [
        makeDataLinkDto({
          destinationPortSystemId: '20',
          destinationSystemId: 'mod-dst',
          sourcePortSystemId: '10',
          sourceSystemId: 'mod-src',
        }),
      ],
    );

    const {moduleInstances} = store.getState().graphData!;
    expect(moduleInstances['mod-src'].inputPorts[0].totalLinksAtPort).toBe(0);
    expect(moduleInstances['mod-dst'].inputPorts[0].totalLinksAtPort).toBe(1);
  });

  it('silently skips an endpoint that no longer exists (deleted in the same cascade, or a subsystem hop)', () => {
    const store = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {
          'mod-src': moduleWithPort({
            portId: '10',
            systemId: 'mod-src',
            totalLinksAtPort: 0,
          }),
        },
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {},
      },
    });

    expect(() =>
      store.getState().adjustSurvivingPortCounts(
        [
          makeDataLinkDto({
            destinationPortSystemId: '20',
            destinationSystemId: 'mod-gone',
            sourcePortSystemId: '10',
            sourceSystemId: 'mod-src',
          }),
        ],
        [],
      ),
    ).not.toThrow();

    expect(
      store.getState().graphData!.moduleInstances['mod-src'].inputPorts[0]
        .totalLinksAtPort,
    ).toBe(1);
  });

  it('matches by portSystemId rather than portId when adjusting counts for added/deleted links with differing id/systemId', () => {
    const store = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {
          'mod-dst': moduleWithPort({
            portId: '999', // numeric id, distinct from portSystemId below
            portSystemId: 'sys-port-777',
            systemId: 'mod-dst',
            totalLinksAtPort: 1,
          }),
          'mod-src': moduleWithPort({
            portId: '777', // numeric id, collides with the other port's portId
            portSystemId: 'sys-port-999',
            systemId: 'mod-src',
            totalLinksAtPort: 0,
          }),
        },
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {},
      },
    });

    store.getState().adjustSurvivingPortCounts(
      [
        makeDataLinkDto({
          destinationPortSystemId: 'sys-port-777',
          destinationSystemId: 'mod-dst',
          sourcePortSystemId: 'sys-port-999',
          sourceSystemId: 'mod-src',
        }),
      ],
      [],
    );

    const {moduleInstances} = store.getState().graphData!;
    expect(moduleInstances['mod-src'].inputPorts[0].totalLinksAtPort).toBe(1);
    expect(moduleInstances['mod-dst'].inputPorts[0].totalLinksAtPort).toBe(2);
  });
});

describe('createGraphDataSlice - store-only property updates', () => {
  function makeStoreWithGraphData() {
    const store = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {
          'cnt-1': {
            containerSystemId: 'cnt-1',
            moduleInstances: ['mod-1', 'mod-2'],
            subgraphSystemId: 'sg-1',
          },
        },
        moduleInstances: {
          'mod-1': {
            containerSystemId: 'cnt-1',
            displayName: 'Module 1',
            inputPorts: [],
            moduleId: '100',
            moduleName: 'Module 1',
            moduleType: '',
            outputPorts: [],
            position: {x: 0, y: 0},
            subgraphSystemId: 'sg-1',
            systemId: 'mod-1',
          },
          'mod-2': {
            containerSystemId: 'cnt-1',
            displayName: 'Module 2',
            inputPorts: [],
            moduleId: '200',
            moduleName: 'Module 2',
            moduleType: '',
            outputPorts: [],
            position: {x: 0, y: 0},
            subgraphSystemId: 'sg-1',
            systemId: 'mod-2',
          },
        },
        selectedUsecases: [],
        subgraphs: {
          'sg-1': {
            containers: ['cnt-1'],
            subgraphName: 'Subgraph 1',
            subgraphSystemId: 'sg-1',
            subgraphType: '',
          },
        },
        subsystems: {
          'ss-1': {
            childSubsystemIds: [],
            controlPorts: [],
            dataPorts: [],
            subgraphs: [],
            subsystemId: 'ss-1',
            subsystemName: 'Subsystem 1',
          },
        },
      },
      isDirty: false,
    });
    return store;
  }

  beforeEach(() => {
    mockPatchSpfModule.mockClear();
  });

  it('updates module alias locally without calling module patch', () => {
    const store = makeStoreWithGraphData();

    store.getState().updateModuleAliasLocal('mod-1', 'New Alias');

    expect(
      store.getState().graphData?.moduleInstances['mod-1'].displayName,
    ).toBe('New Alias');
    expect(mockPatchSpfModule).not.toHaveBeenCalled();
    expect(store.getState().isDirty).toBe(true);
  });

  it('updates subgraph name locally', () => {
    const store = makeStoreWithGraphData();

    store.getState().updateSubgraphNameLocal('sg-1', 'Main');

    expect(store.getState().graphData?.subgraphs['sg-1'].subgraphName).toBe(
      'Main',
    );
    expect(mockPatchSpfModule).not.toHaveBeenCalled();
    expect(store.getState().isDirty).toBe(true);
  });

  it('updates subsystem name locally', () => {
    const store = makeStoreWithGraphData();

    store.getState().updateSubsystemNameLocal('ss-1', 'Playback');

    expect(store.getState().graphData?.subsystems['ss-1'].subsystemName).toBe(
      'Playback',
    );
    expect(mockPatchSpfModule).not.toHaveBeenCalled();
    expect(store.getState().isDirty).toBe(true);
  });

  it('renames a container locally and moves member modules to the new id', () => {
    const store = makeStoreWithGraphData();

    store.getState().updateContainerIdLocal('cnt-1', 'cnt-2');

    const graphData = store.getState().graphData!;
    expect(graphData.containers['cnt-1']).toBeUndefined();
    expect(graphData.containers['cnt-2']).toEqual({
      containerSystemId: 'cnt-1',
      moduleInstances: ['mod-1', 'mod-2'],
      subgraphSystemId: 'sg-1',
      systemId: 'cnt-2',
    });
    expect(graphData.moduleInstances['mod-1'].containerSystemId).toBe('cnt-2');
    expect(graphData.moduleInstances['mod-2'].containerSystemId).toBe('cnt-2');
    expect(mockPatchSpfModule).not.toHaveBeenCalled();
    expect(store.getState().isDirty).toBe(true);
  });

  it('updates module container locally', () => {
    const store = makeStoreWithGraphData();

    store.getState().updateModuleContainerLocal('mod-1', 'cnt-2');

    const graphData = store.getState().graphData!;
    expect(graphData.moduleInstances['mod-1'].containerSystemId).toBe('cnt-2');
    expect(graphData.containers['cnt-1']).toEqual({
      moduleInstances: ['mod-2'],
      subgraphSystemId: 'sg-1',
      systemId: 'cnt-1',
    });
    expect(graphData.containers['cnt-2']).toEqual({
      moduleInstances: ['mod-1'],
      subgraphSystemId: 'sg-1',
      systemId: 'cnt-2',
    });
    expect(graphData.subgraphs['sg-1']).toEqual({
      containers: ['cnt-2', 'cnt-1'],
      subgraphName: 'Subgraph 1',
      subgraphType: '',
      systemId: 'sg-1',
    });
    expect(mockPatchSpfModule).not.toHaveBeenCalled();
    expect(store.getState().isDirty).toBe(true);
  });

  it('updates module port count fields locally', () => {
    const store = makeStoreWithGraphData();

    store.getState().updateModulePortCountLocal('mod-1', 'maxInputPorts', 2);
    store.getState().updateModulePortCountLocal('mod-1', 'maxOutputPorts', 3);
    store.getState().updateModulePortCountLocal('mod-1', 'maxControlPorts', 4);

    expect(store.getState().graphData?.moduleInstances['mod-1']).toEqual(
      expect.objectContaining({
        maxControlPorts: 4,
        maxInputPorts: 2,
        maxOutputPorts: 3,
      }),
    );
    expect(mockPatchSpfModule).not.toHaveBeenCalled();
    expect(store.getState().isDirty).toBe(true);
  });
});

describe('applyComponentCollection', () => {
  it('merges added/updated/deleted modules and links, then recomputes containers/subgraphs, prunes link bookkeeping, and adjusts port counts in one pass', async () => {
    const store = makeStore();
    store.setState({
      excludedLinks: [
        {
          destinationPortSystemId: '20',
          destinationSystemId: 'mod-old-dst',
          isInterUsecase: false,
          linkKind: 'data',
          sourcePortSystemId: '10',
          sourceSystemId: 'mod-old-src',
          systemId: 'old-link',
        },
      ],
      graphData: {
        connections: [
          {
            destinationPortSystemId: '20',
            destinationSystemId: 'mod-old-dst',
            isInterUsecase: false,
            linkKind: 'data',
            sourcePortSystemId: '10',
            sourceSystemId: 'mod-old-src',
            systemId: 'old-link',
          },
        ],
        containers: {},
        moduleInstances: {
          'mod-old-dst': moduleWithPort({
            portId: '20',
            systemId: 'mod-old-dst',
            totalLinksAtPort: 1,
          }),
          'mod-old-src': moduleWithPort({
            portId: '10',
            systemId: 'mod-old-src',
            totalLinksAtPort: 1,
          }),
        },
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {},
      },
      pairLinksById: {
        'sg-1:sg-2': {
          controlLinks: [],
          dataLinks: [makeDataLinkDto({systemId: 'old-link'})],
          destinationSubgraphSystemId: 'sg-2',
          sourceSubgraphSystemId: 'sg-1',
        },
      },
    });

    const empty = {controlLinks: [], dataLinks: [], spfModules: []};

    await store.getState().applyComponentCollection({
      added: {
        ...empty,
        dataLinks: [
          makeDataLinkDto({
            destinationPortSystemId: '20',
            destinationSystemId: 'mod-old-dst',
            sourcePortSystemId: '10',
            sourceSystemId: 'mod-old-src',
            systemId: 'new-link',
          }),
        ],
      },
      deleted: {
        controlLinks: [],
        dataLinks: ['old-link'],
        spfModules: [],
      },
      updated: empty,
    });

    const state = store.getState();
    // Port counts adjusted for both the new link (+1) and the removed
    // fixture link (-1) on the same two surviving endpoints:
    expect(
      state.graphData!.moduleInstances['mod-old-src'].inputPorts[0]
        .totalLinksAtPort,
    ).toBe(1);
    expect(
      state.graphData!.moduleInstances['mod-old-dst'].inputPorts[0]
        .totalLinksAtPort,
    ).toBe(1);
    // Link bookkeeping pruned for the deleted link id — the pair entry is
    // dropped entirely since its only link was the one deleted:
    expect(state.pairLinksById['sg-1:sg-2']).toBeUndefined();
    expect(state.excludedLinks).toEqual([]);
  });

  it('reuses an existing subgraph when an added module references the same subgraph id', async () => {
    const store = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {
          'container-10': {
            containerSystemId: 'container-10',
            moduleInstances: ['mod-existing'],
            subgraphSystemId: 'subgraph-1',
          },
        },
        moduleInstances: {
          'mod-existing': {
            containerSystemId: 'container-10',
            displayName: 'Existing',
            inputPorts: [],
            moduleId: '100',
            moduleName: 'Existing',
            moduleType: '',
            outputPorts: [],
            position: {x: 0, y: 0},
            subgraphSystemId: 'subgraph-1',
            systemId: 'mod-existing',
          },
        },
        selectedUsecases: [],
        subgraphs: {
          'subgraph-1': {
            containers: ['container-10'],
            subgraphName: 'Existing Subgraph',
            subgraphSystemId: 'subgraph-1',
            subgraphType: 'AUDIO_RECORD',
          },
        },
        subsystems: {},
      },
    });

    await store.getState().applyComponentCollection({
      added: {
        controlLinks: [],
        dataLinks: [],
        spfModules: [
          makeSpfModuleDto({
            containerSystemId: 'container-10',
            subgraphSystemId: 'subgraph-1',
            systemId: 'mod-created',
          }),
        ],
      },
      deleted: {
        controlLinks: [],
        dataLinks: [],
        spfModules: [],
      },
      updated: {
        controlLinks: [],
        dataLinks: [],
        spfModules: [],
      },
    });

    const state = store.getState();
    expect(mockGetSubgraphsByIds).not.toHaveBeenCalled();
    expect(Object.keys(state.graphData!.subgraphs)).toEqual(['subgraph-1']);
    expect(state.graphData!.subgraphs['subgraph-1']).toEqual({
      containers: ['container-10'],
      subgraphName: 'Existing Subgraph',
      subgraphType: 'AUDIO_RECORD',
      systemId: 'subgraph-1',
    });
    expect(state.graphData!.containers['container-10'].moduleInstances).toEqual(
      ['mod-existing', 'mod-created'],
    );
  });
});

describe('createGraphDataSlice — ModuleInstance ckvs/tags (D1)', () => {
  const ckv = {
    keyValuePairs: [],
    supportedParameters: [],
    systemId: 'ckv-1',
  };
  const tag = {
    naturalId: 1,
    systemId: 'tag-1',
    tagName: 'tag',
    tkvs: [],
  };

  it('populates ckvs and tags from the module DTO when present', async () => {
    const dtoWithCkvsTags = {
      ...minimalDto,
      spfModules: [{...minimalDto.spfModules[0], ckvs: [ckv], tags: [tag]}],
    };
    const store = makeStore([]);
    mockGetUsecaseComponents.mockResolvedValueOnce({
      data: dtoWithCkvsTags as never,
      message: undefined,
      success: true,
    });

    await store.getState().loadGraphData(['uc-1']);

    const instance = store.getState().graphData?.moduleInstances['sys-mod-1'];
    expect(instance?.ckvs).toEqual([ckv]);
    expect(instance?.tags).toEqual([tag]);
  });

  it('leaves ckvs and tags undefined when absent on the module DTO', async () => {
    const store = makeStore([]);
    mockGetUsecaseComponents.mockResolvedValueOnce({
      data: minimalDto as never,
      message: undefined,
      success: true,
    });

    await store.getState().loadGraphData(['uc-1']);

    const instance = store.getState().graphData?.moduleInstances['sys-mod-1'];
    expect(instance?.ckvs).toBeUndefined();
    expect(instance?.tags).toBeUndefined();
  });
});

describe('graphDataSlice — activeLinks / portSystemId / portId', () => {
  it('computes activeLinks per port by counting matching connections, keyed by port systemId', async () => {
    const store = makeStore([]);
    mockGetUsecaseComponents.mockResolvedValueOnce({
      data: {
        controlLinks: [],
        dataLinks: [
          makeDataLinkDto({
            destinationPortSystemId: 'sys-port-20',
            destinationSystemId: 'sys-mod-2',
            sourcePortSystemId: 'sys-port-10',
            sourceSystemId: 'sys-mod-1',
            systemId: 'link-1',
          }),
          makeDataLinkDto({
            destinationPortSystemId: 'sys-port-20',
            destinationSystemId: 'sys-mod-2',
            sourcePortSystemId: 'sys-port-10',
            sourceSystemId: 'sys-mod-1',
            systemId: 'link-2',
          }),
        ],
        spfModules: [
          makeSpfModuleDto({
            dataPorts: [
              {
                changeInfo: {changeType: 'CREATE'},
                name: 'out1',
                naturalId: 10,
                portIoType: 'Output',
                portType: 'Static',
                relatedEndPointLinks: [],
                systemId: 'sys-port-10',
                totalLinksAtPort: 2,
              },
            ],
            systemId: 'sys-mod-1',
          }),
          makeSpfModuleDto({
            dataPorts: [
              {
                changeInfo: {changeType: 'CREATE'},
                name: 'in1',
                naturalId: 20,
                portIoType: 'Input',
                portType: 'Static',
                relatedEndPointLinks: [],
                systemId: 'sys-port-20',
                totalLinksAtPort: 2,
              },
            ],
            systemId: 'sys-mod-2',
          }),
        ],
        subsystems: [],
      },
      message: undefined as never,
      success: true,
    });

    await store.getState().loadGraphData(['uc-1']);

    const source = store.getState().graphData!.moduleInstances['sys-mod-1'];
    const dest = store.getState().graphData!.moduleInstances['sys-mod-2'];
    expect(source.outputPorts[0].activeLinks).toBe(2);
    expect(dest.inputPorts[0].activeLinks).toBe(2);
  });

  it('sets portId to the numeric-derived id (String(p.id)) and portSystemId to the systemId', async () => {
    const store = makeStore([]);
    mockGetUsecaseComponents.mockResolvedValueOnce({
      data: {
        controlLinks: [],
        dataLinks: [],
        spfModules: [
          makeSpfModuleDto({
            dataPorts: [
              {
                changeInfo: {changeType: 'CREATE'},
                name: 'out1',
                naturalId: 42,
                portIoType: 'Output',
                portType: 'Static',
                relatedEndPointLinks: [],
                systemId: 'sys-port-42',
                totalLinksAtPort: 0,
              },
            ],
            systemId: 'sys-mod-1',
          }),
        ],
        subsystems: [],
      },
      message: undefined as never,
      success: true,
    });

    await store.getState().loadGraphData(['uc-1']);

    const port =
      store.getState().graphData!.moduleInstances['sys-mod-1'].outputPorts[0];
    expect(port.portId).toBe('42');
    expect(port.portSystemId).toBe('sys-port-42');
  });

  it('computes activeLinks by portSystemId, not by the numeric id, when they differ', async () => {
    const store = makeStore([]);
    mockGetUsecaseComponents.mockResolvedValueOnce({
      data: {
        controlLinks: [],
        dataLinks: [
          makeDataLinkDto({
            destinationPortSystemId: 'sys-port-999',
            destinationSystemId: 'sys-mod-2',
            sourcePortSystemId: 'sys-port-777',
            sourceSystemId: 'sys-mod-1',
            systemId: 'link-1',
          }),
        ],
        spfModules: [
          makeSpfModuleDto({
            dataPorts: [
              {
                changeInfo: {changeType: 'CREATE'},
                name: 'out1',
                // Numeric id intentionally collides with the *other*
                // port's systemId suffix (777 vs. 999) — the lookup below
                // must key off systemId, not id, or this would coincidentally
                // pass.
                naturalId: 999,
                portIoType: 'Output',
                portType: 'Static',
                relatedEndPointLinks: [],
                systemId: 'sys-port-777',
                totalLinksAtPort: 1,
              },
            ],
            systemId: 'sys-mod-1',
          }),
          makeSpfModuleDto({
            dataPorts: [
              {
                changeInfo: {changeType: 'CREATE'},
                name: 'in1',
                naturalId: 777,
                portIoType: 'Input',
                portType: 'Static',
                relatedEndPointLinks: [],
                systemId: 'sys-port-999',
                totalLinksAtPort: 1,
              },
            ],
            systemId: 'sys-mod-2',
          }),
        ],
        subsystems: [],
      },
      message: undefined as never,
      success: true,
    });

    await store.getState().loadGraphData(['uc-1']);

    const source = store.getState().graphData!.moduleInstances['sys-mod-1'];
    const dest = store.getState().graphData!.moduleInstances['sys-mod-2'];
    expect(source.outputPorts[0].portId).toBe('999');
    expect(source.outputPorts[0].portSystemId).toBe('sys-port-777');
    expect(source.outputPorts[0].activeLinks).toBe(1);
    expect(dest.inputPorts[0].portId).toBe('777');
    expect(dest.inputPorts[0].portSystemId).toBe('sys-port-999');
    expect(dest.inputPorts[0].activeLinks).toBe(1);
  });

  it('defaults activeLinks to 0 for a port with no matching connection', async () => {
    const store = makeStore([]);
    mockGetUsecaseComponents.mockResolvedValueOnce({
      data: {
        controlLinks: [],
        dataLinks: [],
        spfModules: [
          makeSpfModuleDto({
            dataPorts: [
              {
                changeInfo: {changeType: 'CREATE'},
                name: 'out1',
                naturalId: 1,
                portIoType: 'Output',
                portType: 'Static',
                relatedEndPointLinks: [],
                systemId: 'sys-port-1',
                totalLinksAtPort: 0,
              },
            ],
            systemId: 'sys-mod-1',
          }),
        ],
        subsystems: [],
      },
      message: undefined as never,
      success: true,
    });

    await store.getState().loadGraphData(['uc-1']);

    const port =
      store.getState().graphData!.moduleInstances['sys-mod-1'].outputPorts[0];
    expect(port.activeLinks).toBe(0);
  });

  it('leaves totalLinksAtPort under its existing name, unaffected by the activeLinks addition', async () => {
    const store = makeStore([]);
    mockGetUsecaseComponents.mockResolvedValueOnce({
      data: {
        controlLinks: [],
        dataLinks: [],
        spfModules: [
          makeSpfModuleDto({
            dataPorts: [
              {
                changeInfo: {changeType: 'CREATE'},
                name: 'out1',
                naturalId: 1,
                portIoType: 'Output',
                portType: 'Static',
                relatedEndPointLinks: [],
                systemId: 'sys-port-1',
                totalLinksAtPort: 7,
              },
            ],
            systemId: 'sys-mod-1',
          }),
        ],
        subsystems: [],
      },
      message: undefined as never,
      success: true,
    });

    await store.getState().loadGraphData(['uc-1']);

    const port =
      store.getState().graphData!.moduleInstances['sys-mod-1'].outputPorts[0];
    expect(port.totalLinksAtPort).toBe(7);
  });

  it('populates activeLinks for control ports the same way as data ports', async () => {
    const store = makeStore([]);
    mockGetUsecaseComponents.mockResolvedValueOnce({
      data: {
        controlLinks: [
          makeDataLinkDto({
            destinationPortSystemId: 'sys-ctrl-99',
            destinationSystemId: 'sys-mod-2',
            sourcePortSystemId: 'sys-ctrl-5',
            sourceSystemId: 'sys-mod-1',
            systemId: 'ctrl-link-1',
          }),
        ],
        dataLinks: [],
        spfModules: [
          makeSpfModuleDto({
            controlPorts: [
              {
                changeInfo: {changeType: 'CREATE'},
                controlPortName: 'ctrl-out',
                intents: [],
                name: 'ctrl-out',
                naturalId: 5,
                portType: 'Static',
                relatedEndPointLinks: [],
                systemId: 'sys-ctrl-5',
                totalLinksAtPort: 1,
              },
            ],
            systemId: 'sys-mod-1',
          }),
          makeSpfModuleDto({systemId: 'sys-mod-2'}),
        ],
        subsystems: [],
      },
      message: undefined as never,
      success: true,
    });

    await store.getState().loadGraphData(['uc-1']);

    const ctrlPort =
      store.getState().graphData!.moduleInstances['sys-mod-1'].inputPorts[0];
    expect(ctrlPort.activeLinks).toBe(1);
  });
});
