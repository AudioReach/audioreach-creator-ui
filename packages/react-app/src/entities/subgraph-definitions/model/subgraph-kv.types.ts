/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {KeyValueInfo} from '~entities/usecases';

/**
 * Separates backend SGKV data from the UI state that decorates it.
 * UI vectors add selection, EC, and session ownership without changing pairs.
 */
/** UI-owned pair shape, isolated from the backend's key/value DTO names. */
export interface SubgraphKvPair {
  keyInfo: {
    keyId: number;
    keyLabel: string;
    keySystemId: string;
  };
  valueInfo: {
    valueId: number;
    valueLabel: string;
    valueSystemId: string;
  };
}

/** UI-owned SGKV vector; `isSessionAdded` gates local deletion. */
export interface KvSelection {
  isEc: boolean;
  isSessionAdded?: boolean;
  keyValuePairs: SubgraphKvPair[];
  selected: boolean;
  systemId: string;
}

/** Derived fields refreshed from usecase ownership without replacing a vector. */
export interface KvSelectionMetadata {
  isEc: boolean;
  selected: boolean;
}

/** Backend SGKV vector retained at the API boundary before UI mapping. */
export interface SubgraphKvVectorDto {
  keyValuePairs: KeyValueInfo[];
  systemId: string;
}
