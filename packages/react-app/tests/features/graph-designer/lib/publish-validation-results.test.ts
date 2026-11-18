/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');
jest.mock('~shared/store', () => ({
  ...jest.requireActual('~shared/store'),
  tabFocusRegistry: {
    focusTab: jest.fn(),
  },
}));

import type {GraphDesignerStoreApi} from '~features/graph-designer';
import {publishValidationResults} from '~features/graph-designer/lib/publish-validation-results';
import {tabFocusRegistry, VALIDATION_RESULTS_TAB_NODE_ID} from '~shared/store';
import type {ValidationResult} from '~shared/store/tab-store-slices/validation-result-slice';

function createStoreMock() {
  const addValidationResult = jest.fn();
  const clearValidationResults = jest.fn();
  const store = {
    getState: () => ({
      addValidationResult,
      clearValidationResults,
    }),
  } as unknown as GraphDesignerStoreApi;

  return {addValidationResult, clearValidationResults, store};
}

describe('publishValidationResults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears, adds rows, and focuses the validation results tab', () => {
    const {addValidationResult, clearValidationResults, store} =
      createStoreMock();
    const rows: Omit<ValidationResult, 'id'>[] = [
      {errorCode: 'WARN_1', message: 'Warning one', severity: 'warning'},
      {errorCode: 'ERR_1', message: 'Error one', severity: 'error'},
    ];

    publishValidationResults(store, rows);

    expect(clearValidationResults).toHaveBeenCalledTimes(1);
    expect(addValidationResult).toHaveBeenNthCalledWith(1, rows[0]);
    expect(addValidationResult).toHaveBeenNthCalledWith(2, rows[1]);
    expect(tabFocusRegistry.focusTab).toHaveBeenCalledWith(
      VALIDATION_RESULTS_TAB_NODE_ID,
    );
  });

  it('clears but does not focus when there are no rows', () => {
    const {addValidationResult, clearValidationResults, store} =
      createStoreMock();

    publishValidationResults(store, []);

    expect(clearValidationResults).toHaveBeenCalledTimes(1);
    expect(addValidationResult).not.toHaveBeenCalled();
    expect(tabFocusRegistry.focusTab).not.toHaveBeenCalled();
  });
});
