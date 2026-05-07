/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {create} from 'zustand';

import {logger} from '~shared/lib/logger';

/**
 * Search highlight state for a project.
 * - `matchNodeIds`  — ReactFlow node IDs of all nodes matching the search term
 *                     (rendered in yellow)
 * - `activeNodeId`  — ReactFlow node ID of the currently focused match
 *                     (rendered in orange); null when no match is active
 */
export interface SearchHighlight {
  activeNodeId: string | null;
  matchNodeIds: string[];
}

interface SearchHighlightStore {
  clearSearchHighlight: (projectId: string) => void;

  removeProject: (projectId: string) => void;

  // Per-project search highlight state
  searchHighlights: Record<string, SearchHighlight>;

  setSearchHighlight: (
    projectId: string,
    matchNodeIds: Set<string>,
    activeNodeId: string | null,
  ) => void;
}

export const useSearchHighlightStore = create<SearchHighlightStore>((set) => ({
  clearSearchHighlight: (projectId: string): void => {
    set((state) => ({
      searchHighlights: {
        ...state.searchHighlights,
        [projectId]: {activeNodeId: null, matchNodeIds: []},
      },
    }));
  },

  removeProject: (projectId: string): void => {
    set((state) => {
      const {[projectId]: _hl, ...restHighlights} = state.searchHighlights;
      return {searchHighlights: restHighlights};
    });
  },

  searchHighlights: {},

  setSearchHighlight: (
    projectId: string,
    matchNodeIds: Set<string>,
    activeNodeId: string | null,
  ): void => {
    logger.verbose(
      `Search highlight updated (project: ${projectId}, matches: ${matchNodeIds.size}, active: ${activeNodeId ?? 'none'})`,
    );
    set((state) => ({
      searchHighlights: {
        ...state.searchHighlights,
        [projectId]: {activeNodeId, matchNodeIds: [...matchNodeIds]},
      },
    }));
  },
}));
