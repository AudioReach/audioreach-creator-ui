/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export function usecaseSelectionsMatch(
  firstSystemIds: readonly string[],
  secondSystemIds: readonly string[],
): boolean {
  const firstIds = new Set(firstSystemIds);
  const secondIds = new Set(secondSystemIds);

  if (firstIds.size !== secondIds.size) {
    return false;
  }

  return [...firstIds].every((systemId) => secondIds.has(systemId));
}
