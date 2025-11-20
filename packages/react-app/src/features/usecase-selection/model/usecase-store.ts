import {create} from "zustand"

import type {Usecase, UsecaseList} from "./types"

interface ApplicationStore {
  // Usecase management
  getUsecaseList: (projectGroupId: string) => UsecaseList | null
  getUsecases: (projectGroupId: string) => Usecase[]
  setUsecaseList: (projectGroupId: string, usecaseList: UsecaseList) => void
  // Usecase data storage (keyed by project group ID)
  usecaseLists: Record<string, UsecaseList>
}

export const useUsecaseStore = create<ApplicationStore>((set, get) => ({
  // Usecase management methods
  getUsecaseList: (projectGroupId: string): UsecaseList | null => {
    const state = get()
    return state.usecaseLists[projectGroupId] || null
  },
  getUsecases: (projectGroupId: string): Usecase[] => {
    const state = get()
    const usecaseList = state.usecaseLists[projectGroupId]
    return usecaseList?._usecases || []
  },

  setUsecaseList: (projectGroupId: string, usecaseList: UsecaseList): void => {
    set((state) => ({
      usecaseLists: {
        ...state.usecaseLists,
        [projectGroupId]: usecaseList,
      },
    }))
  },
  usecaseLists: {},
}))
