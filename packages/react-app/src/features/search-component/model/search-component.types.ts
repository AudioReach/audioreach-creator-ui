/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export interface ProjectSearchState {
  /** Most recent first */
  history: string[];
  isSearchVisible: boolean;
  searchTerm: string;
}

export interface SearchComponentStore {
  addToHistory: (projectId: string, term: string) => void;
  clearHistory: (projectId: string) => void;
  getProjectState: (projectId: string) => ProjectSearchState;
  projects: Record<string, ProjectSearchState>;
  removeProject: (projectId: string) => void;
  setSearchTerm: (projectId: string, term: string) => void;
  setSearchVisible: (projectId: string, visible: boolean) => void;
}
