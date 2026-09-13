/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Node} from '@xyflow/react';

import {NODE_DIMENSIONS} from './node-dimensions';

type ParentInsets = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

const PARENT_INSETS: Record<string, ParentInsets> = {
  container: {
    bottom: NODE_DIMENSIONS.container.padding,
    left: NODE_DIMENSIONS.container.padding,
    right: NODE_DIMENSIONS.container.padding,
    top: NODE_DIMENSIONS.container.padding,
  },
  subgraph: {
    bottom: NODE_DIMENSIONS.subgraph.padding,
    left: NODE_DIMENSIONS.subgraph.padding,
    right: NODE_DIMENSIONS.subgraph.padding,
    top: NODE_DIMENSIONS.subgraph.padding,
  },
  subsystem: {
    bottom: NODE_DIMENSIONS.subsystem.baseHeight,
    left: NODE_DIMENSIONS.subsystem.baseHeight,
    right: NODE_DIMENSIONS.subsystem.baseHeight,
    top: NODE_DIMENSIONS.subsystem.baseHeight,
  },
  'subsystem-boundary': {
    bottom: NODE_DIMENSIONS.subsystemBoundary.bottomPadding,
    left: NODE_DIMENSIONS.subsystemBoundary.sidePadding,
    right: NODE_DIMENSIONS.subsystemBoundary.sidePadding,
    top: NODE_DIMENSIONS.subsystemBoundary.topInset,
  },
};

const MIN_WIDTH_BY_KIND: Record<string, number> = {
  subgraph: NODE_DIMENSIONS.subgraph.minWidth,
  'subsystem-boundary': NODE_DIMENSIONS.subsystemBoundary.minWidth,
};

const MIN_HEIGHT_BY_KIND: Record<string, number> = {
  'subsystem-boundary': NODE_DIMENSIONS.subsystemBoundary.minHeight,
};

const PARENT_KINDS = new Set(Object.keys(PARENT_INSETS));

function getBoundaryMinimumSize(node: Node): {height: number; width: number} {
  if (node.type !== 'subsystem-boundary') {
    return {height: 0, width: 0};
  }

  return {
    height: NODE_DIMENSIONS.subsystemBoundary.minHeight,
    width: NODE_DIMENSIONS.subsystemBoundary.minWidth,
  };
}

/**
 * Bottom-up pass: for each parent-kind node, compute the bounding box of its
 * direct children and resize the parent to contain them with padding.
 *
 * When children drift past the top/left padding threshold (e.g. during a drag),
 * siblings are shifted inward and the parent shifts outward by the same amount
 * so absolute screen positions are preserved.
 *
 * Returns a new node array (immutable) and a map of only the parents whose
 * dimensions actually changed, keyed by nodeId.
 */
export function recalculateParentSizes(nodes: Node[]): {
  nodes: Node[];
  resizedParents: Record<string, {height: number; width: number}>;
} {
  const originalById = new Map<string, Node>(nodes.map((n) => [n.id, n]));

  // Work on cloned mutable nodes, then return as an immutable array.
  const workingById = new Map<string, Node>(
    nodes.map((node) => [
      node.id,
      {
        ...node,
        position: {x: node.position.x, y: node.position.y},
      },
    ]),
  );

  const childIdsByParent = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.parentId && workingById.has(node.parentId)) {
      const list = childIdsByParent.get(node.parentId) ?? [];
      list.push(node.id);
      childIdsByParent.set(node.parentId, list);
    }
  }

  const depthMemo = new Map<string, number>();
  const depthOf = (nodeId: string, visiting = new Set<string>()): number => {
    const cached = depthMemo.get(nodeId);
    if (cached !== undefined) {
      return cached;
    }
    const node = workingById.get(nodeId);
    if (!node || !node.parentId || visiting.has(nodeId)) {
      depthMemo.set(nodeId, 0);
      return 0;
    }
    visiting.add(nodeId);
    const depth = depthOf(node.parentId, visiting) + 1;
    depthMemo.set(nodeId, depth);
    return depth;
  };

  const parentIds = nodes
    .filter((n) => PARENT_KINDS.has(n.type ?? ''))
    .map((n) => n.id)
    .sort((a, b) => depthOf(b) - depthOf(a));

  for (const parentId of parentIds) {
    const parent = workingById.get(parentId);
    if (!parent) {
      continue;
    }

    const children = (childIdsByParent.get(parentId) ?? [])
      .map((id) => workingById.get(id))
      .filter((n): n is Node => n !== undefined);

    if (children.length === 0) {
      const minimum = getBoundaryMinimumSize(parent);
      if (minimum.width > 0 || minimum.height > 0) {
        parent.height = minimum.height;
        parent.width = minimum.width;
      }
      continue;
    }

    const insets = PARENT_INSETS[parent.type ?? ''] ?? {
      bottom: 16,
      left: 16,
      right: 16,
      top: 16,
    };

    let minX = Infinity;
    let minY = Infinity;
    let maxRight = -Infinity;
    let maxBottom = -Infinity;

    for (const child of children) {
      const cx = child.position.x;
      const cy = child.position.y;
      const cw = child.width ?? 0;
      const ch = child.height ?? 0;
      if (cx < minX) {
        minX = cx;
      }
      if (cy < minY) {
        minY = cy;
      }
      if (cx + cw > maxRight) {
        maxRight = cx + cw;
      }
      if (cy + ch > maxBottom) {
        maxBottom = cy + ch;
      }
    }

    // Overflow correction: if children are closer to the top/left edge than
    // padding, shift children inward and move the parent outward by the same
    // amount so absolute screen positions are preserved.
    const dx = minX < insets.left ? insets.left - minX : 0;
    const dy = minY < insets.top ? insets.top - minY : 0;

    if (dx > 0 || dy > 0) {
      for (const child of children) {
        child.position = {
          x: child.position.x + dx,
          y: child.position.y + dy,
        };
      }
      parent.position = {
        x: parent.position.x - dx,
        y: parent.position.y - dy,
      };
      maxRight += dx;
      maxBottom += dy;
    }

    parent.width = Math.max(
      maxRight + insets.right,
      MIN_WIDTH_BY_KIND[parent.type ?? ''] ?? 0,
    );
    parent.height = Math.max(
      maxBottom + insets.bottom,
      MIN_HEIGHT_BY_KIND[parent.type ?? ''] ?? 0,
    );
  }

  const result = nodes.map((n) => workingById.get(n.id) ?? n);

  const resizedParents: Record<string, {height: number; width: number}> = {};
  for (const node of result) {
    const orig = originalById.get(node.id);
    if (
      orig &&
      PARENT_KINDS.has(node.type ?? '') &&
      (node.width !== orig.width || node.height !== orig.height)
    ) {
      resizedParents[node.id] = {
        height: node.height ?? 0,
        width: node.width ?? 0,
      };
    }
  }

  return {nodes: result, resizedParents};
}
