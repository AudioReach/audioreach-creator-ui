// API service for module properties operations
import type {ModuleIdentity, ModuleProperties} from "../model"

import {mockBackend} from "./mock-backend"

export class ModulePropertiesApi {
  async fetchProperties(moduleId: string): Promise<ModuleProperties> {
    return mockBackend.fetchModuleProperties(moduleId)
  }

  async updateDescription(
    moduleId: string,
    description: string,
  ): Promise<ModuleProperties> {
    return mockBackend.updateModuleDescription(moduleId, description)
  }

  async updateDisplayName(
    moduleId: string,
    displayName: string,
  ): Promise<ModuleIdentity> {
    return mockBackend.updateModuleDisplayName(moduleId, displayName)
  }
}

// Export singleton instance
export const modulePropertiesApi = new ModulePropertiesApi()
