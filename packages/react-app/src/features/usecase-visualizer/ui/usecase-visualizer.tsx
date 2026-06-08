/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  Fragment,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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

import {Menu} from '@qualcomm-ui/react/menu';
import {Portal} from '@qualcomm-ui/react-core/portal';

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
  type AnyEdge,
  type AnyNode,
  type ContextMenuItem,
  type ContextMenuTarget,
  type LevelView,
  NODE_KIND,
  type UsecaseVisualizerProps,
  type ViewportState,
  VISUALIZER_MODE,
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

interface OpenContextMenu {
  items: ContextMenuItem[];
  target: ContextMenuTarget;
  x: number;
  y: number;
}

function buildNodeTarget(data: AnyNode): ContextMenuTarget {
  return {kind: data.nodeKind, node: data} as ContextMenuTarget;
}

function buildEdgeTarget(data: AnyEdge): ContextMenuTarget {
  return {edge: data, kind: `${data.edgeKind}-link`} as ContextMenuTarget;
}

function renderMenuItems(
  items: ContextMenuItem[],
  target: ContextMenuTarget,
  onAction: (item: ContextMenuItem, target: ContextMenuTarget) => void,
): ReactNode {
  return items.map((item) => (
    <Fragment key={item.id}>
      {item.dividerBefore ? <Menu.Separator /> : null}
      {item.children?.length ? (
        <Menu.Root positioning={{gutter: 2, placement: 'right-start'}}>
          <Menu.TriggerItem value={item.id}>
            {item.icon ? <Menu.ItemStartIcon icon={item.icon} /> : null}
            <Menu.ItemLabel>{item.label}</Menu.ItemLabel>
          </Menu.TriggerItem>
          <Portal>
            <Menu.Positioner>
              <Menu.Content>
                {renderMenuItems(item.children, target, onAction)}
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      ) : (
        <Menu.Item
          disabled={item.disabled}
          onSelect={() => onAction(item, target)}
          title={item.tooltip}
          value={item.id}
        >
          {item.icon ? <Menu.ItemStartIcon icon={item.icon} /> : null}
          <Menu.ItemLabel>{item.label}</Menu.ItemLabel>
        </Menu.Item>
      )}
    </Fragment>
  ));
}

interface CanvasProps {
  contextMenu: UsecaseVisualizerProps['contextMenu'];
  eventHandlers: UsecaseVisualizerProps['eventHandlers'];
  graph: LevelView;
  initialViewport: ViewportState | undefined;
  lodThreshold: number | undefined;
  mode: UsecaseVisualizerProps['mode'];
  rendering: UsecaseVisualizerProps['rendering'];
  store: ReturnType<typeof createVisualizerStore>;
}

function VisualizerCanvas({
  contextMenu,
  eventHandlers,
  graph,
  initialViewport,
  lodThreshold,
  mode,
  rendering,
  store,
}: CanvasProps) {
  const {fitView, getViewport, setViewport} = useReactFlow();

  const [rfNodes, setRfNodes] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [openMenu, setOpenMenu] = useState<OpenContextMenu | null>(null);

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
  // Capture initialViewport at mount only — changes after mount are ignored by
  // design.
  const initialViewportRef = useRef(initialViewport);

  // Refs mirror the latest node/edge lists so the keydown listener (attached
  // once) and drag handlers can read current state without stale closures.
  const rfNodesRef = useRef(rfNodes);
  rfNodesRef.current = rfNodes;
  const rfEdgesRef = useRef(rfEdges);
  rfEdgesRef.current = rfEdges;

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync event handlers into the store on every render so callbacks stay fresh.
  useEffect(() => {
    store.getState().setEventHandlers(eventHandlers);
  }, [eventHandlers, store]);

  useEffect(() => {
    store.getState().setContextMenu(contextMenu);
  }, [contextMenu, store]);

  useEffect(() => {
    store.getState().setMode(mode ?? VISUALIZER_MODE.READONLY);
  }, [mode, store]);

  useEffect(() => {
    store.getState().setRenderingConfig({
      lodThreshold,
      nodeDisplayConfig: rendering?.nodeDisplayConfig,
      renderNodeContent: rendering?.renderNodeContent,
    });
  }, [lodThreshold, rendering, store]);

  useEffect(() => {
    setRfNodes(toReactFlowNodes(graph));
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

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return undefined;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      const state = store.getState();
      if (event.key === 'Escape') {
        const prior = state.selection;
        if (
          prior.selectedNodeIds.length === 0 &&
          prior.selectedEdgeIds.length === 0
        ) {
          return;
        }
        state.clearSelection();
        state.eventHandlers?.onSelectionChange?.({
          delta: {
            addedEdgeIds: [],
            addedNodeIds: [],
            removedEdgeIds: prior.selectedEdgeIds,
            removedNodeIds: prior.selectedNodeIds,
          },
          selectedEdgeIds: [],
          selectedNodeIds: [],
        });
        return;
      }
      if (event.key === 'Delete') {
        if (state.mode !== VISUALIZER_MODE.EDIT) {
          return;
        }
        const sel = state.selection;
        const nodeIds = sel.selectedNodeIds.filter(
          (id) =>
            rfNodesRef.current.find((n) => n.id === id)?.data.locked !== true,
        );
        const edgeIds = sel.selectedEdgeIds.filter(
          (id) =>
            rfEdgesRef.current.find((e) => e.id === id)?.data?.locked !== true,
        );
        if (nodeIds.length > 0) {
          state.eventHandlers?.onNodesDeleted?.({nodeIds});
        }
        if (edgeIds.length > 0) {
          state.eventHandlers?.onEdgesDeleted?.({edgeIds});
        }
      }
    };
    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [store]);

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

  const handleSelectionChange = useCallback(
    ({edges, nodes}: {edges: Edge[]; nodes: Node[]}) => {
      const nodeIds = nodes.map((n) => n.id);
      const edgeIds = edges.map((e) => e.id);
      const prev = store.getState().selection;
      store.getState().setSelection(nodeIds, edgeIds);
      store.getState().eventHandlers?.onSelectionChange?.({
        delta: {
          addedEdgeIds: edgeIds.filter(
            (id) => !prev.selectedEdgeIds.includes(id),
          ),
          addedNodeIds: nodeIds.filter(
            (id) => !prev.selectedNodeIds.includes(id),
          ),
          removedEdgeIds: prev.selectedEdgeIds.filter(
            (id) => !edgeIds.includes(id),
          ),
          removedNodeIds: prev.selectedNodeIds.filter(
            (id) => !nodeIds.includes(id),
          ),
        },
        selectedEdgeIds: edgeIds,
        selectedNodeIds: nodeIds,
      });
    },
    [store],
  );

  const openContextMenu = useCallback(
    (event: ReactMouseEvent, target: ContextMenuTarget) => {
      const config = store.getState().contextMenu;
      if (!config) {
        return;
      }
      event.preventDefault();
      const items = config.getItems(target);
      if (items.length === 0) {
        setOpenMenu(null);
        return;
      }
      setOpenMenu({items, target, x: event.clientX, y: event.clientY});
    },
    [store],
  );

  const handleNodeContextMenu = useCallback(
    (event: ReactMouseEvent, node: Node) => {
      const data = node.data as unknown as AnyNode;
      const portEl =
        event.target instanceof Element
          ? event.target.closest('[data-port-id]')
          : null;
      if (portEl) {
        const portId = portEl.getAttribute('data-port-id');
        const ports = 'ports' in data ? data.ports : undefined;
        const port = ports?.find((p) => p.id === portId);
        if (port) {
          if (port.locked === true) {
            return;
          }
          openContextMenu(event, {kind: 'port', nodeId: node.id, port});
          return;
        }
      }
      if (data.locked === true) {
        return;
      }
      openContextMenu(event, buildNodeTarget(data));
    },
    [openContextMenu],
  );

  const handleEdgeContextMenu = useCallback(
    (event: ReactMouseEvent, edge: Edge) => {
      const data = edge.data as unknown as AnyEdge;
      if (data.locked === true) {
        return;
      }
      openContextMenu(event, buildEdgeTarget(data));
    },
    [openContextMenu],
  );

  const handlePaneContextMenu = useCallback(
    (event: ReactMouseEvent | MouseEvent) => {
      event.preventDefault();
      setOpenMenu(null);
    },
    [],
  );

  const handleMenuAction = useCallback(
    (item: ContextMenuItem, target: ContextMenuTarget) => {
      store.getState().contextMenu?.onAction(item.id, target);
      setOpenMenu(null);
    },
    [store],
  );

  return (
    <div ref={containerRef} className="relative h-full w-full">
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
        multiSelectionKeyCode="Control"
        nodeTypes={nodeTypes}
        nodes={rfNodes}
        onEdgeContextMenu={handleEdgeContextMenu}
        onEdgesChange={onEdgesChange}
        onMove={handleMove}
        onMoveEnd={handleMoveEnd}
        onNodeContextMenu={handleNodeContextMenu}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeDragStop={handleNodeDragStop}
        onNodesChange={handleNodesChange}
        onPaneContextMenu={handlePaneContextMenu}
        onSelectionChange={handleSelectionChange}
        panActivationKeyCode="Space"
        selectNodesOnDrag={false}
        selectionOnDrag
      />
      {openMenu ? (
        <Portal>
          <Menu.Root
            anchorPoint={{x: openMenu.x, y: openMenu.y}}
            onOpenChange={(open) => {
              if (!open) {
                setOpenMenu(null);
              }
            }}
            open
          >
            <Menu.Positioner>
              <Menu.Content>
                {renderMenuItems(openMenu.items, openMenu.target, handleMenuAction)}
              </Menu.Content>
            </Menu.Positioner>
          </Menu.Root>
        </Portal>
      ) : null}
    </div>
  );
}

export function UsecaseVisualizer({
  contextMenu,
  eventHandlers,
  graph,
  initialViewport,
  lodThreshold,
  mode,
  rendering,
}: UsecaseVisualizerProps) {
  const store = useMemo(() => createVisualizerStore(), []);
  return (
    <ReactFlowProvider>
      <VisualizerStoreProvider store={store}>
        <VisualizerCanvas
          contextMenu={contextMenu}
          eventHandlers={eventHandlers}
          graph={graph}
          initialViewport={initialViewport}
          lodThreshold={lodThreshold}
          mode={mode}
          rendering={rendering}
          store={store}
        />
      </VisualizerStoreProvider>
    </ReactFlowProvider>
  );
}
