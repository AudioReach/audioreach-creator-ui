/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');
jest.mock('~entities/usecases/api/usecases-api');
jest.mock('~shared/store/project-store-registry', () => ({
  projectStoreRegistry: {
    get: jest.fn(() => undefined),
  },
}));

import {createStore} from 'zustand';

import {getUsecaseComponents} from '~entities/usecases/api/usecases-api';
import {
  createEditSessionSlice,
  type EditSessionSlice,
} from '~features/graph-designer/model/edit-session-slice';
import {
  createGraphDataSlice,
  type GraphDataSlice,
  type ModuleInstance,
} from '~features/graph-designer/model/graph-data-slice';
import {
  createModuleListSlice,
  type ModuleDefinition,
  type ModuleListSlice,
} from '~features/graph-designer/model/module-list-slice';

import {
  makeDataLinkDto,
  makeSpfModuleDto,
  makeSubsystemDto,
} from './test-utils/component-dto-fixtures';

const mockGetUsecaseComponents = jest.mocked(getUsecaseComponents);

type TestStore = GraphDataSlice & ModuleListSlice & EditSessionSlice;

function makeStore(moduleList: ModuleDefinition[] = []) {
  const store = createStore<TestStore>((set, get) => ({
    ...createGraphDataSlice(set, get, 'proj-1'),
    ...createModuleListSlice(set, get, 'proj-1'),
    ...createEditSessionSlice(set, 'proj-1'),
  }));
  if (moduleList.length > 0) {
    store.setState({moduleList});
  }
  return store;
}

function moduleWithPort(overrides: {
  id: number;
  moduleInstanceId: string;
  portId: string;
  totalLinksAtPort: number;
}): ModuleInstance {
  return {
    containerId: 'c1',
    displayName: 'M',
    id: overrides.id,
    inputPorts: [
      {
        direction: 'input',
        isStatic: false,
        portId: overrides.portId,
        portName: 'in',
        portType: 'data',
        totalLinksAtPort: overrides.totalLinksAtPort,
      },
    ],
    moduleId: '1',
    moduleInstanceId: overrides.moduleInstanceId,
    moduleName: 'M',
    moduleType: '',
    outputPorts: [],
    position: {x: 0, y: 0},
    subgraphId: 'sg-1',
  };
}

const minimalDto = {
  controlLinks: [],
  dataLinks: [],
  spfModules: [
    {
      alias: '',
      containerId: 10,
      controlPorts: [],
      dataPorts: [],
      id: 1,
      moduleId: 200,
      name: 'AudioDecoder',
      subgraphId: 1,
      systemId: 'sys-mod-1',
    },
  ],
  subsystems: [],
};

describe('createGraphDataSlice — moduleType resolution', () => {
  it('resolves moduleType from moduleList moduleType when a matching definition exists', async () => {
    const store = makeStore([
      {
        builtIn: false,
        category: 'WR_SHARED_MEM_EP',
        description: '',
        dspType: 'ADSP',
        inputPorts: [],
        moduleId: '200',
        moduleName: 'AudioDecoder',
        moduleType: 'SOURCE',
        outputPorts: [],
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
        moduleId: '999', // different moduleId — won't match
        moduleName: 'SomeSink',
        moduleType: 'SINK',
        outputPorts: [],
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

describe('createGraphDataSlice — Subsystem.subgraphs population (B5)', () => {
  const dtoWithSubsystem = {
    controlLinks: [],
    dataLinks: [],
    spfModules: [
      {
        alias: '',
        containerId: 10,
        controlPorts: [],
        dataPorts: [],
        id: 1,
        moduleId: 200,
        name: 'AudioDecoder',
        // parentId links the module's subgraph to subsystem id=20
        parentId: 20,
        subgraphId: 5,
        systemId: 'sys-mod-1',
      },
    ],
    subsystems: [
      {
        controlPorts: [],
        dataPorts: [],
        id: 20,
        name: 'AudioSubsystem',
        systemId: 'sys-ss-20',
      },
    ],
  };

  it('populates Subsystem.subgraphs with the subgraph IDs whose modules have parentId matching the subsystem', async () => {
    const store = makeStore([]);
    mockGetUsecaseComponents.mockResolvedValueOnce({
      data: dtoWithSubsystem as never,
      message: undefined,
      success: true,
    });

    await store.getState().loadGraphData(['uc-1']);

    const subsystem = store.getState().graphData?.subsystems['sys-ss-20'];
    expect(subsystem?.subgraphs).toContain('5');
  });

  it('leaves Subsystem.subgraphs empty when no module has a parentId linking it to that subsystem', async () => {
    const dtoNoParentId = {
      ...dtoWithSubsystem,
      spfModules: [{...dtoWithSubsystem.spfModules[0], parentId: undefined}],
    };
    const store = makeStore([]);
    mockGetUsecaseComponents.mockResolvedValueOnce({
      data: dtoNoParentId as never,
      message: undefined,
      success: true,
    });

    await store.getState().loadGraphData(['uc-1']);

    const subsystem = store.getState().graphData?.subsystems['sys-ss-20'];
    expect(subsystem?.subgraphs).toHaveLength(0);
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
        moduleId: '200',
        moduleName: 'AudioDecoder',
        moduleType: 'SOURCE',
        outputPorts: [],
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
    expect(instance.id).toBe(1);
  });

  it('preserves an existing module\'s position when it is upserted again (an "updated" entry)', () => {
    const store = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {
          'sys-mod-1': {
            containerId: '10',
            displayName: 'AudioDecoder',
            id: 1,
            inputPorts: [],
            moduleId: '200',
            moduleInstanceId: 'sys-mod-1',
            moduleName: 'AudioDecoder',
            moduleType: '',
            outputPorts: [],
            position: {x: 42, y: 7},
            subgraphId: '1',
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

  it('removes a module from moduleInstances via applyDeletedCollection', () => {
    const store = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {
          'sys-mod-1': {
            containerId: '10',
            displayName: 'AudioDecoder',
            id: 1,
            inputPorts: [],
            moduleId: '200',
            moduleInstanceId: 'sys-mod-1',
            moduleName: 'AudioDecoder',
            moduleType: '',
            outputPorts: [],
            position: {x: 0, y: 0},
            subgraphId: '1',
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
      spfModules: [makeSpfModuleDto()],
    });

    expect(
      store.getState().graphData!.moduleInstances['sys-mod-1'],
    ).toBeUndefined();
  });
});

describe('applyAddedCollection / applyDeletedCollection — links', () => {
  it('upserts a data link, resolving a module endpoint and a subsystem endpoint by numeric id', () => {
    const store = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {
          'sys-mod-1': {
            containerId: '10',
            displayName: 'AudioDecoder',
            id: 1,
            inputPorts: [],
            moduleId: '200',
            moduleInstanceId: 'sys-mod-1',
            moduleName: 'AudioDecoder',
            moduleType: '',
            outputPorts: [],
            position: {x: 0, y: 0},
            subgraphId: '1',
          },
        },
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {
          'sys-ss-1': {
            controlPorts: [],
            dataPorts: [],
            id: 99,
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
        makeDataLinkDto({destinationId: 99, sourceId: 1, systemId: 'link-1'}),
      ],
      spfModules: [],
    });

    const conn = store
      .getState()
      .graphData!.connections.find((c) => c.connectionId === 'link-1');
    expect(conn).toEqual({
      connectionId: 'link-1',
      connectionType: 'data',
      fromModuleId: 'sys-mod-1',
      fromPortId: '10',
      toModuleId: 'sys-ss-1',
      toPortId: '20',
    });
  });

  it('removes a link via applyDeletedCollection, leaving other connections untouched', () => {
    const store = makeStore();
    store.setState({
      graphData: {
        connections: [
          {
            connectionId: 'link-1',
            connectionType: 'data',
            fromModuleId: 'sys-mod-1',
            fromPortId: '10',
            toModuleId: 'sys-ss-1',
            toPortId: '20',
          },
          {
            connectionId: 'link-survivor',
            connectionType: 'data',
            fromModuleId: 'sys-mod-2',
            fromPortId: '11',
            toModuleId: 'sys-mod-3',
            toPortId: '21',
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
      dataLinks: [makeDataLinkDto({systemId: 'link-1'})],
      spfModules: [],
    });

    expect(
      store.getState().graphData!.connections.map((c) => c.connectionId),
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
    expect(ss.id).toBe(99);
    expect(ss.subgraphs).toEqual([]);
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
            controlPorts: [],
            dataPorts: [],
            id: 99,
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
            controlPorts: [],
            dataPorts: [],
            id: 99,
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
      subsystems: [makeSubsystemDto()],
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
            containerId: '10',
            displayName: 'AudioDecoder',
            id: 1,
            inputPorts: [],
            moduleId: '200',
            moduleInstanceId: 'sys-mod-1',
            moduleName: 'AudioDecoder',
            moduleType: '',
            outputPorts: [],
            position: {x: 0, y: 0},
            subgraphId: '1',
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
        makeDataLinkDto({destinationId: 99, sourceId: 1, systemId: 'link-1'}),
      ],
      spfModules: [],
      subsystems: [makeSubsystemDto()],
    });

    const conn = store
      .getState()
      .graphData!.connections.find((c) => c.connectionId === 'link-1');
    expect(conn?.toModuleId).toBe('sys-ss-1');
  });
});

describe('recomputeContainersAndSubgraphs', () => {
  it('re-derives containers/subgraphs from moduleInstances, dropping any that no longer have a surviving module', () => {
    const store = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {
          'old-container': {
            containerId: 'old-container',
            containerName: 'stale',
            moduleInstances: ['gone-module'],
            subgraphId: 'old-subgraph',
          },
        },
        moduleInstances: {
          'mod-1': {
            containerId: 'container-1',
            displayName: 'Mod 1',
            id: 1,
            inputPorts: [],
            moduleId: '100',
            moduleInstanceId: 'mod-1',
            moduleName: 'Mod 1',
            moduleType: '',
            outputPorts: [],
            position: {x: 0, y: 0},
            subgraphId: 'subgraph-1',
          },
        },
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {},
      },
    });

    store.getState().recomputeContainersAndSubgraphs();

    const {containers, subgraphs} = store.getState().graphData!;
    expect(Object.keys(containers)).toEqual(['container-1']);
    expect(containers['container-1'].moduleInstances).toEqual(['mod-1']);
    expect(Object.keys(subgraphs)).toEqual(['subgraph-1']);
    expect(subgraphs['subgraph-1'].containers).toEqual(['container-1']);
  });

  it('carries a module diffState onto its subgraph', () => {
    const store = makeStore();
    store.setState({
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {
          'mod-1': {
            containerId: 'container-1',
            diffState: 'added',
            displayName: 'Mod 1',
            id: 1,
            inputPorts: [],
            moduleId: '100',
            moduleInstanceId: 'mod-1',
            moduleName: 'Mod 1',
            moduleType: '',
            outputPorts: [],
            position: {x: 0, y: 0},
            subgraphId: 'subgraph-1',
          },
        },
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {},
      },
    });

    store.getState().recomputeContainersAndSubgraphs();

    expect(store.getState().graphData!.subgraphs['subgraph-1'].diffState).toBe(
      'added',
    );
  });
});

describe('pruneDeletedLinkBookkeeping', () => {
  it('removes a deleted link from its pair entry, dropping the pair once both link arrays are empty', () => {
    const store = makeStore();
    store.setState({
      excludedLinks: [
        {
          connectionId: 'link-deleted',
          connectionType: 'data',
          fromModuleId: 'm1',
          fromPortId: 'p1',
          toModuleId: 'm2',
          toPortId: 'p2',
        },
        {
          connectionId: 'link-survivor',
          connectionType: 'data',
          fromModuleId: 'm3',
          fromPortId: 'p3',
          toModuleId: 'm4',
          toPortId: 'p4',
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

    store.getState().pruneDeletedLinkBookkeeping({
      controlLinks: [],
      dataLinks: [makeDataLinkDto({systemId: 'link-deleted'})],
      spfModules: [],
    });

    expect(store.getState().pairLinksById['sg-1:sg-2']).toBeUndefined();
    expect(store.getState().pairLinksById['sg-3:sg-4']?.dataLinks).toHaveLength(
      1,
    );
    expect(store.getState().excludedLinks.map((l) => l.connectionId)).toEqual([
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

    store.getState().pruneDeletedLinkBookkeeping({
      controlLinks: [],
      dataLinks: [makeDataLinkDto({systemId: 'link-deleted'})],
      spfModules: [],
    });

    const pair = store.getState().pairLinksById['sg-1:sg-2'];
    expect(pair?.dataLinks.map((l) => l.systemId)).toEqual(['link-survivor']);
  });

  it('is a no-op when the deleted bucket has no links', () => {
    const store = makeStore();
    const before = store.getState();

    store.getState().pruneDeletedLinkBookkeeping({
      controlLinks: [],
      dataLinks: [],
      spfModules: [],
    });

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
            id: 2,
            moduleInstanceId: 'mod-dst',
            portId: '20',
            totalLinksAtPort: 1,
          }),
          'mod-src': moduleWithPort({
            id: 1,
            moduleInstanceId: 'mod-src',
            portId: '10',
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
          destinationId: 2,
          destinationPortId: 20,
          sourceId: 1,
          sourcePortId: 10,
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
            id: 2,
            moduleInstanceId: 'mod-dst',
            portId: '20',
            totalLinksAtPort: 2,
          }),
          'mod-src': moduleWithPort({
            id: 1,
            moduleInstanceId: 'mod-src',
            portId: '10',
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
          destinationId: 2,
          destinationPortId: 20,
          sourceId: 1,
          sourcePortId: 10,
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
            id: 1,
            moduleInstanceId: 'mod-src',
            portId: '10',
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
            destinationId: 999,
            destinationPortId: 20,
            sourceId: 1,
            sourcePortId: 10,
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
});

describe('applyComponentCollection', () => {
  it('merges added/updated/deleted modules and links, then recomputes containers/subgraphs, prunes link bookkeeping, and adjusts port counts in one pass', () => {
    const store = makeStore();
    store.setState({
      excludedLinks: [
        {
          connectionId: 'old-link',
          connectionType: 'data',
          fromModuleId: 'mod-old-src',
          fromPortId: '10',
          toModuleId: 'mod-old-dst',
          toPortId: '20',
        },
      ],
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {
          'mod-old-dst': moduleWithPort({
            id: 2,
            moduleInstanceId: 'mod-old-dst',
            portId: '20',
            totalLinksAtPort: 1,
          }),
          'mod-old-src': moduleWithPort({
            id: 1,
            moduleInstanceId: 'mod-old-src',
            portId: '10',
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

    store.getState().applyComponentCollection({
      added: {
        ...empty,
        dataLinks: [
          makeDataLinkDto({
            destinationId: 2,
            destinationPortId: 20,
            sourceId: 1,
            sourcePortId: 10,
            systemId: 'new-link',
          }),
        ],
      },
      deleted: {
        ...empty,
        dataLinks: [makeDataLinkDto({systemId: 'old-link'})],
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
});

describe('createGraphDataSlice — ModuleInstance ckvs/tags (D1)', () => {
  const ckv = {
    keyValueCollection: [],
    supportedParameters: [],
    systemId: 'ckv-1',
  };
  const tag = {
    systemId: 'tag-1',
    tagId: 1,
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
