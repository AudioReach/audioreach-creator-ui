// Module properties store - handles detailed module properties
import {create} from "zustand"

import {modulePropertiesApi} from "~entities/examples/module/api"
import type {ModuleProperties} from "~entities/examples/module/model"
import {useModuleListStore} from "~features/examples/module-list"

interface ModulePropertiesState {
  errors: Record<string, string | null>
  // Getters
  getProperties: (moduleId: string) => ModuleProperties | null
  isLoading: (moduleId: string) => boolean
  // Actions
  loadingStates: Record<string, boolean>
  loadProperties: (moduleId: string) => Promise<void>
  properties: Record<string, ModuleProperties | null>
  updateDescription: (moduleId: string, description: string) => Promise<void>
  updateDisplayName: (moduleId: string, displayName: string) => Promise<void>
}

export const useModulePropertiesStore = create<ModulePropertiesState>(
  (set, get) => ({
    errors: {},
    // Getters
    getProperties: (moduleId) => {
      return get().properties[moduleId] || null
    },
    isLoading: (moduleId) => {
      return get().loadingStates[moduleId] || false
    },
    // Actions
    loadingStates: {},
    loadProperties: async (moduleId) => {
      set((state) => ({
        errors: {...state.errors, [moduleId]: null},
        loadingStates: {...state.loadingStates, [moduleId]: true},
      }))

      try {
        const properties = await modulePropertiesApi.fetchProperties(moduleId)
        set((state) => ({
          loadingStates: {...state.loadingStates, [moduleId]: false},
          properties: {...state.properties, [moduleId]: properties},
        }))
      } catch (error) {
        set((state) => ({
          errors: {
            ...state.errors,
            [moduleId]:
              error instanceof Error
                ? error.message
                : "Failed to load properties",
          },
          loadingStates: {...state.loadingStates, [moduleId]: false},
        }))
      }
    },
    properties: {},
    updateDescription: async (moduleId, description) => {
      try {
        // Optimistic update
        set((state) => ({
          properties: {
            ...state.properties,
            [moduleId]: state.properties[moduleId]
              ? {...state.properties[moduleId], description}
              : null,
          },
        }))

        // Call API
        const updatedProperties = await modulePropertiesApi.updateDescription(
          moduleId,
          description,
        )

        // Update with server response
        set((state) => ({
          properties: {...state.properties, [moduleId]: updatedProperties},
        }))
      } catch (error) {
        // Revert optimistic update on error
        const originalProperties = get().properties[moduleId]
        if (originalProperties) {
          set((state) => ({
            properties: {
              ...state.properties,
              [moduleId]: originalProperties,
            },
          }))
        }
        throw error
      }
    },
    updateDisplayName: async (moduleId, displayName) => {
      try {
        // Optimistic update in properties store
        set((state) => ({
          properties: {
            ...state.properties,
            [moduleId]: state.properties[moduleId]
              ? {...state.properties[moduleId], displayName}
              : null,
          },
        }))

        // Call API
        const updatedIdentity = await modulePropertiesApi.updateDisplayName(
          moduleId,
          displayName,
        )

        // Update the list store too (cross-store communication)
        useModuleListStore
          .getState()
          .updateModuleIdentity(moduleId, updatedIdentity)
      } catch (error) {
        // Revert optimistic update on error
        const originalProperties = get().properties[moduleId]
        if (originalProperties) {
          set((state) => ({
            properties: {
              ...state.properties,
              [moduleId]: originalProperties,
            },
          }))
        }
        throw error
      }
    },
  }),
)
