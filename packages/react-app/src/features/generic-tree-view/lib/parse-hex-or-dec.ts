/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/** Parse a hex (`0x…`) or decimal string to a number. */
export function parseHexOrDec(value: string): number {
  const v = value.trim();
  if (v.startsWith('0x') || v.startsWith('0X')) {
    return parseInt(v, 16);
  }
  return parseInt(v, 10);
}
