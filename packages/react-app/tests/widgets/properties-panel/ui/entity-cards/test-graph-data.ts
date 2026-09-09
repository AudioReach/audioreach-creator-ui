/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';

export function makeGraphData(): UsecaseGraphData {
  return {
    connections: [
      {
        connectionId: 'dl-1',
        connectionType: 'data',
        fromModuleId: 'mod-1',
        fromPortId: 'out-1',
        isDangling: false,
        toModuleId: 'mod-2',
        toPortId: 'in-2',
      },
      {
        connectionId: 'cl-1',
        connectionType: 'control',
        fromModuleId: 'mod-1',
        fromPortId: 'ctl-1',
        isDangling: false,
        toModuleId: 'mod-2',
        toPortId: 'ctl-2',
      },
    ],
    containers: {
      'cnt-1': {
        containerId: 'cnt-1',
        moduleInstances: ['mod-1', 'mod-2'],
        subgraphId: 'sg-1',
      },
    },
    moduleInstances: {
      'mdf-1': {
        containerId: 'cnt-1',
        displayName: 'MDF Processor',
        inputPorts: [],
        moduleId: '999',
        moduleInstanceId: 'mdf-1',
        moduleName: 'MDF Processor',
        moduleType: 'mdf',
        outputPorts: [],
        position: {x: 0, y: 0},
        subgraphId: 'sg-1',
      },
      'mod-1': {
        containerId: 'cnt-1',
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
        moduleId: '100',
        moduleInstanceId: 'mod-1',
        moduleName: 'Source Module',
        moduleType: 'audio',
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
        subgraphId: 'sg-1',
      },
      'mod-2': {
        containerId: 'cnt-1',
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
        moduleId: '200',
        moduleInstanceId: 'mod-2',
        moduleName: 'Destination Module',
        moduleType: 'audio',
        outputPorts: [],
        position: {x: 0, y: 0},
        subgraphId: 'sg-1',
      },
    },
    selectedUsecases: [],
    subgraphs: {
      'sg-1': {
        containers: ['cnt-1'],
        subgraphId: 'sg-1',
        subgraphName: 'Main Subgraph',
        subgraphType: 'offload',
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
