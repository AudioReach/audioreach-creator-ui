/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import {
  buildDirectLinkInfo,
  resolveComponentInfo,
  resolvePortLabel,
} from '~widgets/properties-panel/lib/node-info';

function makeGraphData(): UsecaseGraphData {
  return {
    connections: [
      {
        connectionId: 'dl-1',
        connectionType: 'data',
        fromModuleId: 'm-1',
        fromPortId: '101',
        isDangling: false,
        toModuleId: 'm-2',
        toPortId: 'in-1',
      },
      {
        connectionId: 'cl-1',
        connectionType: 'control',
        fromModuleId: 'm-1',
        fromPortId: 'ctrl-1',
        isDangling: false,
        toModuleId: 'ss-1',
        toPortId: 'ss-ctrl-1',
      },
    ],
    containers: {},
    moduleInstances: {
      'm-1': {
        containerId: 'cnt-1',
        displayName: 'Source Module',
        inputPorts: [
          {
            direction: 'input',
            isStatic: false,
            portId: 'ctrl-1',
            portName: 'Control 1',
            portType: 'control',
            totalLinksAtPort: 1,
          },
        ],
        moduleId: 'module-def-1',
        moduleInstanceId: '101',
        moduleName: 'Source',
        moduleType: 'audio',
        outputPorts: [
          {
            direction: 'output',
            isStatic: false,
            portId: '101',
            portName: 'Output 1',
            portType: 'data',
            totalLinksAtPort: 1,
          },
        ],
        position: {x: 0, y: 0},
        subgraphId: 'sg-1',
      },
      'm-2': {
        containerId: 'cnt-1',
        displayName: 'Destination Module',
        inputPorts: [
          {
            direction: 'input',
            isStatic: false,
            portId: 'in-1',
            portName: 'Input 1',
            portType: 'data',
            totalLinksAtPort: 1,
          },
        ],
        moduleId: 'module-def-2',
        moduleInstanceId: 'm-2',
        moduleName: 'Destination',
        moduleType: 'voice',
        outputPorts: [],
        position: {x: 10, y: 20},
        subgraphId: 'sg-1',
      },
    },
    selectedUsecases: [],
    subgraphs: {},
    subsystems: {
      'ss-1': {
        childSubsystemIds: [],
        controlPorts: [
          {
            direction: 'input',
            portId: 'ss-ctrl-1',
            portName: 'Subsystem Control',
            portType: 'control',
          },
        ],
        dataPorts: [
          {
            direction: 'output',
            portId: 'ss-out-1',
            portName: 'Subsystem Output',
            portType: 'data',
          },
        ],
        subgraphs: [],
        subsystemId: 'ss-1',
        subsystemName: 'Subsystem 1',
      },
    },
  };
}

describe('node-info', () => {
  it('resolves module, subsystem, and unknown component info', () => {
    const graphData = makeGraphData();

    expect(resolveComponentInfo(graphData, 'm-1')).toEqual({
      displayName: 'Source Module',
      id: '0x65',
      kind: 'module',
    });
    expect(resolveComponentInfo(graphData, 'ss-1')).toEqual({
      displayName: 'Subsystem 1',
      id: 'ss-1',
      kind: 'subsystem',
    });
    expect(resolveComponentInfo(graphData, 'missing-node')).toEqual({
      displayName: 'missing-node',
      id: 'missing-node',
      kind: 'unknown',
    });
  });

  it('formats module and subsystem port labels with id fallback', () => {
    const graphData = makeGraphData();

    expect(resolvePortLabel(graphData, 'm-1', '101')).toBe('Output 1 (0x65)');
    expect(resolvePortLabel(graphData, 'ss-1', 'ss-ctrl-1')).toBe(
      'Subsystem Control (ss-ctrl-1)',
    );
    expect(resolvePortLabel(graphData, 'missing-node', '101')).toBe('0x65');
  });

  it('builds direct link endpoint details from graph data', () => {
    const graphData = makeGraphData();

    expect(buildDirectLinkInfo(graphData, 'dl-1')).toEqual({
      destination: expect.objectContaining({
        nodeId: 'm-2',
        portId: 'in-1',
        portLabel: 'Input 1 (in-1)',
      }),
      id: 'dl-1',
      source: expect.objectContaining({
        nodeId: 'm-1',
        portId: '101',
        portLabel: 'Output 1 (0x65)',
      }),
      type: 'data',
    });
    expect(buildDirectLinkInfo(graphData, 'missing-link')).toBeNull();
  });
});
