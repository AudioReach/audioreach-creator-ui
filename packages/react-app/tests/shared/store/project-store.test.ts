/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import {createProjectStore} from '~shared/store/project-store';

describe('createProjectStore — exclusive lock isolation across projects', () => {
  it('exposes the exclusive lock on the composed store', () => {
    const store = createProjectStore('proj-1');

    expect(store.getState().activeExclusiveMode).toBe('none');

    const acquired = store.getState().setActiveExclusiveMode('usecase-edit');

    expect(acquired).toBe(true);
    expect(store.getState().activeExclusiveMode).toBe('usecase-edit');

    store.getState().releaseExclusiveMode('usecase-edit');
    expect(store.getState().activeExclusiveMode).toBe('none');
  });

  it("does not let one project's lock block a different project's store", () => {
    const storeA = createProjectStore('proj-a');
    const storeB = createProjectStore('proj-b');

    expect(storeA.getState().setActiveExclusiveMode('usecase-edit')).toBe(true);
    expect(storeB.getState().setActiveExclusiveMode('usecase-edit')).toBe(true);
    expect(storeA.getState().activeExclusiveMode).toBe('usecase-edit');
    expect(storeB.getState().activeExclusiveMode).toBe('usecase-edit');
  });
});
