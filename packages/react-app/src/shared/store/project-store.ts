/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {createStore, type StoreApi} from 'zustand';

import {logger} from '~shared/lib/logger';

import {createExclusiveLockSlice} from './project-store-slices/exclusive-lock-slice';
import {createLogsSlice} from './project-store-slices/logs-slice';
import {createProjectMetaDataSlice} from './project-store-slices/project-metadata-slice';
import {createTabsSlice} from './project-store-slices/tabs-slice';
import {createUserPreferencesSlice} from './project-store-slices/user-preferences-slice';
import type {
  ProjectStore,
} from './project-store.types';

export type {ProjectStore};

export function createProjectStore(projectId: string): StoreApi<ProjectStore> {
  return createStore<ProjectStore>((set, get) => ({
    closeProject: () => {
      logger.debug('Project closed', {
        action: 'close_project',
        component: 'ProjectStore',
        projectId,
      });
    },

    editModeState: 'view',

    projectId,

    setEditModeState: (state: 'view' | 'edit'): void => {
      set({editModeState: state});

      logger.debug(`Edit mode state set: ${state}`, {
        action: 'set_edit_mode_state',
        component: 'ProjectStore',
        projectId,
      });
    },

    // Typed wrappers narrow set/get to each slice's own surface — no `any` needed.
    ...createProjectMetaDataSlice(
      (partial) => set(partial as Partial<ProjectStore>),
      () => get(),
    ),
    ...createTabsSlice(
      (partial) => set(partial as Partial<ProjectStore>),
      () => get(),
    ),
    ...createLogsSlice(
      (partial) => set(partial as Partial<ProjectStore>),
      () => get(),
    ),
    ...createUserPreferencesSlice(
      (partial) => set(partial as Partial<ProjectStore>),
      () => get(),
      projectId,
    ),
    ...createExclusiveLockSlice(
      (partial) => set(partial as Partial<ProjectStore>),
      () => get(),
    ),
  }));
}
