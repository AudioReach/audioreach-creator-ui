/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  AnyElementDto,
  ChangeInfoDto,
  ToolPolicy,
} from '~entities/spf-module-data';

export interface TreeViewData {
  changeInfo?: ChangeInfoDto;
  items: TreeViewItem[];
  /**
   * How this snapshot was produced. `'set'` tells the feature to reconcile
   * dirty/set state per-path instead of doing a full re-seed; omitted or
   * `'get'` means a full re-seed (the default, safe for existing callers).
   */
  source?: 'get' | 'set';
  systemId: string;
}

export interface TreeViewItem {
  changeInfo?: ChangeInfoDto;
  deprecated?: boolean;
  description?: string;
  elements: AnyElementDto[];
  /**
   * Domain-specific identifier — `parameterId` for cal/tag data,
   * `propertyId` for subgraph properties.
   */
  id: string;
  isHidden?: boolean;
  isNeuralNet?: boolean;
  isOffloaded?: boolean;
  isReadOnly?: boolean;
  name: string;
  toolPolicy?: ToolPolicy[];
}
