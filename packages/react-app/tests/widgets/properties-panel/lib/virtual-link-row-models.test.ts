/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ProxyControlLink, ProxyDataLink} from '~entities/graph';
import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import {
  buildMdfModuleRows,
  buildVirtualControlLinkRows,
  buildVirtualDataLinkRows,
} from '~widgets/properties-panel/lib/virtual-link-row-models';

function makeGraphData(): UsecaseGraphData {
  return {
    connections: [
      {
        connectionId: 'dl-1',
        connectionType: 'data',
        fromModuleId: 'm-1',
        fromPortId: 'out-1',
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
        toModuleId: 'm-2',
        toPortId: 'ctrl-2',
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
        moduleInstanceId: 'm-1',
        moduleName: 'Source',
        moduleType: 'audio',
        outputPorts: [
          {
            direction: 'output',
            isStatic: false,
            portId: 'out-1',
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
          {
            direction: 'input',
            isStatic: false,
            portId: 'ctrl-2',
            portName: 'Control 2',
            portType: 'control',
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
      'm-3': {
        containerId: 'cnt-2',
        displayName: 'MDF Module',
        inputPorts: [],
        moduleId: 'module-def-3',
        moduleInstanceId: 'm-3',
        moduleName: 'MDF',
        moduleType: 'audio',
        outputPorts: [],
        position: {x: 30, y: 40},
        subgraphId: 'sg-2',
      },
    },
    selectedUsecases: [],
    subgraphs: {},
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
  };
}

const standardProxy: ProxyDataLink = {
  edgeKind: 'proxy-data',
  id: 'proxy-dl-1',
  kind: 'standard',
  realConnectionIds: ['dl-1', 'missing-link'],
  sourceNodeId: 'subgraph-proxy-1',
  sourcePortId: 'proxy:1:m-1:out-1',
  targetNodeId: 'm-2',
  targetPortId: 'in-1',
};

const mdfProxy: ProxyDataLink = {
  edgeKind: 'proxy-data',
  id: 'proxy-mdf-1',
  kind: 'mdf',
  mdfModuleIds: ['m-3', 'missing-module'],
  realConnectionIds: ['dl-1'],
  sourceNodeId: 'm-1',
  sourcePortId: 'out-1',
  targetNodeId: 'm-2',
  targetPortId: 'in-1',
};

const proxyControl: ProxyControlLink = {
  edgeKind: 'proxy-control',
  id: 'proxy-cl-1',
  realConnectionIds: ['cl-1', 'missing-link'],
  sourceNodeId: 'subgraph-proxy-1',
  sourcePortId: 'proxy:1:m-1:ctrl-1',
  targetNodeId: 'm-2',
  targetPortId: 'ctrl-2',
};

describe('virtual-link-row-models', () => {
  it('builds standard virtual data link rows from real connection ids', () => {
    expect(buildVirtualDataLinkRows(makeGraphData(), standardProxy)).toEqual([
      expect.objectContaining({
        deleteId: 'dl-1',
        destinationNodeId: 'm-2',
        destinationPortLabel: 'Input 1 (in-1)',
        sourceNodeId: 'm-1',
        sourcePortLabel: 'Output 1 (out-1)',
      }),
    ]);
  });

  it('builds MDF module rows from proxy module ids', () => {
    expect(buildMdfModuleRows(makeGraphData(), mdfProxy)).toEqual([
      expect.objectContaining({
        moduleId: 'module-def-3',
        moduleName: 'MDF Module',
        processingDomain: 'audio',
      }),
    ]);
  });

  it('builds virtual control link rows from real connection ids', () => {
    expect(buildVirtualControlLinkRows(makeGraphData(), proxyControl)).toEqual([
      expect.objectContaining({
        deleteId: 'cl-1',
        peer1NodeId: 'm-1',
        peer1PortLabel: 'Control 1 (ctrl-1)',
        peer2NodeId: 'm-2',
        peer2PortLabel: 'Control 2 (ctrl-2)',
      }),
    ]);
  });

  it('returns empty arrays when proxy metadata is absent', () => {
    const graphData = makeGraphData();

    expect(
      buildVirtualDataLinkRows(graphData, {
        edgeKind: 'proxy-data',
        id: 'proxy-empty',
        sourceNodeId: 'm-1',
        sourcePortId: 'out-1',
        targetNodeId: 'm-2',
        targetPortId: 'in-1',
      }),
    ).toEqual([]);
    expect(
      buildVirtualControlLinkRows(graphData, {
        edgeKind: 'proxy-control',
        id: 'proxy-empty-control',
        sourceNodeId: 'm-1',
        sourcePortId: 'ctrl-1',
        targetNodeId: 'm-2',
        targetPortId: 'ctrl-2',
      }),
    ).toEqual([]);
  });
});
