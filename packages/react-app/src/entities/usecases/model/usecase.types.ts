/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {KeyValueInfo} from './usecase.dto';

/**
 * A single item in the usecase selection tree.
 * Covers every level: usecase, subsystem group etc.
 * Only the fields the UI actually needs — not the full backend DTO.
 */
export interface UsecaseItem {
  children?: UsecaseItem[];
  expanded: boolean;
  keyValuePairs: KeyValueInfo[];
  name: string;
  systemId?: string;
}

/**
 * A top-level category in the usecase selection control.
 * Contains a flat or nested list of UsecaseItems.
 */
export interface UsecaseCategory {
  expanded: boolean;
  items: UsecaseItem[];
  name: string;
}
