/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Node} from '@xyflow/react';

import {NODE_DIMENSIONS} from './node-dimensions';

const PADDING_BY_KIND: Record<string, number> = {
  container: NODE_DIMENSIONS.container.padding,
  subgraph: NODE_DIMENSIONS.subgraph.padding,
  // Use baseHeight as the top-offset guard for subsystem nodes.
  subsystem: NODE_DIMENSIONS.subsystem.baseHeight,
};

const PARENT_KINDS = new Set(Object.keys(PADDING_BY_KIND));

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
      continue;
    }

    const padding = PADDING_BY_KIND[parent.type ?? ''] ?? 16;

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
    const dx = minX < padding ? padding - minX : 0;
    const dy = minY < padding ? padding - minY : 0;

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

    parent.width = maxRight + padding;
    parent.height = maxBottom + padding;
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
