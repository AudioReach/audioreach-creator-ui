/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {AnyEdge, AnyNode} from '~entities/graph';

import type {ContextMenuTarget} from '../model/visualizer.types';

// Wraps a graph node in the target shape used by node context-menu actions.
export function buildNodeTarget(data: AnyNode): ContextMenuTarget {
  return {kind: data.nodeKind, node: data} as ContextMenuTarget;
}

// Wraps a graph edge in the target shape used by edge context-menu actions.
export function buildEdgeTarget(data: AnyEdge): ContextMenuTarget {
  return {edge: data, kind: `${data.edgeKind}-link`} as ContextMenuTarget;
}
