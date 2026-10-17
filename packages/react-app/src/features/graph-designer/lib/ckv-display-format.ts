/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {KeyDisplayMode} from '~shared/lib/key-display-mode';
import type {
  GraphKey,
  KeyValue,
} from '~shared/types/key-configurator-config.types';

export function formatCkvEntry(
  keyValuePairs: Array<{key: GraphKey; value: KeyValue}>,
  displayMode: KeyDisplayMode,
): string {
  if (displayMode === 'value-only') {
    return keyValuePairs.map((pair) => pair.value.name).join('+');
  }
  return keyValuePairs
    .map((pair) => `[${pair.key.name}: ${pair.value.name}]`)
    .join(' ');
}
