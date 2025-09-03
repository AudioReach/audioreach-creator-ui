// Mock backend that simulates separate API endpoints
import {parseModuleXml} from "../lib/xml-parser"
import type {
  Module,
  ModuleIdentity,
  ModuleParameters,
  ModulePorts,
  ModuleProperties,
} from "../model"

class MockBackend {
  // Variables/fields grouped together (alphabetically sorted)
  private initializationPromise: Promise<void> | null = null
  private isInitialized = false
  private xmlData: Module[] = []

  // Methods/functions grouped together (alphabetically sorted)
  // Simulate: GET /api/modules - Returns only id + displayName
  async fetchModuleList(): Promise<ModuleIdentity[]> {
    await this.initialize()

    // Simulate network delay (reduced for development)
    await new Promise((resolve) => setTimeout(resolve, 50))

    return this.xmlData.map((module) => ({
      displayName: module.displayName,
      id: module.id,
      type: module.isBuiltin ? "builtin" : "custom",
    }))
  }

  // Simulate: GET /api/modules/:id/parameters - Returns module parameters
  async fetchModuleParameters(moduleId: string): Promise<ModuleParameters> {
    await this.initialize()

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 600))

    const module = this.xmlData.find((m) => m.id === moduleId)
    if (!module) {
      throw new Error(`Module with id ${moduleId} not found`)
    }

    return {
      moduleId: module.id,
      parameters: module.parameters,
    }
  }

  // Simulate: GET /api/modules/:id/ports - Returns module ports
  async fetchModulePorts(moduleId: string): Promise<ModulePorts> {
    await this.initialize()

    // Simulate network delay (reduced for development)
    await new Promise((resolve) => setTimeout(resolve, 80))

    const module = this.xmlData.find((m) => m.id === moduleId)
    if (!module) {
      throw new Error(`Module with id ${moduleId} not found`)
    }

    return {
      inputPorts: module.inputPorts,
      moduleId: module.id,
      outputPorts: module.outputPorts,
    }
  }

  // Simulate: GET /api/modules/:id/properties - Returns module properties
  async fetchModuleProperties(moduleId: string): Promise<ModuleProperties> {
    await this.initialize()

    // Simulate network delay (reduced for development)
    await new Promise((resolve) => setTimeout(resolve, 100))

    const module = this.xmlData.find((m) => m.id === moduleId)
    if (!module) {
      throw new Error(`Module with id ${moduleId} not found`)
    }

    return {
      description: module.description,
      displayName: module.displayName,
      isBuiltin: module.isBuiltin,
      moduleId: module.id,
      name: module.name,
    }
  }

  // Check if modules have been loaded successfully
  hasLoadedModules(): boolean {
    return this.isInitialized && this.xmlData.length > 0
  }

  private async initialize(): Promise<void> {
    // If already initialized, return immediately
    if (this.isInitialized) {
      return
    }

    // If initialization is in progress, wait for it to complete
    if (this.initializationPromise) {
      return this.initializationPromise
    }

    // Start initialization
    this.initializationPromise = this.performInitialization()
    return this.initializationPromise
  }

  // Initialize from XML contents loaded from directory
  initializeFromXmlContents(
    xmlContents: {content: string; filename: string}[],
  ): void {
    try {
      console.log(`Initializing backend with ${xmlContents.length} XML files`)

      // Process each XML file
      const moduleArrays = xmlContents.map(({content, filename}) => {
        console.log(`Processing ${filename}`)
        return parseModuleXml(content)
      })

      // Flatten the array of arrays into a single array of modules
      this.xmlData = moduleArrays.flat()
      this.isInitialized = true
      this.initializationPromise = null

      console.log(`Backend initialized with ${this.xmlData.length} modules`)
    } catch (error) {
      console.error("Error initializing backend from XML contents:", error)
      this.xmlData = []
      this.isInitialized = false
      this.initializationPromise = null
      throw error
    }
  }

  private async performInitialization(): Promise<void> {
    console.log("Mock backend ready - waiting for XML directory selection")
    this.isInitialized = true
  }

  // Simulate: PUT /api/modules/:id/description - Updates description
  async updateModuleDescription(
    moduleId: string,
    description: string,
  ): Promise<ModuleProperties> {
    await this.initialize()

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 200))

    const moduleIndex = this.xmlData.findIndex((m) => m.id === moduleId)
    if (moduleIndex === -1) {
      throw new Error(`Module with id ${moduleId} not found`)
    }

    // Update the data
    this.xmlData[moduleIndex].description = description

    const module = this.xmlData[moduleIndex]
    return {
      description: module.description,
      displayName: module.displayName,
      isBuiltin: module.isBuiltin,
      moduleId: module.id,
      name: module.name,
    }
  }

  // Simulate: PUT /api/modules/:id/displayName - Updates display name
  async updateModuleDisplayName(
    moduleId: string,
    displayName: string,
  ): Promise<ModuleIdentity> {
    await this.initialize()

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 200))

    const moduleIndex = this.xmlData.findIndex((m) => m.id === moduleId)
    if (moduleIndex === -1) {
      throw new Error(`Module with id ${moduleId} not found`)
    }

    // Update the data
    this.xmlData[moduleIndex].displayName = displayName

    return {
      displayName,
      id: moduleId,
      type: this.xmlData[moduleIndex].isBuiltin ? "builtin" : "custom",
    }
  }

  // Simulate: PUT /api/modules/:id/ports - Updates port configuration
  async updateModulePorts(
    moduleId: string,
    ports: Partial<ModulePorts>,
  ): Promise<ModulePorts> {
    await this.initialize()

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300))

    const moduleIndex = this.xmlData.findIndex((m) => m.id === moduleId)
    if (moduleIndex === -1) {
      throw new Error(`Module with id ${moduleId} not found`)
    }

    // Update the data
    if (ports.inputPorts) {
      this.xmlData[moduleIndex].inputPorts = ports.inputPorts
    }
    if (ports.outputPorts) {
      this.xmlData[moduleIndex].outputPorts = ports.outputPorts
    }

    const module = this.xmlData[moduleIndex]
    return {
      inputPorts: module.inputPorts,
      moduleId: module.id,
      outputPorts: module.outputPorts,
    }
  }
}

// Export singleton instance
export const mockBackend = new MockBackend()
