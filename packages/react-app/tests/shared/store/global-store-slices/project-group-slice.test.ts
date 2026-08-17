/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import {useGlobalStore} from '~shared/store/global-store';

describe('ProjectGroupSlice — updateProjectFilePath', () => {
  beforeEach(() => {
    // Reset store to clean state before each test
    // activeProjectId included defensively — registerProjectGroup doesn't read it
    // but other slices might modify it between tests
    useGlobalStore.setState({
      activeProjectId: null,
      nextColorId: 1,
      openProjects: [],
    });

    jest.clearAllMocks();
  });

  // Correct project's filePath is updated to the new value
  it('updates filePath for the matching project', () => {
    // Seed two projects
    useGlobalStore
      .getState()
      .registerProjectGroup('proj-1', '/original/one.awsp');
    useGlobalStore
      .getState()
      .registerProjectGroup('proj-2', '/original/two.awsp');

    useGlobalStore.getState().updateProjectFilePath('proj-1', '/new/one.awsp');

    const {openProjects} = useGlobalStore.getState();
    const updated = openProjects.find((p) => p.projectId === 'proj-1');
    expect(updated?.filePath).toBe('/new/one.awsp');
  });

  // Other projects in the store are not modified when one is updated
  it('does not affect other projects when updating one', () => {
    useGlobalStore
      .getState()
      .registerProjectGroup('proj-1', '/original/one.awsp');
    useGlobalStore
      .getState()
      .registerProjectGroup('proj-2', '/original/two.awsp');

    useGlobalStore.getState().updateProjectFilePath('proj-1', '/new/one.awsp');

    const {openProjects} = useGlobalStore.getState();
    const untouched = openProjects.find((p) => p.projectId === 'proj-2');
    expect(untouched?.filePath).toBe('/original/two.awsp');
  });

  // Store remains unchanged when the given projectId does not exist
  it('is a no-op when projectId is not found', () => {
    useGlobalStore
      .getState()
      .registerProjectGroup('proj-1', '/original/one.awsp');

    // Update a non-existent project
    useGlobalStore
      .getState()
      .updateProjectFilePath('non-existent', '/new/path.awsp');

    const {openProjects} = useGlobalStore.getState();
    expect(openProjects).toHaveLength(1);
    expect(openProjects[0].filePath).toBe('/original/one.awsp');
  });
});
