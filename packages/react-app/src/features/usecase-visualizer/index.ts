// UseCaseVisualizer feature - public API
export {UseCaseVisualizer} from "./ui/UseCaseVisualizer"
export type {UseCaseVisualizerProps} from "./ui/UseCaseVisualizer"

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
} from "./model/types"

// Export selection store
export {useVisualizerSelectionStore} from "./model/visualizer-selection-store"

// Export adapter and layout functions
export {buildGraphViewFromUsecase} from "./lib/adapter"
export {layoutWithELK} from "./lib/elk-layout"
