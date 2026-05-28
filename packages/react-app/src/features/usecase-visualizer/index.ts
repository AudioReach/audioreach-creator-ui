// UsecaseVisualizer feature - public API
export {UsecaseVisualizer} from './ui/usecase-visualizer';
export type {UsecaseVisualizerProps} from './ui/usecase-visualizer';
export {UsecaseVisualizerLegacy} from './ui/legacy/usecase-visualizer';
export type {UsecaseVisualizerLegacyProps} from './ui/legacy/usecase-visualizer';

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
} from './model/usecase-visualizer.types';

// Export selection store
export {useVisualizerSelectionStore} from './model/use-visualizer-selection-store';

// Export search highlight store
export {useSearchHighlightStore} from './model/use-search-highlight-store';
export type {SearchHighlight} from './model/use-search-highlight-store';

// Export adapter and layout functions
export {buildGraphViewFromUsecase} from './lib/adapter';
export {layoutWithELK} from './lib/elk-layout';

// ── Revamp: new LevelView-based public API (legacy exports above removed at cutover) ──
export {
  EDGE_KIND,
  MODULE_SHAPE,
  NODE_KIND,
  PORT_IO_TYPE,
  PORT_STATUS,
  VISUALIZER_MODE,
} from './model/visualizer.types';
export {calculateModuleHeight, NODE_DIMENSIONS} from './lib/node-dimensions';
export type {
  // Discriminant types
  EdgeKind,
  ModuleShape,
  NodeKind,
  PortIoType,
  PortStatus,
  VisualizerMode,
  // Port type
  Port,
  // Node types
  AnyNode,
  ContainerNode,
  ModuleNode,
  NodeBase,
  SubgraphNode,
  SubgraphProxyNode,
  SubsystemNode,
  // Edge types
  AnyEdge,
  ControlLink,
  DataLink,
  ProxyControlLink,
  ProxyDataLink,
  // Graph model
  LevelView,
  // Context menu
  ContextMenuItem,
  ContextMenuTarget,
  // Event payloads
  EdgeConnectPayload,
  NodeDragEndPayload,
  NodeDropPayload,
  SelectionChangePayload,
  // Viewport / search
  SearchHighlights,
  ViewportState,
  XY,
  // Rendering config
  CoreOverride,
  NodeContentOverride,
  NodeDisplayConfig,
  VisualizerContextMenuConfig,
  VisualizerEventHandlers,
  VisualizerRenderingConfig,
  // Component props (aliased — canonical name takes over at cutover)
  UsecaseVisualizerProps as UsecaseVisualizerPropsV2,
} from './model/visualizer.types';
