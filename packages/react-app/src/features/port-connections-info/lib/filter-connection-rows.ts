/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  ConnectionFilter,
  ConnectionRow,
} from '../model/port-connections-info.types';

export function filterConnectionRows(
  rows: ConnectionRow[],
  filter: ConnectionFilter,
): ConnectionRow[] {
  if (filter === 'sg') {
    return rows.filter((r) => !r.isDangling);
  }
  if (filter === 'dangling') {
    return rows.filter((r) => r.isDangling);
  }
  return rows;
}
