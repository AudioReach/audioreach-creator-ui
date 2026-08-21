/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import {buildDroppedModulePositionOverrides} from '~widgets/graph-designer/lib/dropped-module-position-overrides';

import {makeModuleInstance} from '../../../features/graph-designer/test-utils/component-dto-fixtures';

const BASE_GRAPH_DATA: UsecaseGraphData = {
  connections: [],
  containers: {},
  moduleInstances: {
    'mod-existing': makeModuleInstance({moduleInstanceId: 'mod-existing'}),
  },
  selectedUsecases: [],
  subgraphs: {},
  subsystems: {},
};

describe('buildDroppedModulePositionOverrides', () => {
  it('positions a created module relative to an existing container', () => {
    const graphData: UsecaseGraphData = {
      ...BASE_GRAPH_DATA,
      moduleInstances: {
        ...BASE_GRAPH_DATA.moduleInstances,
        'mod-created': makeModuleInstance({
          containerId: '10',
          moduleInstanceId: 'mod-created',
          subgraphId: '5',
        }),
      },
    };

    expect(
      buildDroppedModulePositionOverrides(
        graphData,
        'mod-created',
        {x: 12, y: 34},
        'container',
      ),
    ).toEqual({'mod-created': {x: 12, y: 34}});
  });

  it('positions a new container inside an existing subgraph', () => {
    const graphData: UsecaseGraphData = {
      ...BASE_GRAPH_DATA,
      moduleInstances: {
        ...BASE_GRAPH_DATA.moduleInstances,
        'mod-created': makeModuleInstance({
          containerId: '20',
          moduleInstanceId: 'mod-created',
          subgraphId: '5',
        }),
      },
    };

    expect(
      buildDroppedModulePositionOverrides(
        graphData,
        'mod-created',
        {x: 56, y: 78},
        'subgraph',
      ),
    ).toEqual({
      'container-20:5': {x: 56, y: 78},
      'mod-created': {x: 12, y: 44},
    });
  });

  it('positions a new subgraph and its descendants for empty canvas drops', () => {
    const graphData: UsecaseGraphData = {
      ...BASE_GRAPH_DATA,
      moduleInstances: {
        ...BASE_GRAPH_DATA.moduleInstances,
        'mod-created': makeModuleInstance({
          containerId: '30',
          moduleInstanceId: 'mod-created',
          subgraphId: '6',
        }),
      },
    };

    expect(
      buildDroppedModulePositionOverrides(
        graphData,
        'mod-created',
        {x: 90, y: 120},
        'empty-canvas',
      ),
    ).toEqual({
      'container-30:6': {x: 16, y: 56},
      'mod-created': {x: 12, y: 44},
      'subgraph-6': {x: 90, y: 120},
    });
  });
});
