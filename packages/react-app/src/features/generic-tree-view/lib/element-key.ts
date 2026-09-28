/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export function elementKey(
  itemId: string,
  ...path: Array<string | undefined>
): string {
  return [itemId, ...path.map((segment) => segment ?? '')].join('/');
}
