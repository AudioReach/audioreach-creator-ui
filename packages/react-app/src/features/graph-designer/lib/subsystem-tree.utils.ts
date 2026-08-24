/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  SpfModuleDto,
  SubsystemDto,
} from '~entities/usecases/model/usecase-component.dto';
import type {SubsystemBrowserTreeNode} from '~shared/store/tab-store-slices/subsystem-slice';

/**
 * Builds a hierarchical subsystem tree from a flat SubsystemDto array.
 *
 * - Parent-child relationships are wired via SubsystemDto.parentSystemId.
 * - subgraphIds per node are derived from SpfModuleDto.parentId: when a
 *   module's parentId points to a subsystem, its subgraphId belongs to that
 *   subsystem.
 */
export function buildSubsystemTree(
  subsystemDtos: SubsystemDto[],
  spfModules: SpfModuleDto[],
): SubsystemBrowserTreeNode[] {
  const subsystemIdSet = new Set(subsystemDtos.map((s) => s.id));
  const systemIdToId = new Map(
    subsystemDtos.map((s) => [s.systemId, s.id] as const),
  );

  // Derive which subgraph IDs belong to each subsystem via module parentId.
  const subsystemSubgraphIds = new Map<number, Set<string>>();
  for (const m of spfModules) {
    if (m.parentId != null && subsystemIdSet.has(m.parentId)) {
      if (!subsystemSubgraphIds.has(m.parentId)) {
        subsystemSubgraphIds.set(m.parentId, new Set());
      }
      subsystemSubgraphIds.get(m.parentId)!.add(m.subgraphId);
    }
  }

  // Build node map.
  const nodeMap = new Map<number, SubsystemBrowserTreeNode>();
  for (const ss of subsystemDtos) {
    nodeMap.set(ss.id, {
      children: [],
      id: ss.id,
      name: ss.name,
      subgraphIds: Array.from(subsystemSubgraphIds.get(ss.id) ?? []),
    });
  }

  // Wire parent → child relationships; collect roots.
  const roots: SubsystemBrowserTreeNode[] = [];
  for (const ss of subsystemDtos) {
    const node = nodeMap.get(ss.id)!;
    const parentId =
      ss.parentSystemId === undefined
        ? undefined
        : systemIdToId.get(ss.parentSystemId);
    if (parentId !== undefined && subsystemIdSet.has(parentId)) {
      nodeMap.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
