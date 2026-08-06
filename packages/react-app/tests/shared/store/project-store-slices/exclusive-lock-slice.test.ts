/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import {createStore} from 'zustand';

import {
  createExclusiveLockSlice,
  type ExclusiveLockSlice,
} from '~shared/store/project-store-slices/exclusive-lock-slice';

function makeStore() {
  return createStore<ExclusiveLockSlice>((set, get) =>
    createExclusiveLockSlice(set, get),
  );
}

describe('createExclusiveLockSlice', () => {
  it('acquires the lock when no mode is active', () => {
    const store = makeStore();

    const acquired = store.getState().setActiveExclusiveMode('usecase-edit');

    expect(acquired).toBe(true);
    expect(store.getState().activeExclusiveMode).toBe('usecase-edit');
  });

  it('rejects a second acquisition of the same mode', () => {
    const store = makeStore();
    store.getState().setActiveExclusiveMode('usecase-edit');

    const acquired = store.getState().setActiveExclusiveMode('usecase-edit');

    expect(acquired).toBe(false);
    expect(store.getState().activeExclusiveMode).toBe('usecase-edit');
  });

  it('rejects acquisition of a different mode while one is already held', () => {
    const store = makeStore();
    store.getState().setActiveExclusiveMode('discovery-wizard');

    const acquired = store.getState().setActiveExclusiveMode('usecase-edit');

    expect(acquired).toBe(false);
    expect(store.getState().activeExclusiveMode).toBe('discovery-wizard');
  });

  it('releases the lock when the released mode matches the currently held mode', () => {
    const store = makeStore();
    store.getState().setActiveExclusiveMode('usecase-edit');

    store.getState().releaseExclusiveMode('usecase-edit');

    expect(store.getState().activeExclusiveMode).toBe('none');
  });

  it('does not release the lock when the released mode does not match the held mode', () => {
    const store = makeStore();
    store.getState().setActiveExclusiveMode('usecase-edit');

    store.getState().releaseExclusiveMode('discovery-wizard');

    expect(store.getState().activeExclusiveMode).toBe('usecase-edit');
  });

  it('is a no-op when releasing a lock that is not held at all', () => {
    const store = makeStore();

    expect(() =>
      store.getState().releaseExclusiveMode('usecase-edit'),
    ).not.toThrow();
    expect(store.getState().activeExclusiveMode).toBe('none');
  });

  it('allows re-acquiring the same mode after release', () => {
    const store = makeStore();
    store.getState().setActiveExclusiveMode('usecase-edit');
    store.getState().releaseExclusiveMode('usecase-edit');

    const acquired = store.getState().setActiveExclusiveMode('usecase-edit');

    expect(acquired).toBe(true);
  });
});
