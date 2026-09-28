/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ApiIssueItem} from '~entities/api-issues';
import type {ControlLinkDto, DataLinkDto, KeyValueInfo} from '~entities/usecases';

export interface SubgraphKvSelectionDto {
  systemId: string;
  valueSystemIds: string[][];
}

export interface CreateUsecasesRequestDto {
  activeSubgraphs: SubgraphKvSelectionDto[];
  excludedControlLinkSystemIds?: string[];
  excludedDataLinkSystemIds?: string[];
  excludedSubgraphSystemIds?: string[];
  selectedUsecaseSystemIds: string[];
}

export interface UsecaseChangeSnapshotDto {
  alias: string | null;
  aliasId: number | null;
  categories: string[];
  controlLinks: ControlLinkDto[];
  dataLinks: DataLinkDto[];
  gkv: KeyValueInfo[];
  isEc: boolean;
  subgraphSystemIds: string[];
}

export interface UsecaseChangeDetailsDto {
  after: UsecaseChangeSnapshotDto | null;
  before: UsecaseChangeSnapshotDto | null;
  changeId: string;
  operation: 'CREATE' | 'DELETE' | 'UPDATE';
  source: 'AUTO_ROUTING' | 'DIFF_TOOL' | 'MANUAL';
  systemId: string;
}

export interface CreateUsecasesResponseDto {
  changes: UsecaseChangeDetailsDto[];
  groupId: string;
  issues: ApiIssueItem[];
}
