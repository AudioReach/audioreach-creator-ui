/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {BitFieldDto, NameValuePairDto} from '~entities/spf-module-data';

const BOOL_SYNONYMS = [
  ['enable', 'disable'],
  ['enabled', 'disabled'],
  ['on', 'off'],
  ['true', 'false'],
  ['yes', 'no'],
];

/** Two-option NameValuePair → Switch only when the names look like a boolean. */
export function isBooleanSwitch(
  allowedValues: (NameValuePairDto | BitFieldDto)[],
): allowedValues is [NameValuePairDto, NameValuePairDto] {
  if (
    allowedValues.length !== 2 ||
    !allowedValues.every((av) => av.type === 'NAME_VALUE_PAIR')
  ) {
    return false;
  }
  const names = allowedValues.map((av) => av.name.toLowerCase());
  return BOOL_SYNONYMS.some(([a, b]) => names.includes(a) && names.includes(b));
}
