/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export function itemIdsFromPaths(paths: Set<string>): Set<string> {
  const ids = new Set<string>();
  for (const key of paths) {
    const id = key.split('/')[0];
    if (id) {
      ids.add(id);
    }
  }
  return ids;
}
