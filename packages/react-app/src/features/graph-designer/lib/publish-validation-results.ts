/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {GraphDesignerStoreApi} from '~features/graph-designer/model/graph-designer-store-context';
import {tabFocusRegistry, VALIDATION_RESULTS_TAB_NODE_ID} from '~shared/store';
import type {ValidationResult} from '~shared/store/tab-store-slices/validation-result-slice';

export function publishValidationResults(
  store: GraphDesignerStoreApi,
  rows: Omit<ValidationResult, 'id'>[],
): void {
  const {addValidationResult, clearValidationResults} = store.getState();
  clearValidationResults();
  if (rows.length === 0) {
    return;
  }
  for (const row of rows) {
    addValidationResult(row);
  }
  tabFocusRegistry.focusTab(VALIDATION_RESULTS_TAB_NODE_ID);
}
