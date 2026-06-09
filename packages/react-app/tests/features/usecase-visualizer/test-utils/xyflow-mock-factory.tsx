/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ComponentType, ReactNode} from 'react';

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

interface FakeReactFlowProps {
  edges: FakeEdge[];
  edgeTypes: Record<string, ComponentType<Record<string, unknown>>>;
  nodes: FakeNode[];
  nodeTypes: Record<string, ComponentType<Record<string, unknown>>>;
}

/**
 * Factory used by `jest.mock('@xyflow/react', () => require(...).createXyflowMockFactory())`.
 * Kept in a separate module so tests outside `smoke.test.tsx` can share the
 * stub without duplicating ~100 lines of factory body.
 */
export function createXyflowMockFactory() {
  const FakeReactFlow = ({
    edges,
    edgeTypes,
    nodes,
    nodeTypes,
  }: FakeReactFlowProps) => (
    <div data-testid="fake-react-flow">
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

  return {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath: () => ['M 0 0 L 100 100', 50, 50, 50, 50],
    Handle,
    Position: {Bottom: 'bottom', Left: 'left', Right: 'right', Top: 'top'},
    ReactFlow: FakeReactFlow,
    ReactFlowProvider,
  };
}
