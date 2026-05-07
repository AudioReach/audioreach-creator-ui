/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {create} from 'zustand';

import type {
  ProjectSearchState,
  SearchComponentStore,
} from './search-component.types';

/** Maximum number of history entries retained per project */
const MAX_HISTORY_SIZE = 5;

/** Default state returned for projects that have not been initialised yet */
export const DEFAULT_PROJECT_STATE: ProjectSearchState = {
  history: [],
  isSearchVisible: false,
  searchTerm: '',
};

export const useSearchComponentStore = create<SearchComponentStore>(
  (set, get) => ({
    addToHistory: (projectId, term) => {
      const trimmed = term.trim();
      if (!trimmed) {
        return;
      }

      set((state) => {
        const current = state.projects[projectId] ?? DEFAULT_PROJECT_STATE;
        const deduplicated = current.history.filter((h) => h !== trimmed);
        return {
          projects: {
            ...state.projects,
            [projectId]: {
              ...current,
              history: [trimmed, ...deduplicated].slice(0, MAX_HISTORY_SIZE),
            },
          },
        };
      });
    },

    clearHistory: (projectId) => {
      set((state) => ({
        projects: {
          ...state.projects,
          [projectId]: {
            ...(state.projects[projectId] ?? DEFAULT_PROJECT_STATE),
            history: [],
          },
        },
      }));
    },

    getProjectState: (projectId) => {
      return get().projects[projectId] ?? DEFAULT_PROJECT_STATE;
    },

    projects: {},

    removeProject: (projectId) => {
      set((state) => {
        const {[projectId]: _removed, ...rest} = state.projects;
        return {projects: rest};
      });
    },

    setSearchTerm: (projectId, term) => {
      set((state) => ({
        projects: {
          ...state.projects,
          [projectId]: {
            ...(state.projects[projectId] ?? DEFAULT_PROJECT_STATE),
            searchTerm: term,
          },
        },
      }));
    },

    setSearchVisible: (projectId, visible) => {
      set((state) => ({
        projects: {
          ...state.projects,
          [projectId]: {
            ...(state.projects[projectId] ?? DEFAULT_PROJECT_STATE),
            isSearchVisible: visible,
          },
        },
      }));
    },
  }),
);
