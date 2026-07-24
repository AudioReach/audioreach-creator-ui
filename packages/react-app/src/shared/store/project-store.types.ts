/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export type {
  ProjectMetaDataSlice,
  UsecaseMetadata,
} from './project-store-slices/project-metadata-slice';
export type {
  LogsSlice,
  LogEntry,
  LogType,
} from './project-store-slices/logs-slice';
export type {TabsSlice, TabEntry} from './project-store-slices/tabs-slice';
export type {
  ExclusiveLockSlice,
  ExclusiveSessionMode,
} from './project-store-slices/exclusive-lock-slice';

import type {ExclusiveLockSlice} from './project-store-slices/exclusive-lock-slice';
import type {LogsSlice} from './project-store-slices/logs-slice';
import type {ProjectMetaDataSlice} from './project-store-slices/project-metadata-slice';
import type {TabsSlice} from './project-store-slices/tabs-slice';

export type ProjectStore = {
  closeProject: () => void;
  projectId: string;
} & ProjectMetaDataSlice &
  TabsSlice &
  LogsSlice &
  ExclusiveLockSlice;
