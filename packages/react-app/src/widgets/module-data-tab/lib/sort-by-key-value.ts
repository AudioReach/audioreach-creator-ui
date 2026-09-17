/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {KeyValueInfo} from '~entities/spf-module-data';

function keyValueSortKey(keyValuePairs: KeyValueInfo[]): string {
  return keyValuePairs.map((kv) => kv.value.systemId).join(' ');
}

/**
 * Orders key/value collections by valueSystemId, matching the subgraph
 * header's default-selection sort (design.md §21.1, WPF parity) so cal/tag
 * index options appear in the same order as the header's key selects.
 */
export function compareByKeyValueSystemIds(
  a: KeyValueInfo[],
  b: KeyValueInfo[],
): number {
  const aKey = keyValueSortKey(a);
  const bKey = keyValueSortKey(b);
  if (aKey < bKey) {
    return -1;
  }
  if (aKey > bKey) {
    return 1;
  }
  return 0;
}
