/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {filterByTypeAndQuery} from '~shared/lib/filter-utils';
import type {
  LogEntry,
  LogType,
} from '~shared/store/project-store-slices/logs-slice';

export function filterLogs(
  logs: LogEntry[],
  selectedTypes: LogType[],
  query: string,
): LogEntry[] {
  return filterByTypeAndQuery(
    logs,
    selectedTypes,
    (log) => log.type,
    query,
    (log) => [log.message, log.detail],
  );
}
