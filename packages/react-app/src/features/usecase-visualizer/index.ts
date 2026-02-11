// UsecaseVisualizer feature - public API
export {UsecaseVisualizer} from "./ui/usecase-visualizer"
export type {UsecaseVisualizerProps} from "./ui/usecase-visualizer"

// Export types for consumers
export type {
  GraphSpec,
  GraphView,
  RFContainerNodeData,
  RFEdge,
  RFModuleNodeData,
  RFNode,
  RFNodeData,
  RFSubgraphNodeData,
  RFSubsystemNodeData,
} from "./model/usecase-visualizer.types"

// Export selection store
export {useVisualizerSelectionStore} from "./model/use-visualizer-selection-store"

// Export adapter and layout functions
export {buildGraphViewFromUsecase} from "./lib/adapter"
export {layoutWithELK} from "./lib/elk-layout"
