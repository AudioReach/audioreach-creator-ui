/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {createContext, useContext} from 'react';

import {type StoreApi, useStore} from 'zustand';
import {useShallow} from 'zustand/react/shallow';

import type {ProjectStore} from './project-store.types';

export type ProjectStoreApi = StoreApi<ProjectStore>;

export const ProjectStoreContext = createContext<ProjectStoreApi | null>(null);
ProjectStoreContext.displayName = 'ProjectStoreContext';

export function useProjectStore(): ProjectStoreApi {
  const store = useContext(ProjectStoreContext);
  if (!store) {
    throw new Error(
      'useProjectStore must be used within a ProjectStoreContext.Provider',
    );
  }
  return store;
}

export function useProjectStoreShallow<T>(
  selector: (state: ProjectStore) => T,
): T {
  const store = useProjectStore();
  return useStore(store, useShallow(selector));
}
