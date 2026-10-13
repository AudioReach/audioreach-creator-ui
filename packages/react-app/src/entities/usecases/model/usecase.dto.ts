/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Declares catalog data shared by the Usecase Browser and SGKV metadata loader.
 * The metadata loader retains all usecases because EC is not selection-scoped.
 */
export interface UsecaseDto {
  keyValuePairs: KeyValueInfo[];
  relatedEndPointLinks?: RelatedEndPointLink[];
  systemId: string;
  usecaseAliasId?: number;
  usecaseAliasName?: string;
  usecaseCategory?: string;
  /** Backend classification used when deriving SGKV EC metadata. */
  usecaseType: 'EC' | 'LINKED' | 'ISLAND';
}

/**
 * Identifies a subsystem group returned by the filtered-by-subsystem endpoint.
 */
export interface SubsystemFilteredKv {
  keyValuePairs: KeyValueInfo[];
  subsystems: SubsystemFilterInfo[];
}

export interface SubsystemFilterInfo {
  name: string;
  subsystemNaturalId: number;
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
