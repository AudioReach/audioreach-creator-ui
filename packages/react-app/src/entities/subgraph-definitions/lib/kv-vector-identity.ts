/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {SubgraphKvPair} from '../model/subgraph-kv.types';

/**
 * Provides pair-set equality shared by Add eligibility and Edit Session state.
 * A vector is identified by all of its pairs, not display text or pair order.
 */
/** Compares vectors by unordered key/value-pair identity rather than display order. */
export function areKvVectorsEqual(
  first: SubgraphKvPair[],
  second: SubgraphKvPair[],
): boolean {
  return (
    first.length === second.length &&
    first.every((firstPair) =>
      second.some((secondPair) => areKvPairsEqual(firstPair, secondPair)),
    )
  );
}

function areKvPairsEqual(
  first: SubgraphKvPair,
  second: SubgraphKvPair,
): boolean {
  const matchingSystemIds =
    first.keyInfo.keySystemId === second.keyInfo.keySystemId &&
    first.valueInfo.valueSystemId === second.valueInfo.valueSystemId;
  // Persisted vectors and definitions can use different system IDs for one pair.
  const matchingNumericIds =
    first.keyInfo.keyId === second.keyInfo.keyId &&
    first.valueInfo.valueId === second.valueInfo.valueId;
  return matchingSystemIds || matchingNumericIds;
}
