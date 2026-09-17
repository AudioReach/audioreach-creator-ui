/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {KeyValueInfo} from '~entities/spf-module-data';

export function keyValuePairsToLabel(keyValuePairs: KeyValueInfo[]): string {
  return keyValuePairs
    .map((kv) => `${kv.key.name}=${kv.value.name}`)
    .join(', ');
}
