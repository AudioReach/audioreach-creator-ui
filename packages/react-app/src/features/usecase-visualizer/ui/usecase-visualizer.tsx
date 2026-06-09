/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import {
  applyNodeChanges,
  type Edge,
  type Node,
  type NodeChange,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import {DATA_ARROW_MARKER_ID} from '../lib/edge-stroke';
import {recalculateParentSizes} from '../lib/recalculate-parent-sizes';
import {toReactFlowEdges, toReactFlowNodes} from '../lib/to-reactflow';
import {withGhostFallback} from '../lib/with-ghost-fallback';
import {createVisualizerStore} from '../model/usecase-visualizer-store';
import {
  useVisualizerStore,
  VisualizerStoreProvider,
} from '../model/visualizer-store-context';
import {
  type LevelView,
  NODE_KIND,
  type UsecaseVisualizerProps,
  type ViewportState,
} from '../model/visualizer.types';

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

interface CanvasProps {
  eventHandlers: UsecaseVisualizerProps['eventHandlers'];
  graph: LevelView;
  initialViewport: ViewportState | undefined;
  lodThreshold: number | undefined;
  store: ReturnType<typeof createVisualizerStore>;
}

function VisualizerCanvas({
  eventHandlers,
  graph,
  initialViewport,
  lodThreshold,
  store,
}: CanvasProps) {
  const {fitView, getViewport, setViewport} = useReactFlow();

  const [rfNodes, setRfNodes] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Two patterns intentionally coexist: useVisualizerStore selectors for
  // render-time reactive values, store.getState() in callbacks to avoid
  // stale closures on a stable store reference.
  const clearSelection = useVisualizerStore((s) => s.clearSelection);

  const prevLevelIdRef = useRef<string | undefined>(undefined);
  const prevProxiesCountRef = useRef<number>(
    // Seed from the initial graph, not 0 — prevents a spurious fitView on the
    // first prop update when the proxy count hasn't actually changed.
    graph.subgraphProxies?.length ?? 0,
  );
  const resizedParentsRef = useRef<
    Record<string, {height: number; width: number}>
  >({});
  // Keeps a stable reference to the latest rfNodes so drag handlers can
  // read current node state without closing over stale values.
  const rfNodesRef = useRef<Node[]>([]);
  // Capture initialViewport at mount only — changes after mount are ignored by
  // design.
  const initialViewportRef = useRef(initialViewport);

  // Sync event handlers into the store on every render so callbacks stay fresh.
  useEffect(() => {
    store.getState().setEventHandlers(eventHandlers);
  }, [eventHandlers, store]);

  useEffect(() => {
    if (lodThreshold !== undefined) {
      store.getState().setRenderingConfig({lodThreshold});
    }
  }, [lodThreshold, store]);

  useEffect(() => {
    const nextNodes = toReactFlowNodes(graph);
    setRfNodes(nextNodes);
    rfNodesRef.current = nextNodes;
    setRfEdges(toReactFlowEdges(graph));

    const levelId = graph.levelId;
    const proxiesCount = graph.subgraphProxies?.length ?? 0;
    const levelChanged = levelId !== prevLevelIdRef.current;
    // Intentionally tracks count, not identity: fitView fires when the number
    // of visible proxies changes (collapse/expand), not on every proxy swap.
    const proxiesChanged = proxiesCount !== prevProxiesCountRef.current;

    if (levelChanged || proxiesChanged) {
      clearSelection();
    }

    const rafId = requestAnimationFrame(() => {
      if (levelChanged) {
        const cached = store.getState().viewportCache[levelId];
        if (
          initialViewportRef.current &&
          prevLevelIdRef.current === undefined
        ) {
          // Very first mount — use initialViewport and seed the cache.
          void setViewport(initialViewportRef.current);
          store
            .getState()
            .setViewportCache(levelId, initialViewportRef.current);
        } else if (cached) {
          void setViewport({x: cached.x, y: cached.y, zoom: cached.zoom});
        } else {
          void fitView();
        }
      } else if (proxiesChanged) {
        void fitView();
      }
    });

    prevLevelIdRef.current = levelId;
    prevProxiesCountRef.current = proxiesCount;

    return () => cancelAnimationFrame(rafId);
  }, [
    clearSelection,
    fitView,
    graph,
    setRfEdges,
    setRfNodes,
    setViewport,
    store,
  ]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const hasDrag = changes.some((c) => c.type === 'position' && c.dragging);
      if (!hasDrag) {
        setRfNodes((current) => {
          const next = applyNodeChanges(changes, current);
          rfNodesRef.current = next;
          return next;
        });
        return;
      }
      // Recalculate on every drag tick so parent boundaries stay live during
      // the drag. resizedParentsRef is read only once on dragStop.
      // Ref write is outside the updater to keep the updater pure.
      const applied = applyNodeChanges(changes, rfNodesRef.current);
      const {nodes: resized, resizedParents} = recalculateParentSizes(applied);
      resizedParentsRef.current = resizedParents;
      rfNodesRef.current = resized;
      setRfNodes(resized);
    },
    [setRfNodes],
  );

  const handleNodeDragStop = useCallback(
    (_e: ReactMouseEvent, node: Node) => {
      const rp = resizedParentsRef.current;
      store.getState().eventHandlers?.onNodeDragEnd?.({
        nodeId: node.id,
        position: node.position,
        ...(Object.keys(rp).length > 0 ? {resizedParents: rp} : {}),
      });
      resizedParentsRef.current = {};
    },
    [store],
  );

  const handleMove = useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: {zoom: number}) => {
      store.getState().setLodZoom(viewport.zoom);
    },
    [store],
  );

  const handleMoveEnd = useCallback(
    (
      _event: MouseEvent | TouchEvent | null,
      viewport: {x: number; y: number; zoom: number},
    ) => {
      store.getState().eventHandlers?.onViewportChange?.(viewport);
    },
    [store],
  );

  const handleNodeDoubleClick = useCallback(
    (_e: ReactMouseEvent, node: Node) => {
      if (node.data.nodeKind === NODE_KIND.SUBSYSTEM) {
        store.getState().setViewportCache(graph.levelId, getViewport());
      }
      store.getState().eventHandlers?.onNodeDoubleClick?.(node.id);
    },
    [graph.levelId, getViewport, store],
  );

  return (
    <div className="relative h-full w-full">
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
        edges={rfEdges}
        nodeTypes={nodeTypes}
        nodes={rfNodes}
        onEdgesChange={onEdgesChange}
        onMove={handleMove}
        onMoveEnd={handleMoveEnd}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeDragStop={handleNodeDragStop}
        onNodesChange={handleNodesChange}
      />
    </div>
  );
}

export function UsecaseVisualizer({
  eventHandlers,
  graph,
  initialViewport,
  lodThreshold,
}: UsecaseVisualizerProps) {
  const store = useMemo(() => createVisualizerStore(), []);
  return (
    <ReactFlowProvider>
      <VisualizerStoreProvider store={store}>
        <VisualizerCanvas
          eventHandlers={eventHandlers}
          graph={graph}
          initialViewport={initialViewport}
          lodThreshold={lodThreshold}
          store={store}
        />
      </VisualizerStoreProvider>
    </ReactFlowProvider>
  );
}
