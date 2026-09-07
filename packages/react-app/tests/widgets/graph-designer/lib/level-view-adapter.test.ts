/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import {
  buildLevelViewFromGraphData,
  buildSubsystemLevelViewFromGraphData,
} from '~widgets/graph-designer/lib/level-view-adapter';

const baseData: UsecaseGraphData = {
  connections: [],
  containers: {
    '10': {
      containerId: '10',
      moduleInstances: ['sys-mod-1'],
      subgraphId: '5',
    },
  },
  moduleInstances: {
    'sys-mod-1': {
      containerId: '10',
      displayName: 'AudioDecoder',
      inputPorts: [],
      moduleId: '200',
      moduleInstanceId: 'sys-mod-1',
      moduleName: 'AudioDecoder',
      moduleType: 'WR_SHARED_MEM_EP',
      outputPorts: [],
      position: {x: 0, y: 0},
      subgraphId: '5',
    },
  },
  selectedUsecases: [],
  subgraphs: {
    '5': {
      containers: ['10'],
      subgraphId: '5',
      subgraphName: 'SG5',
      subgraphType: '',
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

describe('buildLevelViewFromGraphData — SubgraphNode.parentId (B5, N7)', () => {
  it('populates backend systemId metadata for selectable graph elements', () => {
    const lv = buildLevelViewFromGraphData(
      {
        ...baseData,
        connections: [
          {
            connectionId: 'conn-1',
            connectionType: 'data',
            fromModuleId: 'sys-mod-1',
            fromPortId: 'p-out',
            isDangling: false,
            toModuleId: 'sys-mod-1',
            toPortId: 'p-in',
          },
        ],
      },
      'level-1',
    );

    expect(lv.modules?.[0]?.meta?.systemId).toBe('sys-mod-1');
    expect(lv.containers?.[0]?.meta?.systemId).toBe('10');
    expect(lv.subgraphs?.[0]?.meta?.systemId).toBe('5');
    expect(lv.subsystems?.[0]?.meta?.systemId).toBe('sys-ss-20');
    expect(lv.dataLinks?.[0]?.meta?.systemId).toBe('conn-1');
  });

  it('sets parentId on a SubgraphNode when its subgraphId is listed in Subsystem.subgraphs', () => {
    const lv = buildLevelViewFromGraphData(baseData, 'level-1');

    const subgraph = lv.subgraphs?.find((sg) => sg.subgraphId === 5);
    expect(subgraph).toBeDefined();
    expect(subgraph?.parentId).toBe('sys-ss-20');
  });

  it('leaves parentId undefined on a SubgraphNode that belongs to no subsystem', () => {
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
    expect(subgraph?.parentId).toBeUndefined();
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
        '11': {containerId: '11', moduleInstances: ['sys-mod-2'], subgraphId: '6'},
      },
      moduleInstances: {
        ...baseData.moduleInstances,
        'sys-mod-2': {
          containerId: '11',
          displayName: 'OtherModule',
          inputPorts: [],
          moduleId: '201',
          moduleInstanceId: 'sys-mod-2',
          moduleName: 'OtherModule',
          moduleType: '',
          outputPorts: [],
          position: {x: 0, y: 0},
          subgraphId: '6',
        },
      },
      subgraphs: {
        ...baseData.subgraphs,
        '6': {containers: ['11'], subgraphId: '6', subgraphName: 'SG6', subgraphType: ''},
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

    const lv = buildSubsystemLevelViewFromGraphData(data, 'sys-ss-20', 'level-1');

    expect(lv).not.toBeNull();
    expect(lv!.modules?.map((m) => m.id)).toEqual(['sys-mod-1']);
    expect(lv!.subgraphs?.map((sg) => sg.subgraphId)).toEqual([5]);
  });

  it('drops a link whose other endpoint is outside the scope', () => {
    const data: UsecaseGraphData = {
      ...baseData,
      connections: [
        {
          connectionId: 'cross-link',
          connectionType: 'data',
          fromModuleId: 'sys-mod-1',
          fromPortId: 'p-out',
          isDangling: false,
          toModuleId: 'sys-mod-2',
          toPortId: 'p-in',
        },
      ],
      containers: {
        ...baseData.containers,
        '11': {containerId: '11', moduleInstances: ['sys-mod-2'], subgraphId: '6'},
      },
      moduleInstances: {
        ...baseData.moduleInstances,
        'sys-mod-2': {
          containerId: '11',
          displayName: 'OtherModule',
          inputPorts: [],
          moduleId: '201',
          moduleInstanceId: 'sys-mod-2',
          moduleName: 'OtherModule',
          moduleType: '',
          outputPorts: [],
          position: {x: 0, y: 0},
          subgraphId: '6',
        },
      },
      subgraphs: {
        ...baseData.subgraphs,
        '6': {containers: ['11'], subgraphId: '6', subgraphName: 'SG6', subgraphType: ''},
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

    const lv = buildSubsystemLevelViewFromGraphData(data, 'sys-ss-20', 'level-1');

    expect(lv!.dataLinks).toHaveLength(0);
    expect(lv!.controlLinks).toHaveLength(0);
  });

  it('keeps a link between two modules both inside the scope', () => {
    const data: UsecaseGraphData = {
      ...baseData,
      connections: [
        {
          connectionId: 'inner-link',
          connectionType: 'data',
          fromModuleId: 'sys-mod-1',
          fromPortId: 'p-out',
          isDangling: false,
          toModuleId: 'sys-mod-3',
          toPortId: 'p-in',
        },
      ],
      containers: {
        ...baseData.containers,
        '12': {containerId: '12', moduleInstances: ['sys-mod-3'], subgraphId: '5'},
      },
      moduleInstances: {
        ...baseData.moduleInstances,
        'sys-mod-3': {
          containerId: '12',
          displayName: 'InnerModule',
          inputPorts: [],
          moduleId: '202',
          moduleInstanceId: 'sys-mod-3',
          moduleName: 'InnerModule',
          moduleType: '',
          outputPorts: [],
          position: {x: 0, y: 0},
          subgraphId: '5',
        },
      },
    };

    const lv = buildSubsystemLevelViewFromGraphData(data, 'sys-ss-20', 'level-1');

    expect(lv!.dataLinks).toHaveLength(1);
    expect(lv!.dataLinks![0].id).toBe('inner-link');
  });

  it('includes descendant subsystems, modules, and internal links', () => {
    const data: UsecaseGraphData = {
      ...baseData,
      connections: [
        {
          connectionId: 'module-to-child',
          connectionType: 'data',
          fromModuleId: 'sys-mod-1',
          fromPortId: 'p-out',
          isDangling: false,
          toModuleId: 'sys-ss-21',
          toPortId: 'p-in',
        },
        {
          connectionId: 'child-to-module',
          connectionType: 'data',
          fromModuleId: 'sys-ss-21',
          fromPortId: 'p-out',
          isDangling: false,
          toModuleId: 'sys-mod-2',
          toPortId: 'p-in',
        },
        {
          connectionId: 'child-to-grandchild',
          connectionType: 'data',
          fromModuleId: 'sys-ss-21',
          fromPortId: 'p-out',
          isDangling: false,
          toModuleId: 'sys-ss-22',
          toPortId: 'p-in',
        },
        {
          connectionId: 'outside-link',
          connectionType: 'data',
          fromModuleId: 'sys-mod-1',
          fromPortId: 'p-out',
          isDangling: false,
          toModuleId: 'outside-module',
          toPortId: 'p-in',
        },
        {
          connectionId: 'parent-boundary-link',
          connectionType: 'data',
          fromModuleId: 'sys-ss-20',
          fromPortId: 'p-out',
          isDangling: false,
          toModuleId: 'sys-mod-1',
          toPortId: 'p-in',
        },
      ],
      containers: {
        ...baseData.containers,
        '11': {
          containerId: '11',
          moduleInstances: ['sys-mod-2'],
          subgraphId: '6',
        },
        '12': {
          containerId: '12',
          moduleInstances: ['sys-mod-3'],
          subgraphId: '7',
        },
      },
      moduleInstances: {
        ...baseData.moduleInstances,
        'sys-mod-2': {
          containerId: '11',
          displayName: 'ChildModule',
          inputPorts: [],
          moduleId: '201',
          moduleInstanceId: 'sys-mod-2',
          moduleName: 'ChildModule',
          moduleType: '',
          outputPorts: [],
          position: {x: 0, y: 0},
          subgraphId: '6',
        },
        'sys-mod-3': {
          containerId: '12',
          displayName: 'GrandchildModule',
          inputPorts: [],
          moduleId: '202',
          moduleInstanceId: 'sys-mod-3',
          moduleName: 'GrandchildModule',
          moduleType: '',
          outputPorts: [],
          position: {x: 0, y: 0},
          subgraphId: '7',
        },
      },
      subgraphs: {
        ...baseData.subgraphs,
        '6': {
          containers: ['11'],
          subgraphId: '6',
          subgraphName: 'SG6',
          subgraphType: '',
        },
        '7': {
          containers: ['12'],
          subgraphId: '7',
          subgraphName: 'SG7',
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

    const lv = buildSubsystemLevelViewFromGraphData(data, 'sys-ss-20', 'level-1');

    expect(lv!.modules?.map((m) => m.id)).toEqual([
      'sys-mod-1',
      'sys-mod-2',
      'sys-mod-3',
    ]);
    const subsystemIds = lv!.subsystems?.map((ss) => ss.subsystemId) ?? [];
    expect(subsystemIds).toContain('sys-ss-21');
    expect(subsystemIds).toContain('sys-ss-22');
    expect(lv!.dataLinks?.map((link) => link.id)).toEqual([
      'module-to-child',
      'child-to-module',
      'child-to-grandchild',
    ]);
  });

  it('passes the given levelId through to the result', () => {
    const lv = buildSubsystemLevelViewFromGraphData(baseData, 'sys-ss-20', 'level-1');

    expect(lv!.levelId).toBe('level-1');
  });
});

describe('buildLevelViewFromGraphData — isDangling passthrough', () => {
  const dataWithConnection = (
    connectionType: 'control' | 'data',
    isDangling: boolean,
  ): UsecaseGraphData => ({
    ...baseData,
    connections: [
      {
        connectionId: 'conn-1',
        connectionType,
        fromModuleId: 'sys-mod-1',
        fromPortId: 'p-out',
        isDangling,
        toModuleId: 'sys-mod-1',
        toPortId: 'p-in',
      },
    ],
  });

  it.each([
    ['data', true],
    ['data', false],
    ['control', true],
    ['control', false],
  ] as const)(
    'copies isDangling: %s from a %s Connection onto the matching link',
    (connectionType, isDangling) => {
      const lv = buildLevelViewFromGraphData(
        dataWithConnection(connectionType, isDangling),
        'level-1',
      );

      const link =
        connectionType === 'data' ? lv.dataLinks?.[0] : lv.controlLinks?.[0];
      expect(link?.isDangling).toBe(isDangling);
    },
  );
});
