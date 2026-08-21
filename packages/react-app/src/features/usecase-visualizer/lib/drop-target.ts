/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Node} from '@xyflow/react';

import {type AnyNode, NODE_KIND} from '~entities/graph';

import type {XY} from '../model/visualizer.types';

export interface ResolvedDropTarget {
  position: XY;
  targetContainerId?: string;
  targetSubgraphId?: string;
}

function getAbsoluteNodePosition(
  node: Node,
  nodesById: ReadonlyMap<string, Node>,
): XY {
  let x = node.position.x;
  let y = node.position.y;
  const seenNodeIds = new Set<string>([node.id]);
  let parentId = node.parentId;

  while (parentId) {
    if (seenNodeIds.has(parentId)) {
      break;
    }
    seenNodeIds.add(parentId);
    const parent = nodesById.get(parentId);
    if (!parent) {
      break;
    }
    x += parent.position.x;
    y += parent.position.y;
    parentId = parent.parentId;
  }

  return {x, y};
}

export function isPositionInsideNode(
  position: XY,
  node: Node,
  nodesById: ReadonlyMap<string, Node>,
): boolean {
  const origin = getAbsoluteNodePosition(node, nodesById);
  return (
    position.x >= origin.x &&
    position.x <= origin.x + (node.width ?? 0) &&
    position.y >= origin.y &&
    position.y <= origin.y + (node.height ?? 0)
  );
}

function toNodeRelativePosition(
  position: XY,
  node: Node,
  nodesById: ReadonlyMap<string, Node>,
): XY {
  const origin = getAbsoluteNodePosition(node, nodesById);
  return {x: position.x - origin.x, y: position.y - origin.y};
}

export function resolveDropTarget(
  position: XY,
  nodes: readonly Node[],
): ResolvedDropTarget {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  let targetContainerId: string | undefined;
  let targetNode: Node | undefined;
  let targetSubgraphId: string | undefined;

  for (const node of nodes) {
    const nodeData = node.data as unknown as AnyNode;
    const inBounds = isPositionInsideNode(position, node, nodesById);
    if (!inBounds) {
      continue;
    }
    if (nodeData.nodeKind === NODE_KIND.CONTAINER) {
      targetContainerId = nodeData.meta?.containerSystemId;
      targetSubgraphId = nodeData.meta?.subgraphSystemId;
      targetNode = node;
      break;
    }
    if (nodeData.nodeKind === NODE_KIND.SUBGRAPH) {
      targetSubgraphId = nodeData.meta?.subgraphSystemId;
      targetNode = node;
    }
  }

  return {
    position: targetNode
      ? toNodeRelativePosition(position, targetNode, nodesById)
      : position,
    ...(targetContainerId !== undefined ? {targetContainerId} : {}),
    ...(targetSubgraphId !== undefined ? {targetSubgraphId} : {}),
  };
}
