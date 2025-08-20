import {create} from "zustand"

import type {Connection} from "~entities/examples/connection"
import type {ModuleInstance} from "~entities/examples/graph"
import type {Module} from "~entities/examples/module"
import {mockBackend} from "~entities/examples/module/api/mock-backend"

interface GraphState {
  // Actions
  addConnection: (connection: Connection) => void
  addModuleInstance: (moduleInstance: ModuleInstance, module: Module) => void
  autoArrangeNodes: () => void
  connections: Connection[]
  error: string | null
  isLoading: boolean

  loadSampleData: () => Promise<void>
  moduleInstances: ModuleInstance[]
  modules: Record<string, Module> // Cache of module definitions by ID
  removeConnection: (connectionId: string) => void
  removeModuleInstance: (instanceId: string) => void
  selectedInstanceId: string | null
  selectInstance: (instanceId: string | null) => void
  updateInstancePosition: (
    instanceId: string,
    position: {x: number; y: number},
  ) => void
}

export const useGraphStore = create<GraphState>((set, get) => ({
  addConnection: (connection) => {
    set((state) => ({
      connections: [...state.connections, connection],
    }))
  },
  addModuleInstance: (moduleInstance, module) => {
    set((state) => ({
      moduleInstances: [...state.moduleInstances, moduleInstance],
      modules: {...state.modules, [module.id]: module},
    }))
  },
  autoArrangeNodes: () => {
    const {connections, moduleInstances} = get()

    // Simple auto-layout algorithm: arrange nodes in layers based on connections
    const positions: Record<string, {x: number; y: number}> = {}
    const layers: string[][] = []
    const visited = new Set<string>()

    // Find root nodes (no incoming connections)
    const hasIncoming = new Set(connections.map((c) => c.targetInstanceId))
    const rootNodes = moduleInstances.filter(
      (m) => !hasIncoming.has(m.instanceId),
    )

    // Build layers using BFS
    let currentLayer = rootNodes.map((m) => m.instanceId)

    while (currentLayer.length > 0) {
      layers.push([...currentLayer])
      const nextLayer: string[] = []

      for (const instanceId of currentLayer) {
        visited.add(instanceId)
        // Find all nodes connected from this node
        const outgoingConnections = connections.filter(
          (c) => c.sourceInstanceId === instanceId,
        )
        for (const conn of outgoingConnections) {
          if (
            !visited.has(conn.targetInstanceId) &&
            !nextLayer.includes(conn.targetInstanceId)
          ) {
            nextLayer.push(conn.targetInstanceId)
          }
        }
      }

      currentLayer = nextLayer
    }

    // Add any remaining unconnected nodes
    const allLayerNodes = new Set(layers.flat())
    const unconnectedNodes = moduleInstances.filter(
      (m) => !allLayerNodes.has(m.instanceId),
    )
    if (unconnectedNodes.length > 0) {
      layers.push(unconnectedNodes.map((m) => m.instanceId))
    }

    // Calculate positions
    const layerWidth = 300
    const nodeHeight = 100
    const layerSpacing = 50

    layers.forEach((layer, layerIndex) => {
      const layerY = layerIndex * (nodeHeight + layerSpacing)
      layer.forEach((instanceId, nodeIndex) => {
        positions[instanceId] = {
          x: layerIndex * layerWidth,
          y: layerY + nodeIndex * (nodeHeight + 20),
        }
      })
    })

    // Update positions in module instances
    set((state) => ({
      moduleInstances: state.moduleInstances.map((instance) => ({
        ...instance,
        position: positions[instance.instanceId] || instance.position,
      })),
    }))
  },
  connections: [],
  error: null,
  isLoading: false,

  loadSampleData: async () => {
    set({error: null, isLoading: true})

    try {
      // Fetch available modules from mock backend
      const availableModules = (await mockBackend.fetchModuleList())
                                .map((module) => (module.id))

      // If no modules available, handle gracefully
      if (availableModules.length === 0) {
        set({
          connections: [],
          error: "No modules available to create sample graph",
          isLoading: false,
          moduleInstances: [],
          modules: {},
        })
        return
      }

      const modules: Record<string, Module> = {}
      const moduleInstances: ModuleInstance[] = []

      // Fetch all module data in parallel for better performance
      const moduleDataPromises = availableModules.map(
        async (moduleId: string, index: number) => {
          try {
            // Parallel API calls for each module
            const [moduleProps, modulePorts] = await Promise.all([
              mockBackend.fetchModuleProperties(moduleId),
              mockBackend.fetchModulePorts(moduleId),
            ])

            return {
              index,
              moduleId,
              modulePorts,
              moduleProps,
            }
          } catch (error) {
            console.warn(`Failed to load module ${moduleId}:`, error)
            return null
          }
        },
      )

      // Wait for all modules to load in parallel
      const moduleDataResults = await Promise.all(moduleDataPromises)

      // Process successful results
      for (const result of moduleDataResults) {
        if (!result) {
          continue
        }

        const {index, moduleId, modulePorts, moduleProps} = result

        // Combine properties and ports into full module object
        modules[moduleId] = {
          description: moduleProps.description,
          displayName: moduleProps.displayName,
          id: moduleProps.moduleId,
          inputPorts: modulePorts.inputPorts,
          isBuiltin: moduleProps.isBuiltin,
          name: moduleProps.name,
          outputPorts: modulePorts.outputPorts,
          parameters: [], // Will be fetched separately if needed
        }

        // Create module instance
        moduleInstances.push({
          instanceId: `${moduleProps.name}_instance_1`,
          metadata: {},
          moduleDefinitionId: moduleId,
          position: {x: index * 300, y: 100},
        })
      }

      // Create connections between consecutive modules (linear chain)
      const connections: Connection[] = []
      for (let i = 0; i < moduleInstances.length - 1; i++) {
        const sourceInstance = moduleInstances[i]
        const targetInstance = moduleInstances[i + 1]
        const sourceModule = modules[sourceInstance.moduleDefinitionId]
        const targetModule = modules[targetInstance.moduleDefinitionId]

        // Use first available output -> input connection
        if (sourceModule?.outputPorts?.[0] && targetModule?.inputPorts?.[0]) {
          connections.push({
            id: `conn_${i}`,
            sourceInstanceId: sourceInstance.instanceId,
            sourcePortId: sourceModule.outputPorts[0].id,
            targetInstanceId: targetInstance.instanceId,
            targetPortId: targetModule.inputPorts[0].id,
          })
        }
      }

      set({
        connections,
        isLoading: false,
        moduleInstances,
        modules,
      })

      console.log(
        `Sample graph created with ${moduleInstances.length} modules and ${connections.length} connections`,
      )
    } catch (error) {
      set({
        error: `Failed to load sample data: ${error instanceof Error ? error.message : "Unknown error"}`,
        isLoading: false,
      })
    }
  },

  moduleInstances: [],

  modules: {},

  removeConnection: (connectionId) => {
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== connectionId),
    }))
  },

  removeModuleInstance: (instanceId) => {
    set((state) => ({
      connections: state.connections.filter(
        (c) =>
          c.sourceInstanceId !== instanceId &&
          c.targetInstanceId !== instanceId,
      ),
      moduleInstances: state.moduleInstances.filter(
        (m) => m.instanceId !== instanceId,
      ),
    }))
  },

  selectedInstanceId: null,

  selectInstance: (instanceId) => {
    set({selectedInstanceId: instanceId})
  },

  updateInstancePosition: (instanceId, position) => {
    set((state) => ({
      moduleInstances: state.moduleInstances.map((instance) =>
        instance.instanceId === instanceId ? {...instance, position} : instance,
      ),
    }))
  },
}))
