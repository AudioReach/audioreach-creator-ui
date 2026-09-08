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
 * - subgraphIds per node are derived from SpfModuleDto.parentSystemId: when a
 *   module's parent points to a subsystem, its subgraphId belongs to that
 *   subsystem.
 */
export function buildSubsystemTree(
  subsystemDtos: SubsystemDto[],
  spfModules: SpfModuleDto[],
): SubsystemBrowserTreeNode[] {
  const subsystemDtoBySystemId = new Map<string, SubsystemDto>();
  for (const ss of subsystemDtos) {
    if (!subsystemDtoBySystemId.has(ss.systemId)) {
      subsystemDtoBySystemId.set(ss.systemId, ss);
    }
  }
  const uniqueSubsystemDtos = Array.from(subsystemDtoBySystemId.values());
  const subsystemIdSet = new Set(uniqueSubsystemDtos.map((s) => s.id));
  const systemIdToId = new Map<string, number>();
  for (const [systemId, subsystem] of subsystemDtoBySystemId.entries()) {
    systemIdToId.set(systemId, subsystem.id);
  }

  const subsystemSubgraphIds = new Map<number, Set<string>>();
  for (const m of spfModules) {
    const parentId =
      m.parentSystemId === undefined
        ? undefined
        : systemIdToId.get(m.parentSystemId);
    if (parentId != null && subsystemIdSet.has(parentId)) {
      if (!subsystemSubgraphIds.has(parentId)) {
        subsystemSubgraphIds.set(parentId, new Set());
      }
      subsystemSubgraphIds.get(parentId)!.add(m.subgraphId);
    }
  }

  // Build node map.
  const nodeMap = new Map<number, SubsystemBrowserTreeNode>();
  for (const ss of uniqueSubsystemDtos) {
    nodeMap.set(ss.id, {
      children: [],
      id: ss.id,
      name: ss.name,
      subgraphIds: Array.from(subsystemSubgraphIds.get(ss.id) ?? []),
      systemId: ss.systemId,
    });
  }

  // Wire parent → child relationships; collect roots.
  const roots: SubsystemBrowserTreeNode[] = [];
  for (const ss of uniqueSubsystemDtos) {
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
