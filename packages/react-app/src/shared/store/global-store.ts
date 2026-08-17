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
    () => get(),
  ),
  ...createBackendConnectionSlice(
    (partial) => set(partial as Partial<GlobalStore>),
    () => get(),
  ),
  ...createRecentProjectsSlice(
    (partial) => set(partial as Partial<GlobalStore>),
    () => get(),
  ),
  ...createSessionSlice(
    (partial) => set(partial as Partial<GlobalStore>),
    () => get(),
  ),
  ...createProjectGroupSlice(
    (partial) => set(partial as Partial<GlobalStore>),
    () => get(),
    () => get(),
  ),
}));
