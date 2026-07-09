/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export function elementKey(parameterId: string, ...path: string[]): string {
  return [parameterId, ...path].join('/');
}
