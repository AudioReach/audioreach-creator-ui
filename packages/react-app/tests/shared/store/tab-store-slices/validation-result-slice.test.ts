/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import {createStore} from 'zustand';

import {
  createValidationResultSlice,
  type ValidationResultSlice,
} from '~shared/store/tab-store-slices/validation-result-slice';

function createTestStore() {
  return createStore<ValidationResultSlice>()((set, get) => ({
    ...createValidationResultSlice(set, get),
  }));
}

describe('createValidationResultSlice', () => {
  it('shows critical, error, and warning results by default', () => {
    const store = createTestStore();

    expect(store.getState().selectedSeverities).toEqual([
      'critical',
      'error',
      'warning',
    ]);
  });

  it('removes one validation result and recomputes counts', () => {
    const store = createTestStore();
    store.getState().addValidationResult({
      message: 'Error row',
      severity: 'error',
    });
    store.getState().addValidationResult({
      message: 'Warning row',
      severity: 'warning',
    });
    const errorId = store.getState().validationResults[0].id;

    store.getState().removeValidationResult(errorId);

    expect(store.getState().validationResults).toHaveLength(1);
    expect(store.getState().validationResults[0].message).toBe('Warning row');
    expect(store.getState().errorCount).toBe(0);
    expect(store.getState().warningCount).toBe(1);
  });

  it('clears row selection when the removed row was selected', () => {
    const store = createTestStore();
    store.getState().addValidationResult({message: 'Row', severity: 'error'});
    const id = store.getState().validationResults[0].id;
    store.getState().selectRow(id);

    store.getState().removeValidationResult(id);

    expect(store.getState().selectedRowId).toBeNull();
  });
});
