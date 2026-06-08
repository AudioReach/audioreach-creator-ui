/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  type ComponentType,
  type DragEvent,
  type ReactNode,
  useState,
} from 'react';

interface FakeNode {
  data: Record<string, unknown>;
  id: string;
  type: string;
}

interface FakeEdge {
  data?: Record<string, unknown>;
  id: string;
  label?: ReactNode;
  source: string;
  target: string;
  type: string;
}

export interface FakeReactFlowProps {
  edges: FakeEdge[];
  edgeTypes: Record<string, ComponentType<Record<string, unknown>>>;
  multiSelectionKeyCode?: string;
  nodes: FakeNode[];
  nodesConnectable?: boolean;
  nodeTypes: Record<string, ComponentType<Record<string, unknown>>>;
  onConnect?: (connection: {
    source: string;
    sourceHandle: string | null;
    target: string;
    targetHandle: string | null;
  }) => void;
  onDragOver?: (event: DragEvent) => void;
  onDrop?: (event: DragEvent) => void;
  onEdgeContextMenu?: (event: unknown, edge: FakeEdge) => void;
  onMove?: (
    event: MouseEvent | TouchEvent | null,
    viewport: {x: number; y: number; zoom: number},
  ) => void;
  onMoveEnd?: (event: unknown, viewport: unknown) => void;
  onNodeContextMenu?: (event: unknown, node: FakeNode) => void;
  onNodeDoubleClick?: (event: unknown, node: FakeNode) => void;
  onNodeDragStop?: (event: unknown, node: FakeNode) => void;
  onPaneContextMenu?: (event: unknown) => void;
  onSelectionChange?: (params: {edges: FakeEdge[]; nodes: FakeNode[]}) => void;
  panActivationKeyCode?: string;
  selectionOnDrag?: boolean;
  selectNodesOnDrag?: boolean;
}

/**
 * Module-level ref so the jest.mock factory instance and tests share the same
 * pointer to the most recently rendered FakeReactFlow props.
 */
export const latestReactFlowProps: {current: FakeReactFlowProps | null} = {
  current: null,
};

/**
 * Factory used by `jest.mock('@xyflow/react', () =>
 * require(...).createXyflowMockFactory())`. Kept in a separate module so tests
 * can share the stub without duplicating ~100 lines of factory body.
 *
 * Tests can read `latestReactFlowProps.current` after render to invoke captured
 * callbacks (onMoveEnd, onNodeDoubleClick, etc.) directly.
 */
export function createXyflowMockFactory() {
  const FakeReactFlow = (props: FakeReactFlowProps) => {
    latestReactFlowProps.current = props;
    const {edges, edgeTypes, nodes, nodeTypes, onDragOver, onDrop} = props;
    return (
      <div
        data-testid="fake-react-flow"
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <div data-testid="fake-nodes-host">
          {nodes.map((n) => {
            const Component = nodeTypes[n.type];
            if (!Component) {
              return null;
            }
            return (
              <div key={n.id} data-node-host={n.id}>
                <Component
                  data={n.data}
                  deletable
                  draggable
                  dragging={false}
                  id={n.id}
                  isConnectable={false}
                  positionAbsoluteX={0}
                  positionAbsoluteY={0}
                  selectable
                  selected={false}
                  type={n.type}
                  zIndex={0}
                />
              </div>
            );
          })}
        </div>
        <svg data-testid="fake-edges-host">
          {edges.map((e) => {
            const Component = edgeTypes[e.type];
            if (!Component) {
              return null;
            }
            return (
              <g key={e.id} data-edge-id={e.id} data-edge-type={e.type}>
                <Component
                  data={e.data}
                  deletable
                  id={e.id}
                  interactionWidth={20}
                  label={e.label}
                  selectable
                  selected={false}
                  source={e.source}
                  sourcePosition="right"
                  sourceX={0}
                  sourceY={0}
                  target={e.target}
                  targetPosition="left"
                  targetX={120}
                  targetY={120}
                />
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  const ReactFlowProvider = ({children}: {children: ReactNode}) => (
    <>{children}</>
  );
  const EdgeLabelRenderer = ({children}: {children: ReactNode}) => (
    <>{children}</>
  );
  const BaseEdge = (props: Record<string, unknown>) => (
    <path
      className="react-flow__edge-path"
      d={props.path as string}
      markerEnd={props.markerEnd as string | undefined}
      style={props.style as Record<string, string> | undefined}
    />
  );
  const Handle = (props: Record<string, unknown>) => (
    <div
      className={props.className as string | undefined}
      data-handleid={props.id as string | undefined}
      data-handlepos={props.position as string | undefined}
      data-port-id={props['data-port-id'] as string | undefined}
      style={props.style as Record<string, string> | undefined}
    />
  );

  const nodesChangeStub = jest.fn();
  const edgesChangeStub = jest.fn();
  const fitViewStub = jest.fn();
  const getNodesStub = jest.fn(() => []);
  const getViewportStub = jest.fn(() => ({x: 0, y: 0, zoom: 1}));
  const setCenterStub = jest.fn();
  const setViewportStub = jest.fn();

  const screenToFlowPositionStub = jest.fn(
    (pos: {x: number; y: number}) => pos,
  );

  // Stable object — same reference on every render so effects that close over
  // rfInstance (e.g. the screenshot effect) don't re-fire on re-renders.
  const stableReactFlowInstance = {
    fitView: fitViewStub,
    getNodes: getNodesStub,
    getViewport: getViewportStub,
    screenToFlowPosition: screenToFlowPositionStub,
    setCenter: setCenterStub,
    setViewport: setViewportStub,
  };

  return {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath: () => ['M 0 0 L 100 100', 50, 50, 50, 50],
    Handle,
    Position: {Bottom: 'bottom', Left: 'left', Right: 'right', Top: 'top'},
    ReactFlow: FakeReactFlow,
    ReactFlowProvider,
    setCenterStub,
    useEdgesState: (initial: unknown[]) => {
      const [edges, setEdges] = useState(initial);
      return [edges, setEdges, edgesChangeStub];
    },
    useNodesState: (initial: unknown[]) => {
      const [nodes, setNodes] = useState(initial);
      return [nodes, setNodes, nodesChangeStub];
    },
    useReactFlow: () => stableReactFlowInstance,
  };
}
