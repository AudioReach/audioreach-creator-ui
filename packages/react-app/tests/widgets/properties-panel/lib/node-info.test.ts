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
        destinationPortSystemId: 'in-system-1',
        destinationSystemId: 'm-2',
        isInterUsecase: false,
        linkKind: 'data',
        sourcePortSystemId: 'out-system-1',
        sourceSystemId: 'm-1',
        systemId: 'dl-1',
      },
      {
        destinationPortSystemId: 'ss-ctrl-1',
        destinationSystemId: 'ss-1',
        isInterUsecase: false,
        linkKind: 'control',
        sourcePortSystemId: 'ctrl-system-1',
        sourceSystemId: 'm-1',
        systemId: 'cl-1',
      },
    ],
    containers: {},
    moduleInstances: {
      'm-1': {
        containerSystemId: 'cnt-1',
        displayName: 'Source Module',
        inputPorts: [
          {
            direction: 'input',
            isStatic: false,
            portId: 'ctrl-1',
            portName: 'Control 1',
            portSystemId: 'ctrl-system-1',
            portType: 'control',
            totalLinksAtPort: 1,
          },
        ],
        moduleDefinitionSystemId: 'module-def-1',
        moduleName: 'Source',
        moduleType: 'audio',
        naturalId: 101,
        outputPorts: [
          {
            direction: 'output',
            isStatic: false,
            portId: '101',
            portName: 'Output 1',
            portSystemId: 'out-system-1',
            portType: 'data',
            totalLinksAtPort: 1,
          },
        ],
        position: {x: 0, y: 0},
        subgraphSystemId: 'sg-1',
        systemId: 'm-1',
      },
      'm-2': {
        containerSystemId: 'cnt-1',
        displayName: 'Destination Module',
        inputPorts: [
          {
            direction: 'input',
            isStatic: false,
            portId: 'in-1',
            portName: 'Input 1',
            portSystemId: 'in-system-1',
            portType: 'data',
            totalLinksAtPort: 1,
          },
        ],
        moduleDefinitionSystemId: 'module-def-2',
        moduleName: 'Destination',
        moduleType: 'voice',
        naturalId: 102,
        outputPorts: [],
        position: {x: 10, y: 20},
        subgraphSystemId: 'sg-1',
        systemId: 'm-2',
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
      id: 'm-1',
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
    expect(resolvePortLabel(graphData, 'm-1', 'out-system-1')).toBe(
      'Output 1 (0x65)',
    );
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
        portId: 'in-system-1',
        portLabel: 'Input 1 (in-1)',
      }),
      id: 'dl-1',
      source: expect.objectContaining({
        nodeId: 'm-1',
        portId: 'out-system-1',
        portLabel: 'Output 1 (0x65)',
      }),
      type: 'data',
    });
    expect(buildDirectLinkInfo(graphData, 'missing-link')).toBeNull();
  });
});
