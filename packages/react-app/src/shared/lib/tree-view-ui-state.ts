/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {GenericTreeViewUiState} from '~shared/types/tree-view-ui-state';

/**
 * GenericTreeView only ever emits partial onUiStateChange patches (search
 * text, view mode, a single toggle, etc.) — never a complete object. Callers
 * that persist this state must merge patches onto a fully-populated base so
 * the required GenericTreeViewUiState fields are never silently missing.
 */
export function createDefaultTreeViewUiState(): GenericTreeViewUiState {
  return {
    arrayCounts: {},
    committedValues: {},
    dirtyPaths: [],
    elementValues: {},
    expandedIds: [],
    invalidPaths: [],
    legacyExpandedKeys: ['__module__'],
    panelSplitPct: 30,
    policyFilter: ['BASIC'],
    searchText: '',
    selectedIds: [],
    setPaths: [],
    showBadges: false,
    showErrorsOnly: false,
    showModifiedOnly: false,
    showPids: false,
    showRanges: false,
    viewMode: 'modern',
  };
}

export function isUiStateDirty(uiState?: GenericTreeViewUiState): boolean {
  return (uiState?.dirtyPaths.length ?? 0) > 0;
}

export function hasInvalidPaths(uiState?: GenericTreeViewUiState): boolean {
  return (uiState?.invalidPaths.length ?? 0) > 0;
}

export function hasSetPaths(uiState?: GenericTreeViewUiState): boolean {
  return (uiState?.setPaths.length ?? 0) > 0;
}
