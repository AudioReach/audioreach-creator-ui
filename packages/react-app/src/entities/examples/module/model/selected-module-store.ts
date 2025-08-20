import {create} from "zustand"

interface SelectedModuleState {
  clearSelection: () => void
  isModuleSelected: (moduleId: string) => boolean
  selectedModuleId: string | null
  selectModule: (moduleId: string | null) => void
}

export const useSelectedModuleStore = create<SelectedModuleState>(
  (set, get) => ({
    clearSelection: () => {
      set({selectedModuleId: null})
    },

    isModuleSelected: (moduleId) => {
      return get().selectedModuleId === moduleId
    },

    selectedModuleId: null,

    selectModule: (moduleId) => {
      set({selectedModuleId: moduleId})
    },
  }),
)
