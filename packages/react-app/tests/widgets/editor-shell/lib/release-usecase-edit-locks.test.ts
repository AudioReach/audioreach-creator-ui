/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import {createProjectStore} from '~shared/store/project-store';
import {ProjectStoreRegistry} from '~shared/store/project-store-registry';
import {releaseUsecaseEditLocks} from '~widgets/editor-shell/lib/release-usecase-edit-locks';

describe('releaseUsecaseEditLocks', () => {
  it('releases every usecase-edit lock across all registered project stores, leaving other modes untouched', () => {
    const registry = new ProjectStoreRegistry();
    const project1 = createProjectStore('proj-1');
    const project2 = createProjectStore('proj-2');
    const project3 = createProjectStore('proj-3');
    registry.register('proj-1', project1);
    registry.register('proj-2', project2);
    registry.register('proj-3', project3);
    project1.getState().setActiveExclusiveMode('usecase-edit');
    project2.getState().setActiveExclusiveMode('usecase-edit');
    project3.getState().setActiveExclusiveMode('discovery-wizard');

    releaseUsecaseEditLocks(registry);

    expect(project1.getState().activeExclusiveMode).toBe('none');
    expect(project2.getState().activeExclusiveMode).toBe('none');
    expect(project3.getState().activeExclusiveMode).toBe('discovery-wizard');
  });

  it('is a no-op when no project store holds the usecase-edit lock', () => {
    const registry = new ProjectStoreRegistry();
    const project1 = createProjectStore('proj-1');
    registry.register('proj-1', project1);

    expect(() => releaseUsecaseEditLocks(registry)).not.toThrow();
    expect(project1.getState().activeExclusiveMode).toBe('none');
  });

  it('is a no-op when the registry has no registered project stores', () => {
    const registry = new ProjectStoreRegistry();

    expect(() => releaseUsecaseEditLocks(registry)).not.toThrow();
  });
});
