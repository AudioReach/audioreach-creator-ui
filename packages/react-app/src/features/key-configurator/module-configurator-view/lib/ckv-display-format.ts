/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  GraphKey,
  KeyValue,
} from '~shared/types/key-configurator-config.types';

export function formatCkvEntry(
  keyValuePairs: Array<{key: GraphKey; value: KeyValue}>,
): string {
  if (keyValuePairs.length === 0) {
    return 'Zero';
  }
  return keyValuePairs
    .map((pair) => `[${pair.key.name}: ${pair.value.name}]`)
    .join(' ');
}
