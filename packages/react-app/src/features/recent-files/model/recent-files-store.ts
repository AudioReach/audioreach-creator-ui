import {create} from "zustand"

export interface RecentFile {
  lastOpened: Date
  name: string
  path: string
}

interface RecentFilesStore {
  addRecentFile: (file: Omit<RecentFile, "id" | "lastOpened">) => void
  clearRecentFiles: () => void
  getRecentFiles: () => RecentFile[]
  recentFiles: RecentFile[]
  removeRecentFile: (id: string) => void
}

/**
 * Minimal placeholder store.
 * - No persistence
 * - No side effects
 * - Methods are no-ops
 */
export const useRecentFilesStore = create<RecentFilesStore>((_set, get) => ({
  addRecentFile: (_file) => {
    // Placeholder — no-op
  },

  clearRecentFiles: () => {
    // Placeholder — no-op
  },

  getRecentFiles: () => {
    // Always return current (empty) state in placeholder
    return get().recentFiles
  },

  recentFiles: [],

  removeRecentFile: (_id) => {
    // Placeholder — no-op
  },
}))
