/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  ConfiguredTkv,
  Key,
  KeyValue,
} from '~shared/types/key-configurator-config.types';

export function formatTkvKeyValuePair(pair: {
  key: Key;
  value: KeyValue;
}): string {
  return `[${pair.key.name}: ${pair.value.name}]`;
}

export function formatConfiguredTkvLabel(tkv: ConfiguredTkv): string {
  if (tkv.keyValuePairs.length === 0) {
    return `[${tkv.tagGroup}]`;
  }
  return tkv.keyValuePairs
    .map((pair) => formatTkvKeyValuePair(pair))
    .join(' ');
}
