/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';

export function makeGraphData(): UsecaseGraphData {
  return {
    connections: [
      {
        destinationPortSystemId: 'in-2',
        destinationSystemId: 'mod-2',
        isInterUsecase: false,
        linkKind: 'data',
        sourcePortSystemId: 'out-1',
        sourceSystemId: 'mod-1',
        systemId: 'dl-1',
      },
      {
        destinationPortSystemId: 'ctl-2',
        destinationSystemId: 'mod-2',
        isInterUsecase: false,
        linkKind: 'control',
        sourcePortSystemId: 'ctl-1',
        sourceSystemId: 'mod-1',
        systemId: 'cl-1',
      },
    ],
    containers: {
      'cnt-1': {
        moduleInstances: ['mod-1', 'mod-2'],
        subgraphSystemId: 'sg-1',
        systemId: 'cnt-1',
      },
    },
    moduleInstances: {
      'mdf-1': {
        containerSystemId: 'cnt-1',
        displayName: 'MDF Processor',
        inputPorts: [],
        moduleDefinitionSystemId: '999',
        moduleName: 'MDF Processor',
        moduleType: 'mdf',
        naturalId: 999,
        outputPorts: [],
        position: {x: 0, y: 0},
        subgraphSystemId: 'sg-1',
        systemId: 'mdf-1',
      },
      'mod-1': {
        containerSystemId: 'cnt-1',
        displayName: 'Source Module',
        inputPorts: [
          {
            direction: 'input',
            isStatic: true,
            portId: 'in-1a',
            portName: 'Input A',
            portType: 'data',
            totalLinksAtPort: 0,
          },
          {
            direction: 'input',
            isStatic: true,
            portId: 'in-1b',
            portName: 'Input B',
            portType: 'data',
            totalLinksAtPort: 0,
          },
          {
            direction: 'input',
            isStatic: true,
            portId: 'in-1c',
            portName: 'Input C',
            portType: 'data',
            totalLinksAtPort: 0,
          },
          {
            direction: 'input',
            isStatic: false,
            portId: 'ctl-1',
            portName: 'Control',
            portType: 'control',
            totalLinksAtPort: 1,
          },
        ],
        moduleDefinitionSystemId: '100',
        moduleName: 'Source Module',
        moduleType: 'audio',
        naturalId: 100,
        outputPorts: [
          {
            direction: 'output',
            isStatic: false,
            portId: 'out-1',
            portName: 'Output A',
            portType: 'data',
            totalLinksAtPort: 1,
          },
          {
            direction: 'output',
            isStatic: false,
            portId: 'out-1b',
            portName: 'Output B',
            portType: 'data',
            totalLinksAtPort: 0,
          },
          {
            direction: 'output',
            isStatic: false,
            portId: 'out-1c',
            portName: 'Output C',
            portType: 'data',
            totalLinksAtPort: 0,
          },
          {
            direction: 'output',
            isStatic: false,
            portId: 'out-1d',
            portName: 'Output D',
            portType: 'data',
            totalLinksAtPort: 0,
          },
        ],
        position: {x: 0, y: 0},
        subgraphSystemId: 'sg-1',
        systemId: 'mod-1',
      },
      'mod-2': {
        containerSystemId: 'cnt-1',
        displayName: 'Destination Module',
        inputPorts: [
          {
            direction: 'input',
            isStatic: false,
            portId: 'in-2',
            portName: 'Input',
            portType: 'data',
            totalLinksAtPort: 1,
          },
          {
            direction: 'input',
            isStatic: false,
            portId: 'ctl-2',
            portName: 'Control',
            portType: 'control',
            totalLinksAtPort: 1,
          },
        ],
        moduleDefinitionSystemId: '200',
        moduleName: 'Destination Module',
        moduleType: 'audio',
        naturalId: 200,
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
        subgraphName: 'Main Subgraph',
        subgraphType: 'offload',
        systemId: 'sg-1',
      },
    },
    subsystems: {
      'ss-1': {
        childSubsystemIds: [],
        controlPorts: [],
        dataPorts: [],
        subgraphs: ['sg-1'],
        subsystemId: 'ss-1',
        subsystemName: 'Playback',
      },
    },
  };
}
