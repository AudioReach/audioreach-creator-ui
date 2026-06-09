/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Overlays drag-recorded positions and resized parent dimensions onto a
 * LevelView so the next render is consistent with where the user left nodes.
 * The Visualizer reports final positions via onNodeDragEnd; without this the
 * controlled-mode setRfNodes would snap dragged nodes back to their ELK
 * positions on any subsequent graph update (collapse, search, etc.).
 */

import type {AnyNode, LevelView} from '~features/usecase-visualizer';

interface XY {
  x: number;
  y: number;
}

interface Size {
  height: number;
  width: number;
}

function overlay<T extends AnyNode>(
  nodes: T[] | undefined,
  positions: Record<string, XY>,
  sizes: Record<string, Size>,
): T[] | undefined {
  if (!nodes) {
    return nodes;
  }
  let changed = false;
  const next = nodes.map((n) => {
    const pos = positions[n.id];
    const size = sizes[n.id];
    if (!pos && !size) {
      return n;
    }
    changed = true;
    return {
      ...n,
      ...(pos ? {x: pos.x, y: pos.y} : {}),
      ...(size ? {height: size.height, width: size.width} : {}),
    };
  });
  return changed ? next : nodes;
}

export function applyPositionOverrides(
  level: LevelView,
  positions: Record<string, XY>,
  sizes: Record<string, Size>,
): LevelView {
  if (Object.keys(positions).length === 0 && Object.keys(sizes).length === 0) {
    return level;
  }
  return {
    ...level,
    containers: overlay(level.containers, positions, sizes),
    modules: overlay(level.modules, positions, sizes),
    subgraphProxies: overlay(level.subgraphProxies, positions, sizes),
    subgraphs: overlay(level.subgraphs, positions, sizes),
    subsystems: overlay(level.subsystems, positions, sizes),
  };
}
