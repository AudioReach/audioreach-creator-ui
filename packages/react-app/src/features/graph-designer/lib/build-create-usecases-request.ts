/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  CreateUsecasesRequestDto,
  SubgraphKvSelectionDto,
} from '~entities/edit-session';
import type {KvSelection} from '~entities/subgraph-definitions';

import type {Connection} from '../model/graph-data-slice';

/**
 * Builds the one Apply request from the staged Edit Session state.
 * It intentionally serializes system IDs only: labels and UI-only metadata
 * are presentation concerns and must not be sent to the backend.
 */
export interface BuildCreateUsecasesRequestInput {
  allLinks: Connection[];
  excludedLinks: Connection[];
  kvSelectionsById: Record<string, KvSelection[]>;
  usecaseSystemIds: string[];
}

/** Serializes only selected editable SGKV vectors into the Apply request. */
export function buildCreateUsecasesRequest(
  input: BuildCreateUsecasesRequestInput,
): CreateUsecasesRequestDto {
  const {allLinks, excludedLinks, kvSelectionsById, usecaseSystemIds} = input;

  const activeSubgraphs: SubgraphKvSelectionDto[] = Object.entries(
    kvSelectionsById,
  ).map(([subgraphId, selections]) => ({
    systemId: subgraphId,
    valueSystemIds: selections
      .filter((s) => s.selected)
      .map((s) => s.keyValuePairs.map((kv) => kv.valueInfo.valueSystemId)),
  }));

  const excludedSystemIds = new Set(excludedLinks.map((l) => l.systemId));
  const isIncluded = (l: Connection): boolean =>
    !excludedSystemIds.has(l.systemId);

  const includedDataLinkSystemIds = allLinks
    .filter((l) => l.linkKind === 'data' && isIncluded(l))
    .map((l) => l.systemId);

  const includedControlLinkSystemIds = allLinks
    .filter((l) => l.linkKind === 'control' && isIncluded(l))
    .map((l) => l.systemId);

  return {
    activeSubgraphs,
    includedControlLinkSystemIds,
    includedDataLinkSystemIds,
    usecaseSystemIds,
  };
}
