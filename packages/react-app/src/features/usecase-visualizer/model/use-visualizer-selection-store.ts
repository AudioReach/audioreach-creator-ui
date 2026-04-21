/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {create} from 'zustand';

import {logger} from '~shared/lib/logger';

import type {RFEdge, RFNode} from './usecase-visualizer.types';

interface ProjectSelection {
  selectedEdges: RFEdge[];
  selectedNodes: RFNode[];
}

/**
 * Search highlight state for a project.
 * - `matchNodeIds`  — ReactFlow node IDs of all nodes matching the search term
 *                     (rendered in yellow)
 * - `activeNodeId`  — ReactFlow node ID of the currently focused match
 *                     (rendered in orange); null when no match is active
 */
export interface SearchHighlight {
  activeNodeId: string | null;
  matchNodeIds: Set<string>;
}

interface VisualizerSelectionStore {
  // Clear search highlights for a project (restores nodes to normal state)
  clearSearchHighlight: (projectId: string) => void;

  // Clear selection for a project
  clearSelection: (projectId: string) => void;

  // Get selection for a project
  getSelection: (projectId: string) => ProjectSelection;

  // Remove project (cleanup)
  removeProject: (projectId: string) => void;

  // Per-project search highlight state
  searchHighlights: Record<string, SearchHighlight>;

  // Per-project selection state
  selections: Record<string, ProjectSelection>;

  // Set search highlights for a project
  setSearchHighlight: (
    projectId: string,
    matchNodeIds: Set<string>,
    activeNodeId: string | null,
  ) => void;

  // Set selection for a project
  setSelection: (projectId: string, nodes: RFNode[], edges: RFEdge[]) => void;
}

export const useVisualizerSelectionStore = create<VisualizerSelectionStore>(
  (set, get) => ({
    clearSearchHighlight: (projectId: string): void => {
      set((state) => ({
        searchHighlights: {
          ...state.searchHighlights,
          [projectId]: {activeNodeId: null, matchNodeIds: new Set<string>()},
        },
      }));
    },

    clearSelection: (projectId: string): void => {
      set((state) => ({
        selections: {
          ...state.selections,
          [projectId]: {selectedEdges: [], selectedNodes: []},
        },
      }));
    },

    getSelection: (projectId: string): ProjectSelection => {
      const state = get();
      return (
        state.selections[projectId] || {selectedEdges: [], selectedNodes: []}
      );
    },

    removeProject: (projectId: string): void => {
      set((state) => {
        const {[projectId]: _sel, ...restSelections} = state.selections;
        const {[projectId]: _hl, ...restHighlights} = state.searchHighlights;
        return {searchHighlights: restHighlights, selections: restSelections};
      });
    },

    searchHighlights: {},

    selections: {},

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
          [projectId]: {activeNodeId, matchNodeIds},
        },
      }));
    },

    setSelection: (
      projectId: string,
      nodes: RFNode[],
      edges: RFEdge[],
    ): void => {
      const nodeIds = nodes.map((n) => n.id).join(', ');
      const edgeIds = edges.map((e) => e.id).join(', ');
      logger.verbose(
        `Selection updated (project: ${projectId}, nodes: ${nodes.length} [${nodeIds}], edges: ${edges.length} [${edgeIds}])`,
      );
      set((state) => ({
        selections: {
          ...state.selections,
          [projectId]: {selectedEdges: edges, selectedNodes: nodes},
        },
      }));
    },
  }),
);
