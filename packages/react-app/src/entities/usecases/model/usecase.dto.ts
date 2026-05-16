/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ChangeInfoDto, KeyInfo, ValueInfo} from './usecase-component.dto';

/**
 * Represents a usecase as returned by the API.
 */
export interface UsecaseDto {
  changeInfo: ChangeInfoDto;
  keyValueCollection: KeyValueInfo[];
  relatedEndPointLinks?: RelatedEndPointLink[];
  systemId: string;
  usecaseAliasId?: number;
  usecaseAliasName?: string;
  usecaseCategory?: string;
  usecaseType: 'Ec' | 'Regular' | 'Manual';
}

export interface UsecaseIdentifier extends UsecaseDto {}

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
