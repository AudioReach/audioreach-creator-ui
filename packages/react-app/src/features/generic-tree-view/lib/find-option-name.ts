/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {NameValuePairDto} from '~entities/spf-module-data';

export function findOptionName(
  allowedValues: NameValuePairDto[],
  currentHex: string,
): string {
  return (
    allowedValues.find((av) => av.value === currentHex)?.name ??
    allowedValues[0]?.name ??
    ''
  );
}
