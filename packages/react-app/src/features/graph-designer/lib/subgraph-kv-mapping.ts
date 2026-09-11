/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  KvSelection,
  SubgraphKvPair,
  SubgraphKvVectorDto,
} from '~entities/subgraph-definitions/model/subgraph-kv.types';

export {areKvVectorsEqual} from '~entities/subgraph-definitions';

/**
 * Contains the boundary between backend SGKV transport and UI vector state.
 * Backend pairs are mapped once here; selection and EC flags are deliberately
 * initialized separately because they depend on the loaded usecase context.
 */
/** Produces an order-independent local ID for a session-added vector. */
export function getKvVectorSignature(keyValuePairs: SubgraphKvPair[]): string {
  return keyValuePairs
    .map(
      (pair) => `${pair.keyInfo.keySystemId}:${pair.valueInfo.valueSystemId}`,
    )
    .sort()
    .join('|');
}

/** Maps API SGKV vectors into the UI-owned state shape. */
export function mapSubgraphKvVectors(
  vectors: SubgraphKvVectorDto[],
): KvSelection[] {
  // Selection and EC state are calculated after graph/usecase data is ready.
  return vectors.map((vector) => ({
    isEc: false,
    keyValuePairs: vector.keyValuePairs.map((pair) => ({
      keyInfo: {
        keyId: pair.key.naturalId,
        keyLabel: pair.key.name,
        keySystemId: pair.key.systemId,
      },
      valueInfo: {
        valueId: pair.value.naturalId,
        valueLabel: pair.value.name,
        valueSystemId: pair.value.systemId,
      },
    })),
    selected: false,
    systemId: vector.systemId,
  }));
}
