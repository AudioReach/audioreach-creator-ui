/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  CreateUsecasesRequestDto,
  SubgraphKvSelectionDto,
} from '~entities/edit-session';
import type {KeyValue} from '~entities/usecases';

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
      .map((s) =>
        s.keyValuePairs.map((kv: KeyValue) => kv.valueInfo.valueSystemId),
      ),
  }));

  const excludedDataLinks = excludedLinks
    .filter((l) => l.connectionType === 'data')
    .map((l) => l.connectionId);

  const excludedControlLinks = excludedLinks
    .filter((l) => l.connectionType === 'control')
    .map((l) => l.connectionId);

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
