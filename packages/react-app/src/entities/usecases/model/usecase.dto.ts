/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export interface UsecaseDto {
  changeId: string;
  keyValuePairs: KeyValueInfo[];
  relatedEndPointLinks?: RelatedEndPointLink[];
  systemId: string;
  usecaseAliasId?: number;
  usecaseAliasName?: string;
  usecaseCategory?: string;
  usecaseType: 'Regular' | 'Manual';
}

/**
 * Identifies a subsystem group returned by the filtered-by-subsystem endpoint.
 */
export interface SubsystemFilteredKv {
  keyValuePairs: KeyValueInfo[];
}

export type UsecaseIdentifier = UsecaseDto;

export interface KeyValueInfo {
  key: {
    name: string;
    naturalId: number;
    systemId: string;
  };
  value: {
    name: string;
    naturalId: number;
    systemId: string;
  };
}

export interface RelatedEndPointLink {
  description: string;
  hypertextRef: string;
  method: string;
}

/**
 * Response shape from GET /projects/{id}/usecases/filtered-by-subsystem.
 * Each entry represents one subsystem group with its identifying key-value
 * info and the usecases that belong to it.
 */
export interface SubsystemFilteredUsecasesDto {
  filteredKv: SubsystemFilteredKv;
  usecases: UsecaseIdentifier[];
}
