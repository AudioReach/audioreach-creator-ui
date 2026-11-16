/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {NODE_KIND, type LevelView} from '~entities/graph';
import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import {
  buildDroppedModulePlacementOverrides,
  buildDroppedModulePositionOverrides,
} from '~widgets/graph-designer/lib/dropped-module-position-overrides';

import {makeModuleInstance} from '../../../features/graph-designer/test-utils/component-dto-fixtures';

const BASE_GRAPH_DATA: UsecaseGraphData = {
  connections: [],
  containers: {},
  moduleInstances: {
    'mod-existing': makeModuleInstance({systemId: 'mod-existing'}),
  },
  selectedUsecases: [],
  subgraphs: {},
  subsystems: {},
};
const EMPTY_LEVEL: LevelView = {levelId: 'level'};

describe('buildDroppedModulePositionOverrides', () => {
  it('positions a created module relative to an existing container', () => {
    const graphData: UsecaseGraphData = {
      ...BASE_GRAPH_DATA,
      moduleInstances: {
        ...BASE_GRAPH_DATA.moduleInstances,
        'mod-created': makeModuleInstance({
          containerSystemId: '10',
          subgraphSystemId: '5',
          systemId: 'mod-created',
        }),
      },
    };

    expect(
      buildDroppedModulePositionOverrides(
        graphData,
        EMPTY_LEVEL,
        {},
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
          containerSystemId: '20',
          subgraphSystemId: '5',
          systemId: 'mod-created',
        }),
      },
    };

    expect(
      buildDroppedModulePositionOverrides(
        graphData,
        EMPTY_LEVEL,
        {},
        'mod-created',
        {x: 56, y: 78},
        'subgraph',
      ),
    ).toEqual({
      'container-20:5': {x: 56, y: 78},
      'mod-created': {x: 16, y: 48},
    });
  });

  it('positions a new subgraph and its descendants for empty canvas drops', () => {
    const graphData: UsecaseGraphData = {
      ...BASE_GRAPH_DATA,
      moduleInstances: {
        ...BASE_GRAPH_DATA.moduleInstances,
        'mod-created': makeModuleInstance({
          containerSystemId: '30',
          subgraphSystemId: '6',
          systemId: 'mod-created',
        }),
      },
    };

    expect(
      buildDroppedModulePositionOverrides(
        graphData,
        EMPTY_LEVEL,
        {},
        'mod-created',
        {x: 90, y: 120},
        'empty-canvas',
      ),
    ).toEqual({
      'container-30:6': {x: 16, y: 56},
      'mod-created': {x: 16, y: 48},
      'subgraph-6': {x: 90, y: 120},
    });
  });

  it('moves a module drop to the nearest non-overlapping slot in its container', () => {
    const graphData: UsecaseGraphData = {
      ...BASE_GRAPH_DATA,
      moduleInstances: {
        ...BASE_GRAPH_DATA.moduleInstances,
        'mod-created': makeModuleInstance({
          containerSystemId: '10',
          subgraphSystemId: '5',
          systemId: 'mod-created',
        }),
      },
    };
    const currentLevel: LevelView = {
      levelId: 'level',
      modules: [
        {
          height: 120,
          id: 'mod-existing',
          label: 'Existing',
          moduleId: 1,
          moduleType: '',
          nodeKind: NODE_KIND.MODULE,
          parentId: 'container-10:5',
          ports: [],
          width: 160,
          x: 12,
          y: 34,
        },
      ],
    };

    expect(
      buildDroppedModulePositionOverrides(
        graphData,
        currentLevel,
        {},
        'mod-created',
        {x: 12, y: 34},
        'container',
      ),
    ).toEqual({'mod-created': {x: 12, y: 178}});
  });

  it('avoids pending module overrides before the graph rerenders', () => {
    const graphData: UsecaseGraphData = {
      ...BASE_GRAPH_DATA,
      moduleInstances: {
        ...BASE_GRAPH_DATA.moduleInstances,
        'mod-created': makeModuleInstance({
          containerSystemId: '10',
          subgraphSystemId: '5',
          systemId: 'mod-created',
        }),
        'mod-pending': makeModuleInstance({
          containerSystemId: '10',
          subgraphSystemId: '5',
          systemId: 'mod-pending',
        }),
      },
    };

    expect(
      buildDroppedModulePositionOverrides(
        graphData,
        EMPTY_LEVEL,
        {'mod-pending': {x: 0, y: 0}},
        'mod-created',
        {x: 0, y: 0},
        'container',
      ),
    ).toEqual({'mod-created': {x: 0, y: 144}});
  });

  it('moves a new container drop away from existing containers in the subgraph', () => {
    const graphData: UsecaseGraphData = {
      ...BASE_GRAPH_DATA,
      moduleInstances: {
        ...BASE_GRAPH_DATA.moduleInstances,
        'mod-created': makeModuleInstance({
          containerSystemId: '20',
          subgraphSystemId: '5',
          systemId: 'mod-created',
        }),
      },
    };
    const currentLevel: LevelView = {
      containers: [
        {
          containerId: 10,
          height: 184,
          id: 'container-10:5',
          label: 'Container 10',
          nodeKind: NODE_KIND.CONTAINER,
          parentId: 'subgraph-5',
          width: 192,
          x: 56,
          y: 78,
        },
      ],
      levelId: 'level',
    };

    expect(
      buildDroppedModulePositionOverrides(
        graphData,
        currentLevel,
        {},
        'mod-created',
        {x: 56, y: 78},
        'subgraph',
      ),
    ).toEqual({
      'container-20:5': {x: 272, y: 78},
      'mod-created': {x: 16, y: 48},
    });
  });

  it('expands the parent subgraph when a new container would overflow it', () => {
    const graphData: UsecaseGraphData = {
      ...BASE_GRAPH_DATA,
      moduleInstances: {
        ...BASE_GRAPH_DATA.moduleInstances,
        'mod-created': makeModuleInstance({
          containerSystemId: '20',
          subgraphSystemId: '5',
          systemId: 'mod-created',
        }),
      },
    };
    const currentLevel: LevelView = {
      levelId: 'level',
      subgraphs: [
        {
          height: 260,
          id: 'subgraph-5',
          label: 'SG 5',
          nodeKind: NODE_KIND.SUBGRAPH,
          subgraphId: 5,
          width: 320,
          x: 0,
          y: 0,
        },
      ],
    };

    expect(
      buildDroppedModulePlacementOverrides(
        graphData,
        currentLevel,
        {},
        'mod-created',
        {x: 220, y: 140},
        'subgraph',
      ),
    ).toEqual({
      positions: {
        'container-20:5': {x: 220, y: 140},
        'mod-created': {x: 16, y: 48},
      },
      sizes: {'subgraph-5': {height: 340, width: 428}},
    });
  });

  it('expands the parent container when a module drop would overflow it', () => {
    const graphData: UsecaseGraphData = {
      ...BASE_GRAPH_DATA,
      moduleInstances: {
        ...BASE_GRAPH_DATA.moduleInstances,
        'mod-created': makeModuleInstance({
          containerSystemId: '10',
          subgraphSystemId: '5',
          systemId: 'mod-created',
        }),
      },
    };
    const currentLevel: LevelView = {
      containers: [
        {
          containerId: 10,
          height: 184,
          id: 'container-10:5',
          label: 'Container 10',
          nodeKind: NODE_KIND.CONTAINER,
          parentId: 'subgraph-5',
          width: 192,
          x: 0,
          y: 0,
        },
      ],
      levelId: 'level',
    };

    expect(
      buildDroppedModulePlacementOverrides(
        graphData,
        currentLevel,
        {},
        'mod-created',
        {x: 120, y: 100},
        'container',
      ),
    ).toEqual({
      positions: {'mod-created': {x: 120, y: 100}},
      sizes: {'container-10:5': {height: 236, width: 296}},
    });
  });

  it('moves an empty-canvas drop away from existing top-level nodes', () => {
    const graphData: UsecaseGraphData = {
      ...BASE_GRAPH_DATA,
      moduleInstances: {
        ...BASE_GRAPH_DATA.moduleInstances,
        'mod-created': makeModuleInstance({
          containerSystemId: '30',
          subgraphSystemId: '6',
          systemId: 'mod-created',
        }),
      },
    };
    const currentLevel: LevelView = {
      levelId: 'level',
      subgraphs: [
        {
          height: 256,
          id: 'subgraph-5',
          label: 'SG 5',
          nodeKind: NODE_KIND.SUBGRAPH,
          subgraphId: 5,
          width: 320,
          x: 90,
          y: 120,
        },
      ],
    };

    expect(
      buildDroppedModulePositionOverrides(
        graphData,
        currentLevel,
        {},
        'mod-created',
        {x: 90, y: 120},
        'empty-canvas',
      ),
    ).toEqual({
      'container-30:6': {x: 16, y: 56},
      'mod-created': {x: 16, y: 48},
      'subgraph-6': {x: 90, y: 408},
    });
  });
});
