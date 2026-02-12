/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {create} from "zustand"

interface UsecaseStore {
  addSelectedUsecase: (projectGroupId: string, usecase: string) => void
  clearSelectedUsecases: (projectGroupId: string) => void
  getSelectedUsecases: (projectGroupId: string) => string[]
  removeSelectedUsecase: (projectGroupId: string, usecase: string) => void
  // Selected usecases management (keyed by project group ID)
  selectedUsecases: Record<string, string[]>
  setSelectedUsecases: (projectGroupId: string, usecases: string[]) => void
}

export const useUsecaseStore = create<UsecaseStore>((set, get) => ({
  addSelectedUsecase: (projectGroupId: string, usecase: string): void => {
    set((state) => {
      const currentSelected = state.selectedUsecases[projectGroupId] || []
      if (!currentSelected.includes(usecase)) {
        return {
          selectedUsecases: {
            ...state.selectedUsecases,
            [projectGroupId]: [...currentSelected, usecase],
          },
        }
      }
      return state
    })
  },

  clearSelectedUsecases: (projectGroupId: string): void => {
    set((state) => ({
      selectedUsecases: {
        ...state.selectedUsecases,
        [projectGroupId]: [],
      },
    }))
  },

  getSelectedUsecases: (projectGroupId: string): string[] => {
    const state = get()
    return state.selectedUsecases[projectGroupId] || []
  },

  removeSelectedUsecase: (projectGroupId: string, usecase: string): void => {
    set((state) => {
      const currentSelected = state.selectedUsecases[projectGroupId] || []
      return {
        selectedUsecases: {
          ...state.selectedUsecases,
          [projectGroupId]: currentSelected.filter((uc) => uc !== usecase),
        },
      }
    })
  },

  // Selected usecases management
  selectedUsecases: {},

  setSelectedUsecases: (projectGroupId: string, usecases: string[]): void => {
    set((state) => ({
      selectedUsecases: {
        ...state.selectedUsecases,
        [projectGroupId]: usecases,
      },
    }))
  },
}))
