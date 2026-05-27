/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export type SliceStatus = 'uninitialized' | 'loading' | 'ready' | 'error';

export type TabType = 'graph-designer';

export type RegistrationStatus =
  | 'unregistered'
  | 'registering'
  | 'registered'
  | 'error';

export interface Preferences {
  maxOpenProjects: number;
  showModuleIds: boolean;
  showSubgraphIds: boolean;
  theme: 'light' | 'dark';
}

export interface AppSlice {
  activeProjectId: string | null;
  preferences: Preferences;
  selectedUsecaseIds: string[];
  setActiveProject: (projectId: string | null) => void;
  setSelectedUsecaseIds: (ids: string[]) => void;
  updatePreferences: (prefs: Partial<Preferences>) => void;
}

export interface BackendConnectionSlice {
  failCount: number;
  incrementFail: (errorMessage?: string) => void;
  isConnected: boolean;
  lastError: string | null;
  lastHealthCheckAt: number | null;
  markAvailable: () => void;
  markUnavailable: (errorMessage?: string) => void;
  registrationStatus: RegistrationStatus;
  resetFailures: () => void;
  setLastHealthCheckAt: (ts: number) => void;
  setRegistrationStatus: (status: RegistrationStatus) => void;
}

export interface RecentProject {
  filePath: string;
  lastOpenedAt: number;
  projectId: string;
  projectName: string;
}

export interface RecentProjectsSlice {
  clearRecentProjects: () => void;
  recentProjects: RecentProject[];
  removeRecentProject: (projectId: string) => void;
  upsertRecentProject: (project: RecentProject) => void;
}
