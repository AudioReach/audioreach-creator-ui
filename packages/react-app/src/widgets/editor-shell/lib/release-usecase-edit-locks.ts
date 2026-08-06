/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ProjectStoreRegistry} from '~shared/store/project-store-registry';

/**
 * Releases the `'usecase-edit'` exclusive lock on every registered
 * `ProjectStore` that currently holds it. Called from `EditorShell`'s
 * `beforeunload` handler — the one release path the per-tab `useEffect`
 * cleanup (`exitEditMode`) cannot cover, since an app quit/reload tears
 * down the renderer without running React unmount cleanup at all.
 *
 * Leaves `'discovery-wizard'`/`'diff-merge'` locks untouched — releasing
 * those on app teardown is those features' own concern.
 */
export function releaseUsecaseEditLocks(registry: ProjectStoreRegistry): void {
  registry.getAll().forEach((projectStore) => {
    if (projectStore.getState().activeExclusiveMode === 'usecase-edit') {
      projectStore.getState().releaseExclusiveMode('usecase-edit');
    }
  });
}
