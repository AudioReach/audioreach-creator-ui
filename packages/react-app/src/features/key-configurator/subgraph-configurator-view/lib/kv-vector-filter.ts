/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {KvSelection} from '~entities/subgraph-definitions';

import {getKvVectorSearchText} from './kv-vector-format';

/**
 * Contains presentation-only filtering for a subgraph's stored vectors.
 * It reads selection/EC metadata and key-aware text without mutating vectors.
 */
/** View-only filters shared by every displayed Subgraph KV Vector list. */
export interface SubgraphKvFilterState {
  ec: boolean;
  regular: boolean;
  searchText: string;
  selected: boolean;
  unselected: boolean;
}

export const INITIAL_SUBGRAPH_KV_FILTER_STATE: SubgraphKvFilterState = {
  ec: false,
  regular: true,
  searchText: '',
  selected: true,
  unselected: false,
};

/** Applies search/type/selection filters without mutating the stored vectors. */
export function getVisibleKvVectors(
  vectors: KvSelection[],
  filters: SubgraphKvFilterState,
): KvSelection[] {
  const searchTerms = filters.searchText
    .split('+')
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
  const filteredVectors = vectors.filter((vector) => {
    if (vector.isEc ? !filters.ec : !filters.regular) {
      return false;
    }
    if (vector.selected ? !filters.selected : !filters.unselected) {
      return false;
    }

    // Search stays key-aware even when the current display hides key names.
    const searchText = getKvVectorSearchText(vector).toLowerCase();
    return searchTerms.every((term) => searchText.includes(term));
  });

  if (!filters.selected || !filters.unselected) {
    return filteredVectors;
  }

  // Present selected vectors first only when the user requested both groups.
  return filteredVectors.toSorted(
    (first, second) => Number(second.selected) - Number(first.selected),
  );
}
