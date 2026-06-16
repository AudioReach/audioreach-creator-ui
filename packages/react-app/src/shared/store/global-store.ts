/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {create} from 'zustand';

import {createAppSlice} from './global-store-slices/app-slice';
import {createBackendConnectionSlice} from './global-store-slices/backend-connection-slice';
import {createProjectGroupSlice} from './global-store-slices/project-group-slice';
import {createRecentProjectsSlice} from './global-store-slices/recent-projects-slice';
import {createSessionSlice} from './global-store-slices/session-slice';
import type {
  AppSlice,
  BackendConnectionSlice,
  ProjectGroupSlice,
  RecentProjectsSlice,
  SessionSlice,
} from './global-store.types';

export type GlobalStore = AppSlice &
  BackendConnectionSlice &
  RecentProjectsSlice &
  SessionSlice &
  ProjectGroupSlice;

export const useGlobalStore = create<GlobalStore>((set, get) => ({
  ...createAppSlice(
    (partial) => set(partial as Partial<GlobalStore>),
    () => get() as AppSlice,
  ),
  ...createBackendConnectionSlice(
    (partial) => set(partial as Partial<GlobalStore>),
    () => get() as BackendConnectionSlice,
  ),
  ...createRecentProjectsSlice(
    (partial) => set(partial as Partial<GlobalStore>),
    () => get() as RecentProjectsSlice,
  ),
  ...createSessionSlice(
    (partial) => set(partial as Partial<GlobalStore>),
    () => get() as SessionSlice,
  ),
  ...createProjectGroupSlice(
    (partial) => set(partial as Partial<GlobalStore>),
    () => get() as ProjectGroupSlice,
    () => get() as AppSlice,
  ),
}));
