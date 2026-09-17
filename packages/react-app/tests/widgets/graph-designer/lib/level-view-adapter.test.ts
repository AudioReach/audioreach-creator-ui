/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import {NODE_DIMENSIONS} from '~features/usecase-visualizer';
import {
  buildLevelViewFromGraphData,
  buildSubsystemLevelViewFromGraphData,
} from '~widgets/graph-designer/lib/level-view-adapter';

const baseData: UsecaseGraphData = {
  connections: [],
  containers: {
    '10': {
      moduleInstances: ['sys-mod-1'],
      naturalId: 10,
      subgraphSystemId: '5',
      systemId: '10',
    },
  },
  moduleInstances: {
    'sys-mod-1': {
      containerSystemId: '10',
      displayName: 'AudioDecoder',
      inputPorts: [],
      moduleDefinitionSystemId: '200',
      moduleName: 'AudioDecoder',
      moduleType: 'WR_SHARED_MEM_EP',
      naturalId: 200,
      outputPorts: [],
      position: {x: 0, y: 0},
      subgraphSystemId: '5',
      systemId: 'sys-mod-1',
    },
  },
  selectedUsecases: [],
  subgraphs: {
    '5': {
      containers: ['10'],
      naturalId: 5,
      subgraphName: 'SG5',
      subgraphType: '',
      systemId: '5',
    },
  },
  subsystems: {
    'sys-ss-20': {
      childSubsystemIds: [],
      controlPorts: [],
      dataPorts: [],
      subgraphs: ['5'],
      subsystemId: 'sys-ss-20',
      subsystemName: 'AudioSubsystem',
    },
  },
};

describe('buildLevelViewFromGraphData — subsystem black boxes', () => {
  it('uses natural IDs for subgraph nodes with opaque system IDs', () => {
    const lv = buildLevelViewFromGraphData(
      {
        ...baseData,
        subgraphs: {
          'subgraph-system-5': {
            ...baseData.subgraphs['5'],
            naturalId: 5,
            systemId: 'subgraph-system-5',
          },
        },
      },
      'level-1',
    );

    expect(lv.subgraphs?.[0]?.subgraphId).toBe(5);
  });

  it('populates backend systemId metadata for selectable graph elements', () => {
    const dataWithoutSubsystemOwnership: UsecaseGraphData = {
      ...baseData,
      subsystems: {},
    };
    const lv = buildLevelViewFromGraphData(
      {
        ...dataWithoutSubsystemOwnership,
        connections: [
          {
            destinationPortSystemId: 'p-in',
            destinationSystemId: 'sys-mod-1',
            linkKind: 'data',
            linkType: 'NORMAL',
            sourcePortSystemId: 'p-out',
            sourceSystemId: 'sys-mod-1',
            systemId: 'conn-1',
          },
        ],
      },
      'level-1',
    );

    expect(lv.modules?.[0]?.meta?.systemId).toBe('sys-mod-1');
    expect(lv.containers?.[0]?.meta?.systemId).toBe('10');
    expect(lv.subgraphs?.[0]?.meta?.systemId).toBe('5');
    expect(lv.dataLinks?.[0]?.meta?.systemId).toBe('conn-1');

    const subsystemLv = buildLevelViewFromGraphData(baseData, 'level-1');
    expect(subsystemLv.subsystems?.[0]?.meta?.systemId).toBe('sys-ss-20');
  });

  it('uses container natural IDs for node labels and IDs', () => {
    const lv = buildLevelViewFromGraphData(
      {...baseData, subsystems: {}},
      'level-1',
    );

    expect(lv.containers?.[0]).toMatchObject({
      containerId: 10,
      label: 'Container 10',
    });
  });

  it('omits child subgraphs, containers, and modules when a subsystem owns the subgraph', () => {
    const lv = buildLevelViewFromGraphData(
      {
        ...baseData,
        connections: [
          {
            destinationPortSystemId: 'p-in',
            destinationSystemId: 'sys-mod-1',
            linkKind: 'data',
            linkType: 'NORMAL',
            sourcePortSystemId: 'p-out',
            sourceSystemId: 'sys-mod-1',
            systemId: 'conn-1',
          },
        ],
      },
      'level-1',
    );

    expect(lv.subsystems).toHaveLength(1);
    expect(lv.subgraphs).toHaveLength(0);
    expect(lv.containers).toHaveLength(0);
    expect(lv.modules).toHaveLength(0);
    expect(lv.dataLinks).toHaveLength(0);
  });

  it('omits child subsystems from the current level view', () => {
    const lv = buildLevelViewFromGraphData(
      {
        ...baseData,
        subsystems: {
          'sys-ss-20': {
            ...baseData.subsystems['sys-ss-20'],
            childSubsystemIds: ['sys-ss-child'],
          },
          'sys-ss-child': {
            childSubsystemIds: [],
            controlPorts: [],
            dataPorts: [],
            parentSubsystemId: 'sys-ss-20',
            subgraphs: [],
            subsystemId: 'sys-ss-child',
            subsystemName: 'ChildSubsystem',
          },
        },
      },
      'level-1',
    );

    expect(lv.subsystems?.map((ss) => ss.id)).toEqual(['sys-ss-20']);
  });

  it('keeps a subgraph visible when it does not belong to a subsystem', () => {
    const dataNoLink: UsecaseGraphData = {
      ...baseData,
      subsystems: {
        'sys-ss-20': {
          ...baseData.subsystems['sys-ss-20'],
          subgraphs: [], // subgraph '5' not listed
        },
      },
    };

    const lv = buildLevelViewFromGraphData(dataNoLink, 'level-1');

    const subgraph = lv.subgraphs?.find((sg) => sg.subgraphId === 5);
    expect(subgraph).toBeDefined();
  });
});

describe('scoped boundary links', () => {
  it('exposes inner links through the focused subsystem boundary', () => {
    const moduleInstance = (id: string, subgraphSystemId: string) => ({
      ...baseData.moduleInstances['sys-mod-1'],
      subgraphSystemId,
      systemId: id,
    });
    const link = (
      systemId: string,
      linkKind: 'control' | 'data',
      sourceSystemId: string,
      destinationSystemId: string,
      sourcePortSystemId = `${sourceSystemId}-port`,
      destinationPortSystemId = `${destinationSystemId}-port`,
    ) => ({
      destinationPortSystemId,
      destinationSystemId,
      linkKind,
      linkType: 'NORMAL',
      sourcePortSystemId,
      sourceSystemId,
      systemId,
    });
    const data: UsecaseGraphData = {
      ...baseData,
      connections: [
        link(
          'inner-m15-to-ss-out',
          'data',
          'M15',
          'ss-1',
          'M15-port',
          'ss-out',
        ),
        link('inner-ss-in-1-to-m6', 'data', 'ss-1', 'M6', 'ss-in-1'),
        link('inner-ss-in-2-to-m11', 'data', 'ss-1', 'M11', 'ss-in-2'),
        link(
          'inner-ss-control-1-to-m7',
          'control',
          'ss-1',
          'M7',
          'ss-control-1',
        ),
        link(
          'inner-ss-control-2-to-m9',
          'control',
          'ss-1',
          'M9',
          'ss-control-2',
        ),
        link('outer-m3-to-ss-in', 'data', 'M3', 'ss-1'),
        link('outer-ss-out-to-m5', 'data', 'ss-1', 'M5'),
        link('outer-m16-to-m15', 'data', 'M16', 'M15'),
      ],
      moduleInstances: {
        M3: moduleInstance('M3', 'sg-external'),
        M5: moduleInstance('M5', 'sg-external'),
        M6: moduleInstance('M6', 'sg-1'),
        M7: moduleInstance('M7', 'sg-1'),
        M9: moduleInstance('M9', 'sg-1'),
        M11: moduleInstance('M11', 'sg-1'),
        M15: moduleInstance('M15', 'sg-1'),
        M16: moduleInstance('M16', 'sg-external'),
      },
      subgraphs: {
        'sg-1': {
          containers: [],
          subgraphName: 'Scoped',
          subgraphSystemId: 'sg-1',
          subgraphType: 'graph',
        },
        'sg-external': {
          containers: [],
          subgraphName: 'External',
          subgraphSystemId: 'sg-external',
          subgraphType: 'graph',
        },
      },
      subsystems: {
        'ss-1': {
          childSubsystemIds: [],
          controlPorts: [
            {
              direction: 'input',
              portId: 'ss-control-1',
              portName: 'Control 1',
              portType: 'control',
            },
            {
              direction: 'input',
              portId: 'ss-control-2',
              portName: 'Control 2',
              portType: 'control',
            },
          ],
          dataPorts: [
            {
              direction: 'input',
              portId: 'ss-in-1',
              portName: 'Input 1',
              portType: 'data',
            },
            {
              direction: 'input',
              portId: 'ss-in-2',
              portName: 'Input 2',
              portType: 'data',
            },
            {
              direction: 'output',
              portId: 'ss-out',
              portName: 'Output',
              portType: 'data',
            },
          ],
          subgraphs: ['sg-1'],
          subsystemId: 'ss-1',
          subsystemName: 'Subsystem 1',
        },
      },
    };
    const level = buildSubsystemLevelViewFromGraphData(data, 'ss-1', 'scoped');

    expect(level?.boundarySubsystem).toMatchObject({
      id: 'ss-1',
      subsystemId: 'ss-1',
    });
    expect(level?.modules?.map((node) => node.id)).toEqual([
      'M6',
      'M7',
      'M9',
      'M11',
      'M15',
    ]);
    expect(level?.boundarySubsystem?.id).toBe('ss-1');
    expect(level?.dataLinks?.map((edge) => edge.id).sort()).toEqual([
      'inner-m15-to-ss-out',
      'inner-ss-in-1-to-m6',
      'inner-ss-in-2-to-m11',
    ]);
    expect(level?.controlLinks?.map((edge) => edge.id).sort()).toEqual([
      'inner-ss-control-1-to-m7',
      'inner-ss-control-2-to-m9',
    ]);
    expect(level?.dataLinks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'inner-m15-to-ss-out',
          sourceNodeId: 'M15',
          sourcePortId: 'M15-port',
          targetNodeId: 'ss-1',
          targetPortId: 'ss-out',
        }),
        expect.objectContaining({
          id: 'inner-ss-in-1-to-m6',
          sourceNodeId: 'ss-1',
          sourcePortId: 'ss-in-1',
          targetNodeId: 'M6',
          targetPortId: 'M6-port',
        }),
      ]),
    );
    expect(level?.controlLinks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'inner-ss-control-1-to-m7',
          sourceNodeId: 'ss-1',
          sourcePortId: 'ss-control-1',
          targetNodeId: 'M7',
          targetPortId: 'M7-port',
        }),
        expect.objectContaining({
          id: 'inner-ss-control-2-to-m9',
          sourceNodeId: 'ss-1',
          sourcePortId: 'ss-control-2',
          targetNodeId: 'M9',
          targetPortId: 'M9-port',
        }),
      ]),
    );
    expect(level?.dataLinks?.some((edge) => edge.id.startsWith('outer-'))).toBe(
      false,
    );
    expect(
      level?.boundarySubsystem?.ports
        .filter((port) => port.portIoType === 'control')
        .map((port) => port.id),
    ).toEqual(['ss-control-1', 'ss-control-2']);
    expect(
      buildLevelViewFromGraphData(data, 'top').boundarySubsystem,
    ).toBeUndefined();
    expect(
      buildSubsystemLevelViewFromGraphData(data, 'unknown', 'scoped'),
    ).toBeNull();
  });
});

describe('buildLevelViewFromGraphData — SubsystemNode dimensions', () => {
  it('sets visible default dimensions on subsystem nodes', () => {
    const lv = buildLevelViewFromGraphData(baseData, 'level-1');

    const subsystem = lv.subsystems?.find((ss) => ss.id === 'sys-ss-20');
    expect(subsystem).toMatchObject({
      height: NODE_DIMENSIONS.subsystem.baseHeight,
      width: NODE_DIMENSIONS.subsystem.width,
    });
  });
});

describe('buildLevelViewFromGraphData - duplicate connections', () => {
  it('omits duplicate connection ids from the level view', () => {
    const lv = buildLevelViewFromGraphData(
      {
        ...baseData,
        connections: [
          {
            destinationPortSystemId: 'p-in',
            destinationSystemId: 'sys-mod-1',
            linkKind: 'data',
            linkType: 'NORMAL',
            sourcePortSystemId: 'p-out',
            sourceSystemId: 'sys-mod-1',
            systemId: 'duplicate-data-link',
          },
          {
            destinationPortSystemId: 'p-in',
            destinationSystemId: 'sys-mod-1',
            linkKind: 'data',
            linkType: 'NORMAL',
            sourcePortSystemId: 'p-out',
            sourceSystemId: 'sys-mod-1',
            systemId: 'duplicate-data-link',
          },
          {
            destinationPortSystemId: 'ctrl-in',
            destinationSystemId: 'sys-mod-1',
            linkKind: 'control',
            linkType: 'NORMAL',
            sourcePortSystemId: 'ctrl-out',
            sourceSystemId: 'sys-mod-1',
            systemId: 'duplicate-control-link',
          },
          {
            destinationPortSystemId: 'ctrl-in',
            destinationSystemId: 'sys-mod-1',
            linkKind: 'control',
            linkType: 'NORMAL',
            sourcePortSystemId: 'ctrl-out',
            sourceSystemId: 'sys-mod-1',
            systemId: 'duplicate-control-link',
          },
        ],
        subsystems: {},
      },
      'level-1',
    );

    expect(lv.dataLinks?.map((link) => link.id)).toEqual([
      'duplicate-data-link',
    ]);
    expect(lv.controlLinks?.map((link) => link.id)).toEqual([
      'duplicate-control-link',
    ]);
  });
});

describe('buildSubsystemLevelViewFromGraphData', () => {
  it('returns null for an unknown subsystem id', () => {
    expect(
      buildSubsystemLevelViewFromGraphData(baseData, 'not-real', 'level-1'),
    ).toBeNull();
  });

  it("includes only that subsystem's own content and excludes unrelated subsystem content", () => {
    const data: UsecaseGraphData = {
      ...baseData,
      containers: {
        ...baseData.containers,
        '11': {
          containerSystemId: '11',
          moduleInstances: ['sys-mod-2'],
          subgraphSystemId: '6',
        },
      },
      moduleInstances: {
        ...baseData.moduleInstances,
        'sys-mod-2': {
          containerSystemId: '11',
          displayName: 'OtherModule',
          inputPorts: [],
          moduleId: '201',
          moduleName: 'OtherModule',
          moduleType: '',
          outputPorts: [],
          position: {x: 0, y: 0},
          subgraphSystemId: '6',
          systemId: 'sys-mod-2',
        },
      },
      subgraphs: {
        ...baseData.subgraphs,
        '6': {
          containers: ['11'],
          subgraphName: 'SG6',
          subgraphSystemId: '6',
          subgraphType: '',
        },
      },
      subsystems: {
        ...baseData.subsystems,
        'sys-ss-21': {
          childSubsystemIds: [],
          controlPorts: [],
          dataPorts: [],
          subgraphs: ['6'],
          subsystemId: 'sys-ss-21',
          subsystemName: 'OtherSubsystem',
        },
      },
    };

    const lv = buildSubsystemLevelViewFromGraphData(
      data,
      'sys-ss-20',
      'level-1',
    );

    expect(lv).not.toBeNull();
    expect(lv!.modules?.map((m) => m.id)).toEqual(['sys-mod-1']);
    expect(lv!.subgraphs?.map((sg) => sg.subgraphId)).toEqual([5]);
  });

  it('drops a link whose other endpoint is outside the scope', () => {
    const data: UsecaseGraphData = {
      ...baseData,
      connections: [
        {
          destinationPortSystemId: 'p-in',
          destinationSystemId: 'sys-mod-2',
          linkKind: 'data',
          linkType: 'NORMAL',
          sourcePortSystemId: 'p-out',
          sourceSystemId: 'sys-mod-1',
          systemId: 'cross-link',
        },
      ],
      containers: {
        ...baseData.containers,
        '11': {
          containerSystemId: '11',
          moduleInstances: ['sys-mod-2'],
          subgraphSystemId: '6',
        },
      },
      moduleInstances: {
        ...baseData.moduleInstances,
        'sys-mod-2': {
          containerSystemId: '11',
          displayName: 'OtherModule',
          inputPorts: [],
          moduleId: '201',
          moduleName: 'OtherModule',
          moduleType: '',
          outputPorts: [],
          position: {x: 0, y: 0},
          subgraphSystemId: '6',
          systemId: 'sys-mod-2',
        },
      },
      subgraphs: {
        ...baseData.subgraphs,
        '6': {
          containers: ['11'],
          subgraphName: 'SG6',
          subgraphSystemId: '6',
          subgraphType: '',
        },
      },
      subsystems: {
        ...baseData.subsystems,
        'sys-ss-21': {
          childSubsystemIds: [],
          controlPorts: [],
          dataPorts: [],
          subgraphs: ['6'],
          subsystemId: 'sys-ss-21',
          subsystemName: 'OtherSubsystem',
        },
      },
    };

    const lv = buildSubsystemLevelViewFromGraphData(
      data,
      'sys-ss-20',
      'level-1',
    );

    expect(lv!.dataLinks).toHaveLength(0);
    expect(lv!.controlLinks).toHaveLength(0);
  });

  it('keeps a link between two modules both inside the scope', () => {
    const data: UsecaseGraphData = {
      ...baseData,
      connections: [
        {
          destinationPortSystemId: 'p-in',
          destinationSystemId: 'sys-mod-3',
          linkKind: 'data',
          linkType: 'NORMAL',
          sourcePortSystemId: 'p-out',
          sourceSystemId: 'sys-mod-1',
          systemId: 'inner-link',
        },
      ],
      containers: {
        ...baseData.containers,
        '12': {
          containerSystemId: '12',
          moduleInstances: ['sys-mod-3'],
          subgraphSystemId: '5',
        },
      },
      moduleInstances: {
        ...baseData.moduleInstances,
        'sys-mod-3': {
          containerSystemId: '12',
          displayName: 'InnerModule',
          inputPorts: [],
          moduleId: '202',
          moduleName: 'InnerModule',
          moduleType: '',
          outputPorts: [],
          position: {x: 0, y: 0},
          subgraphSystemId: '5',
          systemId: 'sys-mod-3',
        },
      },
    };

    const lv = buildSubsystemLevelViewFromGraphData(
      data,
      'sys-ss-20',
      'level-1',
    );

    expect(lv!.dataLinks).toHaveLength(1);
    expect(lv!.dataLinks![0].id).toBe('inner-link');
  });

  it('omits duplicate connection ids from scoped subsystem views', () => {
    const data: UsecaseGraphData = {
      ...baseData,
      connections: [
        {
          destinationPortSystemId: 'p-in',
          destinationSystemId: 'sys-mod-3',
          linkKind: 'data',
          linkType: 'NORMAL',
          sourcePortSystemId: 'p-out',
          sourceSystemId: 'sys-mod-1',
          systemId: 'inner-link',
        },
        {
          destinationPortSystemId: 'p-in',
          destinationSystemId: 'sys-mod-3',
          linkKind: 'data',
          linkType: 'NORMAL',
          sourcePortSystemId: 'p-out',
          sourceSystemId: 'sys-mod-1',
          systemId: 'inner-link',
        },
      ],
      containers: {
        ...baseData.containers,
        '12': {
          containerSystemId: '12',
          moduleInstances: ['sys-mod-3'],
          subgraphSystemId: '5',
        },
      },
      moduleInstances: {
        ...baseData.moduleInstances,
        'sys-mod-3': {
          containerSystemId: '12',
          displayName: 'InnerModule',
          inputPorts: [],
          moduleId: '202',
          moduleName: 'InnerModule',
          moduleType: '',
          outputPorts: [],
          position: {x: 0, y: 0},
          subgraphSystemId: '5',
          systemId: 'sys-mod-3',
        },
      },
    };

    const lv = buildSubsystemLevelViewFromGraphData(
      data,
      'sys-ss-20',
      'level-1',
    );

    expect(lv!.dataLinks?.map((link) => link.id)).toEqual(['inner-link']);
  });

  it('shows direct child subsystems as black boxes', () => {
    const data: UsecaseGraphData = {
      ...baseData,
      connections: [
        {
          destinationPortSystemId: 'p-in',
          destinationSystemId: 'sys-ss-21',
          linkKind: 'data',
          linkType: 'NORMAL',
          sourcePortSystemId: 'p-out',
          sourceSystemId: 'sys-mod-1',
          systemId: 'module-to-child',
        },
        {
          destinationPortSystemId: 'p-in',
          destinationSystemId: 'sys-mod-2',
          linkKind: 'data',
          linkType: 'NORMAL',
          sourcePortSystemId: 'p-out',
          sourceSystemId: 'sys-ss-21',
          systemId: 'child-to-module',
        },
        {
          destinationPortSystemId: 'p-in',
          destinationSystemId: 'sys-ss-22',
          linkKind: 'data',
          linkType: 'NORMAL',
          sourcePortSystemId: 'p-out',
          sourceSystemId: 'sys-ss-21',
          systemId: 'child-to-grandchild',
        },
        {
          destinationPortSystemId: 'p-in',
          destinationSystemId: 'outside-module',
          linkKind: 'data',
          linkType: 'NORMAL',
          sourcePortSystemId: 'p-out',
          sourceSystemId: 'sys-mod-1',
          systemId: 'outside-link',
        },
        {
          destinationPortSystemId: 'p-in',
          destinationSystemId: 'sys-mod-1',
          linkKind: 'data',
          linkType: 'NORMAL',
          sourcePortSystemId: 'p-out',
          sourceSystemId: 'sys-ss-20',
          systemId: 'parent-boundary-link',
        },
      ],
      containers: {
        ...baseData.containers,
        '11': {
          containerSystemId: '11',
          moduleInstances: ['sys-mod-2'],
          subgraphSystemId: '6',
        },
        '12': {
          containerSystemId: '12',
          moduleInstances: ['sys-mod-3'],
          subgraphSystemId: '7',
        },
      },
      moduleInstances: {
        ...baseData.moduleInstances,
        'sys-mod-2': {
          containerSystemId: '11',
          displayName: 'ChildModule',
          inputPorts: [],
          moduleId: '201',
          moduleName: 'ChildModule',
          moduleType: '',
          outputPorts: [],
          position: {x: 0, y: 0},
          subgraphSystemId: '6',
          systemId: 'sys-mod-2',
        },
        'sys-mod-3': {
          containerSystemId: '12',
          displayName: 'GrandchildModule',
          inputPorts: [],
          moduleId: '202',
          moduleName: 'GrandchildModule',
          moduleType: '',
          outputPorts: [],
          position: {x: 0, y: 0},
          subgraphSystemId: '7',
          systemId: 'sys-mod-3',
        },
      },
      subgraphs: {
        ...baseData.subgraphs,
        '6': {
          containers: ['11'],
          subgraphName: 'SG6',
          subgraphSystemId: '6',
          subgraphType: '',
        },
        '7': {
          containers: ['12'],
          subgraphName: 'SG7',
          subgraphSystemId: '7',
          subgraphType: '',
        },
      },
      subsystems: {
        'sys-ss-20': {
          ...baseData.subsystems['sys-ss-20'],
          childSubsystemIds: ['sys-ss-21'],
        },
        'sys-ss-21': {
          childSubsystemIds: ['sys-ss-22'],
          controlPorts: [],
          dataPorts: [],
          subgraphs: ['6'],
          subsystemId: 'sys-ss-21',
          subsystemName: 'ChildSubsystem',
        },
        'sys-ss-22': {
          childSubsystemIds: [],
          controlPorts: [],
          dataPorts: [],
          subgraphs: ['7'],
          subsystemId: 'sys-ss-22',
          subsystemName: 'GrandchildSubsystem',
        },
      },
    };

    const lv = buildSubsystemLevelViewFromGraphData(
      data,
      'sys-ss-20',
      'level-1',
    );

    expect(lv!.modules?.map((m) => m.id)).toEqual(['sys-mod-1']);
    const subsystemIds = lv!.subsystems?.map((ss) => ss.subsystemId) ?? [];
    expect(subsystemIds).toEqual(['sys-ss-21']);
    expect(lv!.dataLinks?.map((link) => link.id)).toEqual([
      'module-to-child',
      'parent-boundary-link',
    ]);
  });

  it('passes the given levelId through to the result', () => {
    const lv = buildSubsystemLevelViewFromGraphData(
      baseData,
      'sys-ss-20',
      'level-1',
    );

    expect(lv!.levelId).toBe('level-1');
  });
});

describe('buildLevelViewFromGraphData — dangling link passthrough', () => {
  const dataWithConnection = (
    linkKind: 'control' | 'data',
    isInterUsecase: boolean,
  ): UsecaseGraphData => ({
    ...baseData,
    connections: [
      {
        destinationPortSystemId: 'p-in',
        destinationSystemId: 'sys-mod-1',
        linkKind,
        linkType: isInterUsecase ? 'INTER_USECASE' : 'NORMAL',
        sourcePortSystemId: 'p-out',
        sourceSystemId: 'sys-mod-1',
        systemId: 'conn-1',
      },
    ],
    subsystems: {},
  });

  it.each([
    ['data', true],
    ['data', false],
    ['control', true],
    ['control', false],
  ] as const)(
    'derives isDangling: %s from a %s Connection linkType',
    (linkKind, isInterUsecase) => {
      const lv = buildLevelViewFromGraphData(
        dataWithConnection(linkKind, isInterUsecase),
        'level-1',
      );

      const link =
        linkKind === 'data' ? lv.dataLinks?.[0] : lv.controlLinks?.[0];
      expect(link?.isDangling).toBe(isInterUsecase);
    },
  );
});
