import {create} from "zustand"

import {logger} from "~shared/lib/logger"

import type {RFEdge, RFNode} from "./types"

interface ProjectSelection {
  selectedEdges: RFEdge[]
  selectedNodes: RFNode[]
}

interface VisualizerSelectionStore {
  // Clear selection for a project
  clearSelection: (projectId: string) => void

  // Get selection for a project
  getSelection: (projectId: string) => ProjectSelection

  // Remove project (cleanup)
  removeProject: (projectId: string) => void

  // Per-project selection state
  selections: Record<string, ProjectSelection>

  // Set selection for a project
  setSelection: (projectId: string, nodes: RFNode[], edges: RFEdge[]) => void
}

export const useVisualizerSelectionStore = create<VisualizerSelectionStore>(
  (set, get) => ({
    clearSelection: (projectId: string): void => {
      set((state) => ({
        selections: {
          ...state.selections,
          [projectId]: {selectedEdges: [], selectedNodes: []},
        },
      }))
    },

    getSelection: (projectId: string): ProjectSelection => {
      const state = get()
      return (
        state.selections[projectId] || {selectedEdges: [], selectedNodes: []}
      )
    },

    removeProject: (projectId: string): void => {
      set((state) => {
        const {[projectId]: _, ...rest} = state.selections
        return {selections: rest}
      })
    },

    selections: {},

    setSelection: (
      projectId: string,
      nodes: RFNode[],
      edges: RFEdge[],
    ): void => {
      const nodeIds = nodes.map((n) => n.id).join(", ")
      const edgeIds = edges.map((e) => e.id).join(", ")
      logger.verbose(
        `Selection updated (project: ${projectId}, nodes: ${nodes.length} [${nodeIds}], edges: ${edges.length} [${edgeIds}])`,
      )
      set((state) => ({
        selections: {
          ...state.selections,
          [projectId]: {selectedEdges: edges, selectedNodes: nodes},
        },
      }))
    },
  }),
)
