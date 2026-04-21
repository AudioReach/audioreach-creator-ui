/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/** Per-project search state */
export interface ProjectSearchState {
  /** Search history for this project (most recent first) */
  history: string[];
  /** Current search term for this project */
  searchTerm: string;
}

export interface SearchComponentStore {
  /** Add a term to the search history for a project */
  addToHistory: (projectId: string, term: string) => void;
  /** Clear search history for a project */
  clearHistory: (projectId: string) => void;
  /** Get the current state for a project (returns defaults if not yet initialised) */
  getProjectState: (projectId: string) => ProjectSearchState;
  /** Per-project search state keyed by projectId */
  projects: Record<string, ProjectSearchState>;
  /** Remove all state for a project (call on project close / unmount) */
  removeProject: (projectId: string) => void;
  /** Update the current search term for a project */
  setSearchTerm: (projectId: string, term: string) => void;
}
