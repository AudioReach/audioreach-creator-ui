/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {SubsystemBrowserTreeNode} from '~shared/store/tab-store-slices/subsystem-slice';

export function findSubsystemAncestorNodeIds(
  nodes: SubsystemBrowserTreeNode[],
  systemId: string,
  ancestorIds: number[] = [],
): number[] {
  for (const node of nodes) {
    const nodePath = [...ancestorIds, node.id];
    if (node.systemId === systemId) {
      return nodePath;
    }

    const childPath = findSubsystemAncestorNodeIds(
      node.children,
      systemId,
      nodePath,
    );
    if (childPath.length > 0) {
      return childPath;
    }
  }

  return [];
}
