/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export function toHexString(n: number): string {
  const unsigned = n >>> 0;
  return `0x${unsigned.toString(16).toUpperCase().padStart(8, '0')}`;
}
