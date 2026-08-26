/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import {buildLevelViewFromGraphData} from '~widgets/graph-designer/lib/level-view-adapter';

jest.mock('~shared/lib/logger');

const graphData: UsecaseGraphData = {
  connections: [
    {
      connectionId: 'link-1',
      connectionType: 'data',
      fromModuleId: 'sys-mod-1',
      fromPortId: '10',
      isDangling: false,
      toModuleId: 'sys-mod-2',
      toPortId: '20',
    },
    {
      connectionId: 'link-2',
      connectionType: 'control',
      fromModuleId: 'sys-mod-1',
      fromPortId: '30',
      isDangling: false,
      toModuleId: 'sys-mod-2',
      toPortId: '40',
    },
  ],
  containers: {
    '5': {
      containerId: '5',
      moduleInstances: ['sys-mod-1', 'sys-mod-2'],
      subgraphId: '1',
    },
  },
  moduleInstances: {
    'sys-mod-1': {
      containerId: '5',
      displayName: 'Decoder',
      inputPorts: [
        {
          activeLinks: 1,
          direction: 'input',
          isStatic: false,
          portId: '10',
          portName: 'in1',
          portSystemId: 'sys-port-10',
          portType: 'data',
          totalLinksAtPort: 2,
        },
        {
          activeLinks: 1,
          direction: 'input',
          isStatic: false,
          portId: '30',
          portName: 'ctrl1',
          portSystemId: 'sys-port-30',
          portType: 'control',
          totalLinksAtPort: 1,
        },
      ],
      moduleId: '100',
      moduleInstanceId: 'sys-mod-1',
      moduleName: 'Decoder',
      moduleType: 'Decoder',
      outputPorts: [
        {
          activeLinks: 0,
          direction: 'output',
          isStatic: false,
          portId: '11',
          portName: 'out1',
          portSystemId: 'sys-port-11',
          portType: 'data',
          totalLinksAtPort: 0,
        },
      ],
      position: {x: 0, y: 0},
      subgraphId: '1',
    },
    'sys-mod-2': {
      containerId: '5',
      displayName: 'Encoder',
      inputPorts: [
        {
          activeLinks: 1,
          direction: 'input',
          isStatic: false,
          portId: '20',
          portName: 'in2',
          portSystemId: 'sys-port-20',
          portType: 'data',
          totalLinksAtPort: 1,
        },
        {
          activeLinks: 1,
          direction: 'input',
          isStatic: false,
          portId: '40',
          portName: 'ctrl2',
          portSystemId: 'sys-port-40',
          portType: 'control',
          totalLinksAtPort: 1,
        },
      ],
      moduleId: '101',
      moduleInstanceId: 'sys-mod-2',
      moduleName: 'Encoder',
      moduleType: 'Encoder',
      outputPorts: [],
      position: {x: 0, y: 0},
      subgraphId: '1',
    },
  },
  selectedUsecases: [],
  subgraphs: {
    '1': {
      containers: ['5'],
      diffState: undefined,
      subgraphId: '1',
      subgraphName: 'SG1',
      subgraphType: '',
    },
  },
  subsystems: {},
};

describe('buildLevelViewFromGraphData', () => {
  it('returns a LevelView with the supplied levelId', () => {
    const view = buildLevelViewFromGraphData(graphData, 'my-level');
    expect(view.levelId).toBe('my-level');
  });

  it('produces two module nodes, each with id === moduleInstanceId and x/y === 0', () => {
    const view = buildLevelViewFromGraphData(graphData, 'L');
    expect(view.modules).toHaveLength(2);

    const ids = (view.modules ?? []).map((m) => m.id).sort();
    expect(ids).toEqual(['sys-mod-1', 'sys-mod-2'].sort());

    for (const mod of view.modules ?? []) {
      expect(mod.x).toBe(0);
      expect(mod.y).toBe(0);
    }
  });

  it('maps sys-mod-1 to 3 ports: one input, one output, one control', () => {
    const view = buildLevelViewFromGraphData(graphData, 'L');
    const mod1 = (view.modules ?? []).find((m) => m.id === 'sys-mod-1');
    expect(mod1).toBeDefined();

    const inputPorts = mod1!.ports.filter((p) => p.portIoType === 'input');
    const outputPorts = mod1!.ports.filter((p) => p.portIoType === 'output');
    const controlPorts = mod1!.ports.filter((p) => p.portIoType === 'control');

    expect(inputPorts).toHaveLength(1);
    expect(outputPorts).toHaveLength(1);
    expect(controlPorts).toHaveLength(1);

    expect(inputPorts[0].id).toBe('sys-port-10');
    expect(outputPorts[0].id).toBe('sys-port-11');
    expect(controlPorts[0].id).toBe('sys-port-30');
  });

  it('produces one data link with edgeKind "data", sourceNodeId "sys-mod-1" and sourcePortId "10"', () => {
    const view = buildLevelViewFromGraphData(graphData, 'L');
    expect(view.dataLinks).toHaveLength(1);

    const link = view.dataLinks![0];
    expect(link.edgeKind).toBe('data');
    expect(link.sourceNodeId).toBe('sys-mod-1');
    expect(link.sourcePortId).toBe('10');
    expect(link.id).toBe('link-1');
  });

  it('produces one control link with edgeKind "control"', () => {
    const view = buildLevelViewFromGraphData(graphData, 'L');
    expect(view.controlLinks).toHaveLength(1);

    const link = view.controlLinks![0];
    expect(link.edgeKind).toBe('control');
    expect(link.id).toBe('link-2');
  });

  it('produces one container with id "container-5:1"', () => {
    const view = buildLevelViewFromGraphData(graphData, 'L');
    expect(view.containers).toHaveLength(1);
    expect(view.containers![0].id).toBe('container-5:1');
  });

  it('produces one subgraph with id "subgraph-1"', () => {
    const view = buildLevelViewFromGraphData(graphData, 'L');
    expect(view.subgraphs).toHaveLength(1);
    expect(view.subgraphs![0].id).toBe('subgraph-1');
  });

  it('sets module parentId to "container-5:1"', () => {
    const view = buildLevelViewFromGraphData(graphData, 'L');
    for (const mod of view.modules ?? []) {
      expect(mod.parentId).toBe('container-5:1');
    }
  });
});

describe('buildLevelViewFromGraphData — port id/coverage mapping', () => {
  it('sets view-model Port.id to the intermediate Port.portSystemId, not portId', () => {
    const view = buildLevelViewFromGraphData(graphData, 'L');
    const mod1 = (view.modules ?? []).find((m) => m.id === 'sys-mod-1')!;
    const inPort = mod1.ports.find((p) => p.portIoType === 'input')!;
    expect(inPort.id).toBe('sys-port-10');
  });

  it('carries activeLinks and totalLinks through onto the view-model Port', () => {
    const view = buildLevelViewFromGraphData(graphData, 'L');
    const mod1 = (view.modules ?? []).find((m) => m.id === 'sys-mod-1')!;
    const inPort = mod1.ports.find((p) => p.portIoType === 'input')!;
    expect(inPort.activeLinks).toBe(1);
    expect(inPort.totalLinks).toBe(2);
  });
});
