/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {KeyDisplayMode} from '~shared/lib/key-display-mode';
import type {
  ConfiguredTkv,
  Key,
  KeyValue,
} from '~shared/types/key-configurator-config.types';

export function formatTkvKeyValuePair(
  pair: {key: Key; value: KeyValue},
  displayMode: KeyDisplayMode,
): string {
  if (displayMode === 'value-only') {
    return pair.value.name;
  }
  return `[${pair.key.name}: ${pair.value.name}]`;
}

export function formatConfiguredTkvLabel(
  tkv: ConfiguredTkv,
  displayMode: KeyDisplayMode,
): string {
  if (tkv.keyValuePairs.length === 0) {
    return `[${tkv.tagGroup}]`;
  }
  const separator = displayMode === 'value-only' ? '+' : ' ';
  return tkv.keyValuePairs
    .map((pair) => formatTkvKeyValuePair(pair, displayMode))
    .join(separator);
}
