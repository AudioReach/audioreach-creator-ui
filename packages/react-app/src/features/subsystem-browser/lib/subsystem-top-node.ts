/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {SubsystemBrowserTreeNode} from '~shared/store/tab-store-slices/subsystem-slice';

export const TOP_ID = '__top__';
export const TOP_NODE_ID = 0;

/**
 * Wraps the root subsystems in the virtual Top node shown by both the
 * subsystem browser and the move-to-subsystem picker.
 *
 * Top is represented by a sentinel because a top-level destination is null in
 * the graph data and cannot be used as a tree node id.
 */
export function withTopNode(
  roots: SubsystemBrowserTreeNode[],
): SubsystemBrowserTreeNode[] {
  return [
    {
      children: roots,
      id: TOP_NODE_ID,
      name: 'TOP',
      subgraphIds: [],
      systemId: TOP_ID,
    },
  ];
}

export function toMoveDestination(id: string): string | null {
  return id === TOP_ID ? null : id;
}
