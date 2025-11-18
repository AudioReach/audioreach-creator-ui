// UseCaseVisualizer feature - public API
export {UseCaseVisualizer} from "./ui/UseCaseVisualizer"
export type {UseCaseVisualizerProps} from "./ui/UseCaseVisualizer"

// Export types for consumers
export type {
  GraphSpec,
  GraphView,
  RFNode,
  RFEdge,
  RFNodeData,
  RFModuleNodeData,
  RFContainerNodeData,
  RFSubgraphNodeData,
  RFSubsystemNodeData,
} from "./model/types"

export type {
  UsecaseComponentsDto,
  ModuleInstanceDto,
  DataLinkDto,
  ControlLinkDto,
  SubsystemDto,
} from "./model/api-types"

// Export adapter and layout functions
export {buildGraphViewFromUsecase} from "./lib/adapter"
export {layoutWithELK} from "./lib/elk-layout"
