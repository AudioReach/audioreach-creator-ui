/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  KvSelection,
  KvSelectionMetadata,
  SubgraphKvPair,
} from '~entities/subgraph-definitions';
import type {KeyValueInfo, UsecaseDto} from '~entities/usecases';

/**
 * Derives display metadata from already-loaded graph and usecase information.
 * It does not mutate vectors or read UI state: callers provide all usecases,
 * selected usecases, subgraph membership, and the vectors being classified.
 */
/** Usecase data required to classify a subgraph vector without UI state. */
export interface UsecaseSubgraphMetadataSource {
  keyValuePairs: KeyValueInfo[];
  subgraphSystemIds: string[];
  systemId: string;
  usecaseType: UsecaseDto['usecaseType'];
}

/** Complete input for the pure selected/EC metadata calculation. */
export interface CalculateSubgraphKvMetadataInput {
  palettePlacedSubgraphIds?: string[];
  selectedUsecaseIds: string[];
  usecases: UsecaseSubgraphMetadataSource[];
  vectorsBySubgraphId: Record<string, KvSelection[]>;
}

/** Overlays calculated metadata onto vectors while retaining all other fields. */
export function applySubgraphKvMetadata(
  vectorsBySubgraphId: Record<string, KvSelection[]>,
  metadataBySubgraphId: Record<string, Record<string, KvSelectionMetadata>>,
): Record<string, KvSelection[]> {
  // Preserve pair identity and session ownership while replacing metadata.
  return Object.fromEntries(
    Object.entries(vectorsBySubgraphId).map(([subgraphSystemId, vectors]) => {
      const metadataByVectorId = metadataBySubgraphId[subgraphSystemId] ?? {};

      return [
        subgraphSystemId,
        vectors.map((vector) => ({
          ...vector,
          ...metadataByVectorId[vector.systemId],
        })),
      ];
    }),
  );
}

function arePairsEqual(first: SubgraphKvPair, second: KeyValueInfo): boolean {
  return (
    (first.keyInfo.keySystemId === second.key.systemId &&
      first.valueInfo.valueSystemId === second.value.systemId) ||
    (first.keyInfo.keyId === second.key.naturalId &&
      first.valueInfo.valueId === second.value.naturalId)
  );
}

function isVectorSubsetOfUsecase(
  vector: KvSelection,
  usecase: UsecaseSubgraphMetadataSource,
): boolean {
  return vector.keyValuePairs.every((vectorPair) =>
    usecase.keyValuePairs.some((usecasePair) =>
      arePairsEqual(vectorPair, usecasePair),
    ),
  );
}

/** Derives selected/EC metadata; palette-placed subgraphs stay unselected. */
export function calculateSubgraphKvMetadata({
  palettePlacedSubgraphIds = [],
  selectedUsecaseIds,
  usecases,
  vectorsBySubgraphId,
}: CalculateSubgraphKvMetadataInput): Record<
  string,
  Record<string, KvSelectionMetadata>
> {
  const palettePlacedIds = new Set(palettePlacedSubgraphIds);
  const selectedUsecaseIdSet = new Set(selectedUsecaseIds);

  return Object.fromEntries(
    Object.entries(vectorsBySubgraphId).map(([subgraphSystemId, vectors]) => {
      const containingUsecases = usecases.filter((usecase) =>
        usecase.subgraphSystemIds.includes(subgraphSystemId),
      );
      const isPalettePlaced = palettePlacedIds.has(subgraphSystemId);

      const metadataByVectorId = Object.fromEntries(
        vectors.map((vector) => {
          // Every pair must belong to one containing usecase for a match.
          const matchingUsecases = containingUsecases.filter((usecase) =>
            isVectorSubsetOfUsecase(vector, usecase),
          );
          const hasEcUsecase = matchingUsecases.some(
            (usecase) => usecase.usecaseType === 'EC',
          );
          const hasNonEcUsecase = matchingUsecases.some(
            (usecase) => usecase.usecaseType !== 'EC',
          );

          return [
            vector.systemId,
            {
              // Any regular match makes the vector regular even if EC also matches.
              isEc: hasEcUsecase && !hasNonEcUsecase,
              // Palette-placed subgraphs are never selected by usecase metadata.
              selected:
                !isPalettePlaced &&
                matchingUsecases.some((usecase) =>
                  selectedUsecaseIdSet.has(usecase.systemId),
                ),
            },
          ];
        }),
      );

      return [subgraphSystemId, metadataByVectorId];
    }),
  );
}
