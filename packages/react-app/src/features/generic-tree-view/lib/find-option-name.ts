/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {areNumericStringsEqual} from '~shared/lib/numeric-string';

export function findOptionName(
  allowedValues: {name: string; value: string}[],
  currentHex: string,
): string {
  return (
    allowedValues.find(
      (av) =>
        av.value === currentHex || areNumericStringsEqual(av.value, currentHex),
    )?.name ??
    allowedValues[0]?.name ??
    ''
  );
}
