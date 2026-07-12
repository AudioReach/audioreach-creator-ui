/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {KeyValueInfo} from '~entities/spf-module-data';

export function keyValueCollectionToLabel(
  keyValueCollection: KeyValueInfo[],
): string {
  return keyValueCollection
    .map((kv) => `${kv.keyInfo.keyLabel}=${kv.valueInfo.valueLabel}`)
    .join(', ');
}
