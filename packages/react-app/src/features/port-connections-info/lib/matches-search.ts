/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ConnectionRow} from '../model/port-connections-info.types';

export function matchesSearch(
  row: ConnectionRow,
  query: string,
  resolveSubgraphDisplay: (subgraphSystemId: string) => string,
): boolean {
  const trimmed = query.trim();
  if (trimmed === '') {
    return true;
  }

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('sg:')) {
    const needle = lower.slice(3);
    return resolveSubgraphDisplay(row.subgraphSystemId)
      .toLowerCase()
      .includes(needle);
  }
  if (lower.startsWith('iid:')) {
    return row.moduleId.toLowerCase().includes(lower.slice(4));
  }
  if (lower.startsWith('mod:')) {
    return row.moduleName.toLowerCase().includes(lower.slice(4));
  }
  return row.moduleName.toLowerCase().includes(lower);
}
