/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ApiIssueItem} from '~entities/api-issues';
import type {KeyValueInfo, RelatedEndPointLink} from '~entities/usecases';

export interface SubgraphKvSelectionDto {
  systemId: string;
  valueSystemIds: string[][];
}

export interface CreateUsecasesRequestDto {
  activeSubgraphs: SubgraphKvSelectionDto[];
  excludedControlLinkSystemIds?: string[];
  excludedDataLinkSystemIds?: string[];
  selectedUsecaseSystemIds: string[];
}

export interface UsecaseIdentifierWithChangeInfoDto {
  changeId: string;
  keyValueCollection: KeyValueInfo[];
  relatedEndPointLinks?: RelatedEndPointLink[];
  systemId: string;
  usecaseAliasId?: number;
  usecaseAliasName?: string;
  usecaseCategory?: string;
  usecaseType: 'Ec' | 'Manual' | 'Regular';
}

export interface CreateUsecasesResponseDto {
  created: UsecaseIdentifierWithChangeInfoDto[];
  deleted: UsecaseIdentifierWithChangeInfoDto[];
  issues: ApiIssueItem[];
  updated: UsecaseIdentifierWithChangeInfoDto[];
}
