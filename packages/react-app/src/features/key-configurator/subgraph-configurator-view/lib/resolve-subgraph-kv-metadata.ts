/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  KvSelection,
  KvSelectionMetadata,
} from '~entities/subgraph-definitions';

import {
  calculateSubgraphKvMetadata,
  type UsecaseSubgraphMetadataSource,
} from './calculate-subgraph-kv-metadata';
import {loadSubgraphKvUsecaseSources} from './load-subgraph-kv-usecase-sources';

/**
 * Stateless boundary between the Key Configurator's SGKV rules and its caller.
 * Graph Designer supplies its snapshot; this feature never reads or mutates a
 * Graph Designer store directly.
 */
export interface ResolveSubgraphKvMetadataInput {
  palettePlacedSubgraphIds: string[];
  projectId: string;
  selectedUsecaseIds: string[];
  subgraphNaturalId: number | undefined;
  subgraphSystemId: string;
  vectorsBySubgraphId: Record<string, KvSelection[]>;
}

export type SubgraphKvMetadataById = Record<
  string,
  Record<string, KvSelectionMetadata>
>;

/**
 * Loads selected-subgraph usecases, then derives metadata for its vectors.
 * Filtered results already establish ownership, so this adapter associates
 * each result with the subgraph whose natural ID was queried.
 */
export async function resolveSubgraphKvMetadata(
  input: ResolveSubgraphKvMetadataInput,
): Promise<SubgraphKvMetadataById | null> {
  const usecases: UsecaseSubgraphMetadataSource[] | null =
    (
      await loadSubgraphKvUsecaseSources(
        input.projectId,
        input.subgraphNaturalId,
      )
    )?.map((usecase) => ({
      ...usecase,
      subgraphSystemIds: [input.subgraphSystemId],
    })) ?? null;
  if (!usecases) {
    return null;
  }

  return calculateSubgraphKvMetadata({...input, usecases});
}
