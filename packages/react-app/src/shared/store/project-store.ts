/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {createStore, type StoreApi} from 'zustand';

import {logger} from '~shared/lib/logger';

import {createLogsSlice} from './project-store-slices/logs-slice';
import {createProjectMetaDataSlice} from './project-store-slices/project-metadata-slice';
import {createTabsSlice} from './project-store-slices/tabs-slice';
import type {
  LogsSlice,
  ProjectMetaDataSlice,
  ProjectStore,
  TabsSlice,
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

    projectId,

    // Typed wrappers narrow set/get to each slice's own surface — no `any` needed.
    ...createProjectMetaDataSlice(
      (partial) => set(partial as Partial<ProjectStore>),
      () => get() as ProjectMetaDataSlice,
    ),
    ...createTabsSlice(
      (partial) => set(partial as Partial<ProjectStore>),
      () => get() as TabsSlice,
    ),
    ...createLogsSlice(
      (partial) => set(partial as Partial<ProjectStore>),
      () => get() as LogsSlice,
    ),
  }));
}
