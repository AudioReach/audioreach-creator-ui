/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {KeyInfo, ValueInfo} from './usecase-component.dto';

export interface UsecaseResponseDto {
  usecases: UsecaseIdentifier[];
}

export interface UsecaseIdentifier {
  filteredKV?: FilteredKV;
  keyValueCollection: KeyValueInfo[];
  relatedEndPointLinks?: RelatedEndPointLink[];
  systemId: string;
  usecaseAliasId?: number;
  usecaseAliasName?: string;
  usecaseCategory?: string;
  usecaseType: 'Ec' | 'Regular' | 'Manual';
}

export interface KeyValueInfo {
  keyInfo: KeyInfo;
  valueInfo: ValueInfo;
}

export interface FilteredKV {
  keyValueCollection: KeyValueInfo[];
  systemId: string;
}

export interface RelatedEndPointLink {
  description: string;
  hypertextRef: string;
  method: string;
}
