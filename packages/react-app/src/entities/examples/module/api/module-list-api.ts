// API service for module list operations
import type {ModuleIdentity} from "../model"

import {mockBackend} from "./mock-backend"

export class ModuleListApi {
  async fetchModules(): Promise<ModuleIdentity[]> {
    return mockBackend.fetchModuleList()
  }
}

// Export singleton instance
export const moduleListApi = new ModuleListApi()
