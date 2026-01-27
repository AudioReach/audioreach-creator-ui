// UseCaseVisualizer - ReactFlow wrapper (view-only)
import {type FC, useCallback, useEffect, useMemo} from "react"

import {
  type ColorMode,
  Controls,
  type Edge,
  getViewportForBounds,
  type Node,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react"
import {toPng} from "html-to-image"

import "@xyflow/react/dist/style.css"

import type {RFEdge, RFNode} from "~features/usecase-visualizer/model/types"
import {useVisualizerSelectionStore} from "~features/usecase-visualizer/model/visualizer-selection-store"
import type {UserPreferences} from "~shared/config/user-preferences-types"
import {logger} from "~shared/lib/logger"
import {Theme, useTheme} from "~shared/providers/ThemeProvider"

import {ControlLinkEdge} from "./edge-types/ControlLinkEdge"
import {DataLinkEdge} from "./edge-types/DataLinkEdge"
import {ContainerNode} from "./node-types/ContainerNode"
import {ModuleNode} from "./node-types/ModuleNode"
import {SubgraphNode} from "./node-types/SubgraphNode"
import {SubsystemNode} from "./node-types/SubsystemNode"

const nodeTypes = {
  container: ContainerNode,
  module: ModuleNode,
  subgraph: SubgraphNode,
  subsystem: SubsystemNode,
}

const edgeTypes = {
  "control-link": ControlLinkEdge,
  "data-link": DataLinkEdge,
}

export interface UseCaseVisualizerProps {
  edges: RFEdge[]
  nodes: RFNode[]
  onScreenshotReady?: (screenshotFn: () => Promise<string | null>) => void
  projectId: string
  userPreferences: UserPreferences
}

// Inner component that has access to useReactFlow hook - must be child of ReactFlow
const ScreenshotHandler: FC<{
  onScreenshotReady?: (screenshotFn: () => Promise<string | null>) => void
}> = ({onScreenshotReady}) => {
  const {getNodes, getNodesBounds} = useReactFlow()
  const [theme] = useTheme()

  const captureScreenshot = useCallback(async (): Promise<string | null> => {
    try {
      const nodes = getNodes()
      if (nodes.length === 0) {
        console.warn("No nodes to capture")
        return null
      }

      // Wait a bit for rendering to complete
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Use the standard ReactFlow viewport selector (as per ReactFlow docs)
      const viewport = document.querySelector(
        ".react-flow__viewport",
      ) as HTMLElement

      if (!viewport) {
        console.error("ReactFlow viewport not found")
        return null
      }

      // Get the bounds of all nodes
      const nodesBounds = getNodesBounds(nodes)
      const imageWidth = nodesBounds.width + 100 // Add padding
      const imageHeight = nodesBounds.height + 100 // Add padding

      // Calculate viewport transformation to fit all nodes
      const viewportTransform = getViewportForBounds(
        nodesBounds,
        imageWidth,
        imageHeight,
        0.5,
        2,
        0.1,
      )

      // Use theme-aware background color for screenshot
      const backgroundColor = theme === Theme.DARK ? "#000000" : "#ffffff"

      // Capture the viewport with proper transformation (ReactFlow standard approach)
      const dataUrl = await toPng(viewport, {
        backgroundColor,
        cacheBust: true,
        filter: (node) => {
          if (node instanceof HTMLLinkElement && node.rel === "stylesheet") {
            return false
          }
          return true
        },
        height: imageHeight,
        pixelRatio: 2,
        skipFonts: true, // Skip font loading to avoid CORS issues with external fonts
        style: {
          height: `${imageHeight}px`,
          transform: `translate(${viewportTransform.x}px, ${viewportTransform.y}px) scale(${viewportTransform.zoom})`,
          width: `${imageWidth}px`,
        },
        width: imageWidth,
      })

      return dataUrl
    } catch (error) {
      console.error("Failed to capture ReactFlow screenshot:", error)
      return null
    }
  }, [getNodes, getNodesBounds, theme])

  // Notify parent when screenshot function is ready
  useEffect(() => {
    if (onScreenshotReady) {
      onScreenshotReady(captureScreenshot)
    }
  }, [onScreenshotReady, captureScreenshot])

  return null
}

const FlowContent: FC<UseCaseVisualizerProps> = ({
  edges,
  nodes,
  onScreenshotReady,
  projectId,
  userPreferences,
}) => {
  const [theme] = useTheme()
  const colorMode: ColorMode = theme === Theme.DARK ? "dark" : "light"

  // Get selection store actions and current selection
  const {clearSelection, setSelection} = useVisualizerSelectionStore()
  const selectionFromStore = useVisualizerSelectionStore(
    (state) => state.selections[projectId],
  )
  const currentSelection = useMemo(
    () => selectionFromStore || {selectedEdges: [], selectedNodes: []},
    [selectionFromStore],
  )

  // Handle node click for selection
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node): void => {
      if (event.ctrlKey) {
        // Multi-selection: toggle node in selection
        const isSelected = currentSelection.selectedNodes.some(
          (n) => n.id === node.id,
        )
        if (isSelected) {
          // Remove from selection
          const newNodes = currentSelection.selectedNodes.filter(
            (n) => n.id !== node.id,
          )
          setSelection(projectId, newNodes, currentSelection.selectedEdges)
        } else {
          // Add to selection
          const newNodes = [...currentSelection.selectedNodes, node as RFNode]
          setSelection(projectId, newNodes, currentSelection.selectedEdges)
        }
      } else {
        // Single selection: only update if not already the only selected node
        const isSameSelection =
          currentSelection.selectedNodes.length === 1 &&
          currentSelection.selectedNodes[0].id === node.id &&
          currentSelection.selectedEdges.length === 0

        if (!isSameSelection) {
          setSelection(projectId, [node as RFNode], [])
        }
      }
    },
    [currentSelection, projectId, setSelection],
  )

  // Handle edge click for selection
  const handleEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge): void => {
      if (event.ctrlKey) {
        // Multi-selection: toggle edge in selection
        const isSelected = currentSelection.selectedEdges.some(
          (e) => e.id === edge.id,
        )
        if (isSelected) {
          // Remove from selection
          const newEdges = currentSelection.selectedEdges.filter(
            (e) => e.id !== edge.id,
          )
          setSelection(projectId, currentSelection.selectedNodes, newEdges)
        } else {
          // Add to selection
          const newEdges = [...currentSelection.selectedEdges, edge as RFEdge]
          setSelection(projectId, currentSelection.selectedNodes, newEdges)
        }
      } else {
        // Single selection: only update if not already the only selected edge
        const isSameSelection =
          currentSelection.selectedEdges.length === 1 &&
          currentSelection.selectedEdges[0].id === edge.id &&
          currentSelection.selectedNodes.length === 0

        if (!isSameSelection) {
          setSelection(projectId, [], [edge as RFEdge])
        }
      }
    },
    [currentSelection, projectId, setSelection],
  )

  // Handle pane click to clear selection
  const handlePaneClick = useCallback((): void => {
    // Only clear if there's actually something selected
    if (
      currentSelection.selectedNodes.length > 0 ||
      currentSelection.selectedEdges.length > 0
    ) {
      clearSelection(projectId)
    }
  }, [clearSelection, currentSelection, projectId])

  // Handle ESC key to clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        // Only clear if there's actually something selected
        const selection =
          useVisualizerSelectionStore.getState().selections[projectId]
        if (
          selection &&
          (selection.selectedNodes.length > 0 ||
            selection.selectedEdges.length > 0)
        ) {
          clearSelection(projectId)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [clearSelection, projectId])

  // Clear selection when nodes/edges change (e.g., usecase change)
  // Note: Only clear when the node/edge arrays actually change (new usecase loaded)
  useEffect(() => {
    logger.verbose(
      `Nodes/edges changed, clearing selection (nodes: ${nodes.length}, edges: ${edges.length}, project: ${projectId})`,
    )
    clearSelection(projectId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, edges.length, projectId])

  // Filter edges based on user preferences and mark selected ones
  const filteredEdges = edges
    .filter((edge) => {
      // Filter control links if preference is disabled
      if (
        edge.type === "control-link" &&
        !userPreferences.visualization.showControlLinks
      ) {
        return false
      }
      // Add more edge filtering logic as needed
      return true
    })
    .map((edge) => ({
      ...edge,
      selected: currentSelection.selectedEdges.some((e) => e.id === edge.id),
    }))

  // Mark selected nodes
  const nodesWithSelection = nodes.map((node) => ({
    ...node,
    selected: currentSelection.selectedNodes.some((n) => n.id === node.id),
  }))

  logger.verbose(
    `Rendering visualizer (selected nodes: ${nodesWithSelection.filter((n) => n.selected).length}/${nodesWithSelection.length}, selected edges: ${filteredEdges.filter((e) => e.selected).length}/${filteredEdges.length})`,
  )

  return (
    <div className="h-full w-full">
      <ReactFlow
        colorMode={colorMode}
        edgeTypes={edgeTypes}
        edges={filteredEdges}
        elementsSelectable
        elevateEdgesOnSelect
        elevateNodesOnSelect
        fitView
        maxZoom={1.5}
        minZoom={0.1}
        nodeOrigin={[0, 0]}
        nodeTypes={nodeTypes}
        nodes={nodesWithSelection}
        nodesConnectable={false}
        onEdgeClick={handleEdgeClick}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        proOptions={{hideAttribution: true}}
        selectNodesOnDrag={false}
      >
        <Controls />
        <ScreenshotHandler onScreenshotReady={onScreenshotReady} />
      </ReactFlow>
    </div>
  )
}

export const UseCaseVisualizer: FC<UseCaseVisualizerProps> = ({
  edges,
  nodes,
  onScreenshotReady,
  projectId,
  userPreferences,
}) => {
  return (
    <ReactFlowProvider>
      <FlowContent
        edges={edges}
        nodes={nodes}
        onScreenshotReady={onScreenshotReady}
        projectId={projectId}
        userPreferences={userPreferences}
      />
    </ReactFlowProvider>
  )
}
