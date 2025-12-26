// UseCaseVisualizer - ReactFlow wrapper (view-only)
import {type FC, useCallback, useEffect} from "react"

import {
  Background,
  Controls,
  getViewportForBounds,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react"
import {toPng} from "html-to-image"

import "@xyflow/react/dist/style.css"

import type {RFEdge, RFNode} from "~features/usecase-visualizer/model/types"

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
}

// Inner component that has access to useReactFlow hook - must be child of ReactFlow
const ScreenshotHandler: FC<{
  onScreenshotReady?: (screenshotFn: () => Promise<string | null>) => void
}> = ({onScreenshotReady}) => {
  const {getNodes, getNodesBounds} = useReactFlow()

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

      // Capture the viewport with proper transformation (ReactFlow standard approach)
      const dataUrl = await toPng(viewport, {
        backgroundColor: "#ffffff",
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
  }, [getNodes, getNodesBounds])

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
}) => {
  return (
    <div className="h-full w-full bg-white">
      <ReactFlow
        edgeTypes={edgeTypes}
        edges={edges}
        elementsSelectable={false}
        fitView
        maxZoom={1.5}
        minZoom={0.1}
        nodeOrigin={[0, 0]}
        nodeTypes={nodeTypes}
        nodes={nodes}
        nodesConnectable={false}
        proOptions={{hideAttribution: true}}
      >
        <Background />
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
}) => {
  return (
    <ReactFlowProvider>
      <FlowContent
        edges={edges}
        nodes={nodes}
        onScreenshotReady={onScreenshotReady}
      />
    </ReactFlowProvider>
  )
}
