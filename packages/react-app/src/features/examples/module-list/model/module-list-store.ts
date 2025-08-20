// Refactored module list store - only handles ModuleIdentity data
import {create} from "zustand"

import {moduleListApi} from "~entities/examples/module/api"
import type {ModuleIdentity} from "~entities/examples/module/model"

export interface ModuleListState {
  error: string | null
  // Actions
  fetchModules: () => Promise<void>
  // Getters
  getModuleById: (id: string) => ModuleIdentity | null
  isLoading: boolean
  modules: ModuleIdentity[]
  updateModuleIdentity: (id: string, updates: Partial<ModuleIdentity>) => void
}

export const useModuleListStore = create<ModuleListState>((set, get) => ({
  error: null,
  // Actions
  fetchModules: async () => {
    set({error: null, isLoading: true})
    try {
      const modules = await moduleListApi.fetchModules()
      set({isLoading: false, modules})
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch modules",
        isLoading: false,
      })
    }
  },
  // Getters
  getModuleById: (id) => {
    return get().modules.find((m) => m.id === id) || null
  },
  isLoading: false,
  modules: [],
  updateModuleIdentity: (id, updates) => {
    set((state) => ({
      modules: state.modules.map((m) => (m.id === id ? {...m, ...updates} : m)),
    }))
  },
}))
