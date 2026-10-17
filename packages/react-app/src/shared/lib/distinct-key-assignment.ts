/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export interface KeyPriorityCandidate<TPair> {
  key: {naturalId: number; systemId: string};
  pair: TPair;
}

export function compareKeyPriority(
  firstNaturalId: number,
  firstSystemId: string,
  secondNaturalId: number,
  secondSystemId: string,
): number {
  const naturalIdDifference = firstNaturalId - secondNaturalId;
  if (naturalIdDifference !== 0) {
    return naturalIdDifference;
  }
  if (firstSystemId < secondSystemId) {
    return -1;
  }
  return firstSystemId > secondSystemId ? 1 : 0;
}

export function findDistinctKeyAssignment<TPair>(
  candidatesByToken: KeyPriorityCandidate<TPair>[][],
): TPair[] | null {
  const assignedPairs: TPair[] = [];
  const assignToken = (
    tokenIndex: number,
    usedKeySystemIds: Set<string>,
  ): boolean => {
    if (tokenIndex === candidatesByToken.length) {
      return true;
    }
    for (const candidate of candidatesByToken[tokenIndex]) {
      if (usedKeySystemIds.has(candidate.key.systemId)) {
        continue;
      }
      usedKeySystemIds.add(candidate.key.systemId);
      assignedPairs.push(candidate.pair);
      if (assignToken(tokenIndex + 1, usedKeySystemIds)) {
        return true;
      }
      assignedPairs.pop();
      usedKeySystemIds.delete(candidate.key.systemId);
    }
    return false;
  };
  return assignToken(0, new Set()) ? assignedPairs : null;
}
