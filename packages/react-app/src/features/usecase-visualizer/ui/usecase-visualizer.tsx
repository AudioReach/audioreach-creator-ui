/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useMemo} from 'react';

import {ReactFlow, ReactFlowProvider} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import {DATA_ARROW_MARKER_ID} from '../lib/edge-stroke';
import {toReactFlowEdges, toReactFlowNodes} from '../lib/to-reactflow';
import {withGhostFallback} from '../lib/with-ghost-fallback';
import {createVisualizerStore} from '../model/usecase-visualizer-store';
import {VisualizerStoreProvider} from '../model/visualizer-store-context';
import type {UsecaseVisualizerProps} from '../model/visualizer.types';

import {ControlLinkEdge} from './edge-types/control-link-edge';
import {DataLinkEdge} from './edge-types/data-link-edge';
import {ContainerNode} from './node-types/container-node';
import {ModuleNode} from './node-types/module-node';
import {SubgraphNode} from './node-types/subgraph-node';
import {SubgraphProxyNode} from './node-types/subgraph-proxy-node';
import {SubsystemNode} from './node-types/subsystem-node';

const nodeTypes = {
  container: withGhostFallback(ContainerNode),
  module: withGhostFallback(ModuleNode),
  subgraph: withGhostFallback(SubgraphNode),
  'subgraph-proxy': withGhostFallback(SubgraphProxyNode),
  subsystem: withGhostFallback(SubsystemNode),
};

const edgeTypes = {
  'control-link': ControlLinkEdge,
  'data-link': DataLinkEdge,
  'proxy-control-link': ControlLinkEdge,
  'proxy-data-link': DataLinkEdge,
};

export type {UsecaseVisualizerProps};

export function UsecaseVisualizer({graph}: UsecaseVisualizerProps) {
  const store = useMemo(() => createVisualizerStore(), []);
  const nodes = useMemo(() => toReactFlowNodes(graph), [graph]);
  const edges = useMemo(() => toReactFlowEdges(graph), [graph]);

  return (
    <ReactFlowProvider>
      <VisualizerStoreProvider store={store}>
        <svg
          aria-hidden
          className="pointer-events-none absolute"
          height="0"
          width="0"
        >
          <defs>
            <marker
              id={DATA_ARROW_MARKER_ID}
              markerHeight="10"
              markerUnits="strokeWidth"
              markerWidth="10"
              orient="auto-start-reverse"
              refX="8"
              refY="5"
              viewBox="0 0 10 10"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
            </marker>
          </defs>
        </svg>
        <ReactFlow
          edgeTypes={edgeTypes}
          edges={edges}
          nodeTypes={nodeTypes}
          nodes={nodes}
        />
      </VisualizerStoreProvider>
    </ReactFlowProvider>
  );
}
