/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {KvSelection} from '~entities/subgraph-definitions';

/**
 * Renders resolved pairs for display and search without changing their state.
 * Key-aware search remains available when Value Only hides key labels.
 */
/** The two text representations available for a resolved KV vector. */
export type KvVectorDisplayMode = 'key-value' | 'value-only';

/** Renders a vector without altering its stored key/value identity. */
export function formatKvVector(
  vector: KvSelection,
  displayMode: KvVectorDisplayMode,
): string {
  if (displayMode === 'value-only') {
    return vector.keyValuePairs
      .map((pair) => pair.valueInfo.valueLabel)
      .join('+');
  }

  return vector.keyValuePairs
    .map((pair) => `[${pair.keyInfo.keyLabel}:${pair.valueInfo.valueLabel}]`)
    .join('');
}

/** Uses key-aware text so search works even in Value Only display mode. */
export function getKvVectorSearchText(vector: KvSelection): string {
  return formatKvVector(vector, 'key-value');
}
