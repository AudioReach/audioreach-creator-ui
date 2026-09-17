/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  CreateUsecasesRequestDto,
  SubgraphKvSelectionDto,
} from '~entities/edit-session';
import type {KeyValueInfo} from '~entities/usecases';

import type {KvSelection} from '../model/edit-session-slice';
import type {Connection} from '../model/graph-data-slice';

export interface BuildCreateUsecasesRequestInput {
  excludedLinks: Connection[];
  kvSelectionsById: Record<string, KvSelection[]>;
  selectedUsecaseSystemIds: string[];
}

export function buildCreateUsecasesRequest(
  input: BuildCreateUsecasesRequestInput,
): CreateUsecasesRequestDto {
  const {excludedLinks, kvSelectionsById, selectedUsecaseSystemIds} = input;

  const activeSubgraphs: SubgraphKvSelectionDto[] = Object.entries(
    kvSelectionsById,
  ).map(([subgraphId, selections]) => ({
    systemId: subgraphId,
    valueSystemIds: selections
      .filter((s) => s.selected)
      .map((s) => s.keyValuePairs.map((kv: KeyValueInfo) => kv.value.systemId)),
  }));

  const excludedDataLinks = excludedLinks
    .filter((l) => l.linkKind === 'data')
    .map((l) => l.systemId);

  const excludedControlLinks = excludedLinks
    .filter((l) => l.linkKind === 'control')
    .map((l) => l.systemId);

  const result: CreateUsecasesRequestDto = {
    activeSubgraphs,
    selectedUsecaseSystemIds,
  };

  if (excludedDataLinks.length > 0) {
    result.excludedDataLinkSystemIds = excludedDataLinks;
  }

  if (excludedControlLinks.length > 0) {
    result.excludedControlLinkSystemIds = excludedControlLinks;
  }

  return result;
}
