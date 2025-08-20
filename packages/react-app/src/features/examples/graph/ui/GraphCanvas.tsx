import {type ReactNode, useCallback, useEffect, useMemo} from "react"

import {
  Background,
  Controls,
  type Edge,
  type Node,
  type OnConnect,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import {AlertCircle, Loader} from "lucide-react"

import {QProgressCircle, QStatus} from "@qui/react"

import {useSelectedModuleStore} from "~entities/examples/module"

import {connectionToEdge, edgeToConnection, moduleInstanceToNode} from "../lib"
import {useGraphStore} from "../model"

import {ModuleNode} from "./ModuleNode"

const nodeTypes = {
  moduleNode: ModuleNode,
}

export function GraphCanvas(): ReactNode {
  const {
    addConnection,
    connections,
    error,
    isLoading,
    loadSampleData,
    moduleInstances,
    modules,
    removeConnection,
    selectInstance,
    updateInstancePosition,
  } = useGraphStore()

  const {selectModule} = useSelectedModuleStore()

  // Convert graph data to ReactFlow format with memoization
  const nodes = useMemo(() => {
    return moduleInstances
      .map((instance) => {
        const module = modules[instance.moduleDefinitionId]
        return module ? moduleInstanceToNode(instance, module) : null
      })
      .filter(Boolean) as Node[]
  }, [moduleInstances, modules])

  const edges = useMemo(() => {
    return connections.map(connectionToEdge)
  }, [connections])

  const [reactFlowNodes, setNodes, onNodesChange] = useNodesState(nodes)
  const [reactFlowEdges, setEdges, onEdgesChange] = useEdgesState(edges)

  // Update ReactFlow nodes when our computed nodes change
  useEffect(() => {
    setNodes(nodes)
  }, [nodes, setNodes])

  // Update ReactFlow edges when our computed edges change
  useEffect(() => {
    setEdges(edges)
  }, [edges, setEdges])

  // Handle new connections
  const onConnect: OnConnect = useCallback(
    (params) => {
      const newConnection = edgeToConnection({
        id: `${params.source}-${params.sourceHandle}-${params.target}-${params.targetHandle}`,
        source: params.source,
        sourceHandle: params.sourceHandle,
        target: params.target,
        targetHandle: params.targetHandle,
      })
      addConnection(newConnection)
    },
    [addConnection],
  )

  // Handle edge deletion
  const onEdgesDelete = useCallback(
    (edgesToDelete: Edge[]) => {
      edgesToDelete.forEach((edge) => {
        removeConnection(edge.id)
      })
    },
    [removeConnection],
  )

  // Handle node selection - THIS IS THE KEY FIX
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Select the instance in our graph store
      selectInstance(node.id)

      // Get the module definition ID from the node data
      const nodeData = node.data as {
        moduleInstance: {moduleDefinitionId: string}
      }
      const moduleDefinitionId = nodeData.moduleInstance.moduleDefinitionId

      // Pass the module definition ID to the existing module selection system
      selectModule(moduleDefinitionId)
    },
    [selectInstance, selectModule],
  )

  // Handle node position changes
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      updateInstancePosition(node.id, node.position)
    },
    [updateInstancePosition],
  )

  // Load sample data on mount
  useEffect(() => {
    if (moduleInstances.length === 0 && !isLoading) {
      void loadSampleData()
    }
  }, [loadSampleData, moduleInstances.length, isLoading])

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <QProgressCircle size="l" />
          <QStatus
            color="informative"
            icon={Loader}
            kind="badge"
            label="Loading graph canvas..."
            size="m"
          />
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <QStatus
            color="red"
            icon={AlertCircle}
            kind="badge"
            label={`Failed to load graph: ${error}`}
            size="m"
          />
          <button
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            onClick={() => void loadSampleData()}
            type="button"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        edges={reactFlowEdges}
        fitView
        nodeTypes={nodeTypes}
        nodes={reactFlowNodes}
        onConnect={onConnect}
        onEdgesChange={onEdgesChange}
        onEdgesDelete={onEdgesDelete}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onNodesChange={onNodesChange}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}
