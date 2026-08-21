/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import {NODE_DIMENSIONS, type XY} from '~features/usecase-visualizer';

import {containerNodeId, subgraphNodeId} from './node-id';

export type ModuleDropPlacement = 'container' | 'empty-canvas' | 'subgraph';

const CONTAINER_INSET: XY = {
  x: NODE_DIMENSIONS.subgraph.padding,
  y: NODE_DIMENSIONS.subgraph.headerHeight + NODE_DIMENSIONS.subgraph.padding,
};
const MODULE_INSET: XY = {
  x: NODE_DIMENSIONS.container.padding,
  y: NODE_DIMENSIONS.container.headerHeight + NODE_DIMENSIONS.container.padding,
};

export function buildDroppedModulePositionOverrides(
  graphData: UsecaseGraphData | null,
  createdModuleId: string,
  position: XY,
  placement: ModuleDropPlacement,
): Record<string, XY> {
  if (!graphData) {
    return {};
  }

  const moduleInstance = graphData.moduleInstances[createdModuleId];
  if (!moduleInstance) {
    return {};
  }

  const containerId = containerNodeId(
    moduleInstance.containerId,
    moduleInstance.subgraphId,
  );

  if (placement === 'container') {
    return {[createdModuleId]: position};
  }

  if (placement === 'subgraph') {
    return {
      [containerId]: position,
      [createdModuleId]: MODULE_INSET,
    };
  }

  return {
    [containerId]: CONTAINER_INSET,
    [createdModuleId]: MODULE_INSET,
    [subgraphNodeId(moduleInstance.subgraphId)]: position,
  };
}
