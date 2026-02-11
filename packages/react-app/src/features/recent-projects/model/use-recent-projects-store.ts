import {create} from "zustand"

export interface RecentProject {
  lastOpened: Date
  name: string
  path: string
}

interface RecentProjectsStore {
  addRecentProject: (file: Omit<RecentProject, "id" | "lastOpened">) => void
  clearRecentProjects: () => void
  getRecentProjects: () => RecentProject[]
  recentProjects: RecentProject[]
  removeRecentProject: (id: string) => void
}

/**
 * Minimal placeholder store.
 * - No persistence
 * - No side effects
 * - Methods are no-ops
 */
export const useRecentProjectsStore = create<RecentProjectsStore>(
  (_set, get) => ({
    addRecentProject: (_file) => {
      // Placeholder — no-op
    },

    clearRecentProjects: () => {
      // Placeholder — no-op
    },

    getRecentProjects: () => {
      // Always return current (empty) state in placeholder
      return get().recentProjects
    },

    recentProjects: [],

    removeRecentProject: (_id) => {
      // Placeholder — no-op
    },
  }),
)
