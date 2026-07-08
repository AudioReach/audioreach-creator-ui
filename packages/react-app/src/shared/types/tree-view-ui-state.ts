/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export interface GenericTreeViewUiState {
  arrayCounts: Record<string, number>; // Record not Map — store state must be serializable
  committedValues: Record<string, string>;
  dirtyPaths: string[];
  elementValues: Record<string, string>;
  expandedIds: string[];
  invalidPaths: string[];
  legacyExpandedKeys: string[];
  panelSplitPct: number;
  policyFilter: ('ADVANCED' | 'BASIC')[];
  searchText: string;
  selectedIds: string[];
  setPaths: string[];
  showBadges: boolean;
  showErrorsOnly: boolean;
  showModifiedOnly: boolean;
  showPids: boolean;
  showRanges: boolean;
  viewMode: 'legacy' | 'modern';
}
