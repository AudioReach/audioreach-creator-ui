/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {BitFieldDto, NameValuePairDto} from '~entities/spf-module-data';

export const BOOL_SYNONYMS = [
  ['enable', 'disable'],
  ['enabled', 'disabled'],
  ['on', 'off'],
  ['true', 'false'],
  ['yes', 'no'],
] as const;

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

/**
 * Resolves the on/off members of a boolean NameValuePair pair by name,
 * independent of the pair's array order. Falls back to positional
 * `[off, on]` only if neither name matches a known synonym (defensive; a
 * pair reaching here has already passed `isBooleanSwitch`).
 */
export function resolveBooleanPair(
  pair: [NameValuePairDto, NameValuePairDto],
): {off: NameValuePairDto; on: NameValuePairDto} {
  const [a, b] = pair;
  for (const [onWord, offWord] of BOOL_SYNONYMS) {
    const an = a.name.toLowerCase();
    const bn = b.name.toLowerCase();
    if (an === onWord && bn === offWord) {
      return {off: b, on: a};
    }
    if (an === offWord && bn === onWord) {
      return {off: a, on: b};
    }
  }
  return {off: a, on: b};
}
