/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {UsecaseGraphData} from '~features/graph-designer';

export interface SubsystemBreadcrumbSegment {
  label: string;
  systemId: string | null;
}

export function buildSubsystemBreadcrumbPath(
  activeSubsystemId: string | null,
  subsystems: UsecaseGraphData['subsystems'],
): SubsystemBreadcrumbSegment[] {
  if (activeSubsystemId === null) {
    return [];
  }

  const segments: SubsystemBreadcrumbSegment[] = [];
  const visitedIds = new Set<string>();
  let subsystemId: string | undefined = activeSubsystemId;

  while (subsystemId !== undefined) {
    if (visitedIds.has(subsystemId)) {
      return [];
    }

    const subsystem: UsecaseGraphData['subsystems'][string] | undefined =
      subsystems[subsystemId];
    if (!subsystem) {
      return [];
    }

    visitedIds.add(subsystemId);
    segments.push({label: subsystem.subsystemName, systemId: subsystemId});
    subsystemId = subsystem.parentSubsystemId;
  }

  return [{label: 'TOP', systemId: null}, ...segments.reverse()];
}
