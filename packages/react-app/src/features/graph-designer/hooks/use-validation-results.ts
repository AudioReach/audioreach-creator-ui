/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useGraphDesignerStoreShallow} from '~shared/store/tab-stores/graph-designer-store-context';

export function useValidationResults() {
  return useGraphDesignerStoreShallow((state) => ({
    addValidationResult: state.addValidationResult,
    clearRowSelection: state.clearRowSelection,
    clearValidationResults: state.clearValidationResults,
    criticalCount: state.criticalCount,
    errorCount: state.errorCount,
    searchQuery: state.searchQuery,
    selectedRowId: state.selectedRowId,
    selectedSeverities: state.selectedSeverities,
    selectRow: state.selectRow,
    setSearchQuery: state.setSearchQuery,
    setSelectedSeverities: state.setSelectedSeverities,
    validationResults: state.validationResults,
    validationStatus: state.validationStatus,
    warningCount: state.warningCount,
  }));
}
