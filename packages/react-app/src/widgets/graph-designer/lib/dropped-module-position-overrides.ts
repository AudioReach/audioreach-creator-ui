/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {LevelView} from '~entities/graph';
import type {
  ModuleInstance,
  UsecaseGraphData,
} from '~features/graph-designer/model/graph-data-slice';
import {
  calculateModuleHeight,
  NODE_DIMENSIONS,
  type XY,
} from '~features/usecase-visualizer';

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
const COLLISION_GAP = 16;
const SEARCH_STEP = 24;
const SEARCH_LIMIT = 1200;

interface Rect {
  height: number;
  width: number;
  x: number;
  y: number;
}

interface Size {
  height: number;
  width: number;
}

type PositionOverrides = Record<string, XY>;
type SizeOverrides = Record<string, Size>;

interface DropPlacementOverrides {
  positions: PositionOverrides;
  sizes: SizeOverrides;
}

function moduleSize(moduleInstance: ModuleInstance): Size {
  const inputCount = moduleInstance.inputPorts.filter(
    (p) => p.portType === 'data',
  ).length;
  const outputCount = moduleInstance.outputPorts.filter(
    (p) => p.portType === 'data',
  ).length;
  return {
    height: calculateModuleHeight(inputCount, outputCount, false),
    width: NODE_DIMENSIONS.module.minWidth,
  };
}

function containerSizeForModule(size: Size): Size {
  return {
    height:
      NODE_DIMENSIONS.container.headerHeight +
      NODE_DIMENSIONS.container.padding * 2 +
      size.height,
    width: NODE_DIMENSIONS.container.padding * 2 + size.width,
  };
}

function subgraphSizeForContainer(size: Size): Size {
  return {
    height:
      NODE_DIMENSIONS.subgraph.headerHeight +
      NODE_DIMENSIONS.subgraph.padding * 2 +
      size.height,
    width: Math.max(
      NODE_DIMENSIONS.subgraph.minWidth,
      NODE_DIMENSIONS.subgraph.padding * 2 + size.width,
    ),
  };
}

function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width + COLLISION_GAP &&
    a.x + a.width + COLLISION_GAP > b.x &&
    a.y < b.y + b.height + COLLISION_GAP &&
    a.y + a.height + COLLISION_GAP > b.y
  );
}

function hasCollision(rect: Rect, occupied: Rect[]): boolean {
  return occupied.some((candidate) => overlaps(rect, candidate));
}

function nearestOpenPosition(desired: XY, size: Size, occupied: Rect[]): XY {
  if (occupied.length === 0) {
    return desired;
  }

  const desiredRect = {...desired, ...size};
  if (!hasCollision(desiredRect, occupied)) {
    return desired;
  }

  // dy/dx increase monotonically, so once a row or column can no longer beat
  // the best distance found so far, every later candidate in it is worse too.
  let best: XY | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (
    let dy = 0;
    dy <= SEARCH_LIMIT && dy * dy < bestDistance;
    dy += SEARCH_STEP
  ) {
    for (
      let dx = 0;
      dx <= SEARCH_LIMIT && dx * dx < bestDistance;
      dx += SEARCH_STEP
    ) {
      const candidate = {x: desired.x + dx, y: desired.y + dy};
      const candidateRect = {...candidate, ...size};
      if (hasCollision(candidateRect, occupied)) {
        continue;
      }
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }
  }

  if (best) {
    return best;
  }

  const bottom = occupied.reduce(
    (max, rect) => Math.max(max, rect.y + rect.height + COLLISION_GAP),
    desired.y,
  );
  return {x: desired.x, y: bottom};
}

function sizedRect(node: {
  height: number;
  width: number;
  x: number;
  y: number;
}): Rect | null {
  if (node.width <= 0 || node.height <= 0) {
    return null;
  }
  return {height: node.height, width: node.width, x: node.x, y: node.y};
}

function sizeForNode(
  node: {height: number; width: number} | undefined,
): Size | null {
  if (!node || node.width <= 0 || node.height <= 0) {
    return null;
  }
  return {height: node.height, width: node.width};
}

function expandParentSize(
  parentSize: Size | null,
  childPosition: XY,
  childSize: Size,
  insets: {bottom: number; right: number},
): Size | null {
  if (!parentSize) {
    return null;
  }
  const required = {
    height: childPosition.y + childSize.height + insets.bottom,
    width: childPosition.x + childSize.width + insets.right,
  };
  const next = {
    height: Math.max(parentSize.height, required.height),
    width: Math.max(parentSize.width, required.width),
  };
  if (next.height === parentSize.height && next.width === parentSize.width) {
    return null;
  }
  return next;
}

function expandSubgraphForContainer(
  currentLevel: LevelView,
  subgraphId: string,
  containerPosition: XY,
  containerSize: Size,
): SizeOverrides {
  const subgraph = currentLevel.subgraphs?.find((sg) => sg.id === subgraphId);
  const size = expandParentSize(
    sizeForNode(subgraph),
    containerPosition,
    containerSize,
    {
      bottom: NODE_DIMENSIONS.subgraph.padding,
      right: NODE_DIMENSIONS.subgraph.padding,
    },
  );
  return size ? {[subgraphId]: size} : {};
}

function expandContainerForModule(
  currentLevel: LevelView,
  containerId: string,
  modulePosition: XY,
  createdModuleSize: Size,
): SizeOverrides {
  const container = currentLevel.containers?.find((c) => c.id === containerId);
  const size = expandParentSize(
    sizeForNode(container),
    modulePosition,
    createdModuleSize,
    {
      bottom: NODE_DIMENSIONS.container.padding,
      right: NODE_DIMENSIONS.container.padding,
    },
  );
  if (!size) {
    return {};
  }
  return {
    [containerId]: size,
    ...(container?.parentId
      ? expandSubgraphForContainer(
          currentLevel,
          container.parentId,
          {x: container.x, y: container.y},
          size,
        )
      : {}),
  };
}

function pendingModuleRects(
  graphData: UsecaseGraphData,
  positionOverrides: PositionOverrides,
  excludedModuleIds: Set<string>,
  containerSystemId: string,
  subgraphSystemId: string,
): Rect[] {
  return Object.values(graphData.moduleInstances).flatMap((m) => {
    const override = positionOverrides[m.systemId];
    if (
      excludedModuleIds.has(m.systemId) ||
      m.containerSystemId !== containerSystemId ||
      m.subgraphSystemId !== subgraphSystemId ||
      !override
    ) {
      return [];
    }
    return [{...override, ...moduleSize(m)}];
  });
}

function pendingParentRects(
  graphData: UsecaseGraphData,
  positionOverrides: PositionOverrides,
  excludedParentIds: Set<string>,
  parentIdFor: (moduleInstance: ModuleInstance) => string | null,
  sizeFor: (moduleInstance: ModuleInstance) => Size,
): Rect[] {
  const modulesByParent = new Map<string, ModuleInstance[]>();
  for (const moduleInstance of Object.values(graphData.moduleInstances)) {
    const id = parentIdFor(moduleInstance);
    if (!id || excludedParentIds.has(id) || !positionOverrides[id]) {
      continue;
    }
    const group = modulesByParent.get(id);
    if (group) {
      group.push(moduleInstance);
    } else {
      modulesByParent.set(id, [moduleInstance]);
    }
  }

  return [...modulesByParent.entries()].map(([id, modules]) => {
    const size = modules.reduce(
      (max, moduleInstance) => {
        const next = sizeFor(moduleInstance);
        return {
          height: Math.max(max.height, next.height),
          width: Math.max(max.width, next.width),
        };
      },
      {height: 0, width: 0},
    );
    return {...positionOverrides[id], ...size};
  });
}

function pendingContainerRects(
  graphData: UsecaseGraphData,
  positionOverrides: PositionOverrides,
  excludedContainerIds: Set<string>,
  subgraphSystemId: string,
): Rect[] {
  return pendingParentRects(
    graphData,
    positionOverrides,
    excludedContainerIds,
    (m) =>
      m.subgraphSystemId === subgraphSystemId
        ? containerNodeId(m.containerSystemId, m.subgraphSystemId)
        : null,
    (m) => containerSizeForModule(moduleSize(m)),
  );
}

function pendingSubgraphRects(
  graphData: UsecaseGraphData,
  positionOverrides: PositionOverrides,
  excludedSubgraphIds: Set<string>,
): Rect[] {
  return pendingParentRects(
    graphData,
    positionOverrides,
    excludedSubgraphIds,
    (m) => subgraphNodeId(m.subgraphSystemId),
    (m) => subgraphSizeForContainer(containerSizeForModule(moduleSize(m))),
  );
}

export function buildDroppedModulePlacementOverrides(
  graphData: UsecaseGraphData | null,
  currentLevel: LevelView,
  positionOverrides: PositionOverrides,
  createdModuleId: string,
  position: XY,
  placement: ModuleDropPlacement,
): DropPlacementOverrides {
  if (!graphData) {
    return {positions: {}, sizes: {}};
  }

  const moduleInstance = graphData.moduleInstances[createdModuleId];
  if (!moduleInstance) {
    return {positions: {}, sizes: {}};
  }

  const containerId = containerNodeId(
    moduleInstance.containerSystemId,
    moduleInstance.subgraphSystemId,
  );
  const subgraphId = subgraphNodeId(moduleInstance.subgraphSystemId);
  const createdModuleSize = moduleSize(moduleInstance);

  if (placement === 'container') {
    const currentModules = currentLevel.modules ?? [];
    const currentModuleIds = new Set(currentModules.map((m) => m.id));
    const occupied = currentModules
      .filter((m) => m.id !== createdModuleId && m.parentId === containerId)
      .map(sizedRect)
      .filter((rect): rect is Rect => rect !== null);
    occupied.push(
      ...pendingModuleRects(
        graphData,
        positionOverrides,
        new Set([...currentModuleIds, createdModuleId]),
        moduleInstance.containerSystemId,
        moduleInstance.subgraphSystemId,
      ),
    );
    const resolvedPosition = nearestOpenPosition(
      position,
      createdModuleSize,
      occupied,
    );
    return {
      positions: {[createdModuleId]: resolvedPosition},
      sizes: expandContainerForModule(
        currentLevel,
        containerId,
        resolvedPosition,
        createdModuleSize,
      ),
    };
  }

  if (placement === 'subgraph') {
    const createdContainerSize = containerSizeForModule(createdModuleSize);
    const currentContainers = currentLevel.containers ?? [];
    const currentContainerIds = new Set(currentContainers.map((c) => c.id));
    const occupied = currentContainers
      .filter((c) => c.id !== containerId && c.parentId === subgraphId)
      .map(sizedRect)
      .filter((rect): rect is Rect => rect !== null);
    occupied.push(
      ...pendingContainerRects(
        graphData,
        positionOverrides,
        new Set([...currentContainerIds, containerId]),
        moduleInstance.subgraphSystemId,
      ),
    );
    const resolvedPosition = nearestOpenPosition(
      position,
      createdContainerSize,
      occupied,
    );
    return {
      positions: {
        [containerId]: resolvedPosition,
        [createdModuleId]: MODULE_INSET,
      },
      sizes: expandSubgraphForContainer(
        currentLevel,
        subgraphId,
        resolvedPosition,
        createdContainerSize,
      ),
    };
  }

  const createdSubgraphSize = subgraphSizeForContainer(
    containerSizeForModule(createdModuleSize),
  );
  const currentTopLevelNodes = [
    ...(currentLevel.subgraphs ?? []),
    ...(currentLevel.subgraphProxies ?? []),
    ...(currentLevel.subsystems ?? []),
  ].filter((node) => !node.parentId && node.id !== subgraphId);
  const occupied = currentTopLevelNodes
    .map(sizedRect)
    .filter((rect): rect is Rect => rect !== null);
  occupied.push(
    ...pendingSubgraphRects(
      graphData,
      positionOverrides,
      new Set([...currentTopLevelNodes.map((node) => node.id), subgraphId]),
    ),
  );

  return {
    positions: {
      [containerId]: CONTAINER_INSET,
      [createdModuleId]: MODULE_INSET,
      [subgraphId]: nearestOpenPosition(
        position,
        createdSubgraphSize,
        occupied,
      ),
    },
    sizes: {},
  };
}

export function buildDroppedModulePositionOverrides(
  graphData: UsecaseGraphData | null,
  currentLevel: LevelView,
  positionOverrides: PositionOverrides,
  createdModuleId: string,
  position: XY,
  placement: ModuleDropPlacement,
): Record<string, XY> {
  return buildDroppedModulePlacementOverrides(
    graphData,
    currentLevel,
    positionOverrides,
    createdModuleId,
    position,
    placement,
  ).positions;
}
