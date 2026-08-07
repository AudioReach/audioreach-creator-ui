/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import {buildLevelViewFromGraphData} from '~widgets/graph-designer/lib/level-view-adapter';

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
      controlPorts: [],
      dataPorts: [],
      subgraphs: ['5'],
      subsystemId: 'sys-ss-20',
      subsystemName: 'AudioSubsystem',
    },
  },
};

describe('buildLevelViewFromGraphData — SubgraphNode.parentId (B5, N7)', () => {
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
