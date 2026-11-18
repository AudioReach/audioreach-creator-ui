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
});
