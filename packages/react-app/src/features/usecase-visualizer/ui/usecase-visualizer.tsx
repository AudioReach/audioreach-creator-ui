/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  Fragment,
  type DragEvent as ReactDragEvent,
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
  type ColorMode,
  type Connection,
  Controls,
  type Edge,
  MiniMap,
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

import {
  type AnyEdge,
  type AnyNode,
  EDGE_KIND,
  type LevelView,
  NODE_KIND,
  PORT_IO_TYPE,
} from '~entities/graph';
import {Theme} from '~entities/appearance';
import {useTheme} from '~shared/providers/theme-provider';

import '@xyflow/react/dist/style.css';

import {captureScreenshot} from '../lib/capture-screenshot';
import {isPositionInsideNode, resolveDropTarget} from '../lib/drop-target';
import {DATA_ARROW_MARKER_ID} from '../lib/edge-stroke';
import {parsePortIdFromHandleId} from '../lib/port-geometry';
import {recalculateParentSizes} from '../lib/recalculate-parent-sizes';
import {toReactFlowEdges, toReactFlowNodes} from '../lib/to-reactflow';
import {withGhostFallback} from '../lib/with-ghost-fallback';
import {createVisualizerStore} from '../model/usecase-visualizer-store';
import {
  useVisualizerStore,
  VisualizerStoreProvider,
} from '../model/visualizer-store-context';
import {
  type ContextMenuItem,
  type ContextMenuTarget,
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
  onScreenshotApiReady: UsecaseVisualizerProps['onScreenshotApiReady'];
  rendering: UsecaseVisualizerProps['rendering'];
  searchHighlights: UsecaseVisualizerProps['searchHighlights'];
  store: ReturnType<typeof createVisualizerStore>;
}

function VisualizerCanvas({
  contextMenu,
  eventHandlers,
  graph,
  initialViewport,
  lodThreshold,
  mode,
  onScreenshotApiReady,
  rendering,
  searchHighlights,
  store,
}: CanvasProps) {
  const rfInstance = useReactFlow();
  const {fitView, getViewport, screenToFlowPosition, setCenter, setViewport} =
    rfInstance;

  const [theme] = useTheme();
  const colorMode: ColorMode = theme === Theme.DARK ? 'dark' : 'light';

  const [rfNodes, setRfNodes] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [openMenu, setOpenMenu] = useState<OpenContextMenu | null>(null);

  // Two patterns intentionally coexist: useVisualizerStore selectors for
  // render-time reactive values, store.getState() in callbacks to avoid
  // stale closures on a stable store reference.
  const activeMode = useVisualizerStore((s) => s.mode);

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
  const rfNodesById = useMemo(
    () => new Map(rfNodes.map((n) => [n.id, n])),
    [rfNodes],
  );
  const rfNodesByIdRef = useRef<ReadonlyMap<string, Node>>(rfNodesById);
  rfNodesByIdRef.current = rfNodesById;
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
    store.getState().syncSearchHighlights(searchHighlights);
  }, [searchHighlights, store]);

  // Tracks the activeId for which we've already fired setCenter so we don't
  // snap repeatedly when rfNodes updates but activeId hasn't changed.
  const snappedActiveIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const activeId = searchHighlights?.activeId;
    if (!activeId) {
      snappedActiveIdRef.current = undefined;
      return;
    }
    // Already snapped for this activeId — skip unless activeId changed.
    if (snappedActiveIdRef.current === activeId) {
      return;
    }
    const node = rfNodes.find((n) => n.id === activeId);
    if (!node) {
      return;
    }
    snappedActiveIdRef.current = activeId;
    // node.position is relative to the node's parent (module → container →
    // subgraph). setCenter needs absolute flow coordinates, so sum the parent
    // chain's offsets before computing the centre.
    const byId = new Map(rfNodes.map((n) => [n.id, n]));
    let absX = node.position.x;
    let absY = node.position.y;
    let parentId = node.parentId;
    while (parentId) {
      const parent = byId.get(parentId);
      if (!parent) {
        break;
      }
      absX += parent.position.x;
      absY += parent.position.y;
      parentId = parent.parentId;
    }
    const cx = absX + (node.width ?? 0) / 2;
    const cy = absY + (node.height ?? 0) / 2;
    const zoom = Math.max(
      store.getState().lodZoom,
      store.getState().lodThreshold + 0.1,
    );
    const rafId = requestAnimationFrame(() => {
      setCenter(cx, cy, {duration: 300, zoom});
    });
    return () => cancelAnimationFrame(rafId);
  }, [searchHighlights?.activeId, rfNodes, store, setCenter]);

  // Registers the imperative screenshot capture function once per mount.
  // The alive flag ensures a stale closure can't return a capture after unmount.

  useEffect(() => {
    const onReady = onScreenshotApiReady;
    if (!onReady) {
      return;
    }
    let alive = true;
    onReady(async () => {
      if (!alive) {
        return null;
      }
      const viewport = containerRef.current?.querySelector<HTMLElement>(
        '.react-flow__viewport',
      );
      if (!viewport) {
        return null;
      }
      return captureScreenshot(rfInstance, viewport);
    });
    return () => {
      alive = false;
    };
  }, [onScreenshotApiReady, rfInstance]); // intentionally empty — captured once at mount

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
      store.getState().clearSelection();
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
  }, [fitView, graph, setRfEdges, setRfNodes, setViewport, store]);

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

  const handleDragOver = useCallback(
    (event: ReactDragEvent) => {
      const types = event.dataTransfer.types;
      if (types.includes('application/x-audioreach-node-type-subgraph')) {
        const pos = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        const nodesById = rfNodesByIdRef.current;
        const overSubgraph = rfNodesRef.current.some((n) => {
          const nodeData = n.data as unknown as AnyNode;
          return (
            nodeData.nodeKind === NODE_KIND.SUBGRAPH &&
            isPositionInsideNode(pos, n, nodesById)
          );
        });
        if (!overSubgraph) {
          event.preventDefault();
        }
        return;
      }
      if (types.includes('application/json')) {
        event.preventDefault();
      }
    },
    [screenToFlowPosition],
  );

  const handleDrop = useCallback(
    (event: ReactDragEvent) => {
      event.preventDefault();
      const dropData = event.dataTransfer.getData('application/json');
      if (!dropData) {
        return;
      }
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const dropTarget = resolveDropTarget(position, rfNodesRef.current);
      store.getState().eventHandlers?.onNodeDropped?.({
        dropData,
        ...dropTarget,
      });
    },
    [screenToFlowPosition, store],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      const {source, sourceHandle, target, targetHandle} = connection;
      if (!sourceHandle || !targetHandle) {
        return;
      }
      // Parse port ids from handle ids produced by dataHandleId / controlHandleId.
      const sourcePortId = parsePortIdFromHandleId(sourceHandle, 'source');
      const targetPortId = parsePortIdFromHandleId(targetHandle, 'target');
      if (!sourcePortId || !targetPortId) {
        return;
      }
      // Look up ports on source and target nodes.
      const sourceNode = rfNodesRef.current.find((n) => n.id === source);
      const targetNode = rfNodesRef.current.find((n) => n.id === target);
      const sourceNodeData = sourceNode?.data as unknown as AnyNode | undefined;
      const targetNodeData = targetNode?.data as unknown as AnyNode | undefined;
      const sourcePorts =
        sourceNodeData && 'ports' in sourceNodeData
          ? sourceNodeData.ports
          : undefined;
      const targetPorts =
        targetNodeData && 'ports' in targetNodeData
          ? targetNodeData.ports
          : undefined;
      const sourcePort = sourcePorts?.find((p) => p.id === sourcePortId);
      const targetPort = targetPorts?.find((p) => p.id === targetPortId);
      if (!sourcePort || !targetPort) {
        return;
      }
      if (sourcePort.locked === true || targetPort.locked === true) {
        return;
      }
      const sourceIsControl = sourcePort.portIoType === PORT_IO_TYPE.CONTROL;
      const targetIsControl = targetPort.portIoType === PORT_IO_TYPE.CONTROL;
      // Mismatch: one is control and the other is not.
      if (sourceIsControl !== targetIsControl) {
        return;
      }
      const edgeKind = sourceIsControl ? EDGE_KIND.CONTROL : EDGE_KIND.DATA;
      store.getState().eventHandlers?.onEdgeConnected?.({
        edgeKind,
        sourceNodeId: source,
        sourcePortId,
        targetNodeId: target,
        targetPortId,
      });
    },
    [store],
  );

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
    (_e: MouseEvent | TouchEvent, node: Node) => {
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
      store
        .getState()
        .eventHandlers?.onNodeDoubleClick?.(
          node.id,
          (node.data as unknown as AnyNode).nodeKind,
          (node.data as unknown as AnyNode).label,
        );
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
            markerHeight="6"
            markerUnits="strokeWidth"
            markerWidth="6"
            orient="auto-start-reverse"
            refX="5"
            refY="3"
            viewBox="0 0 6 6"
          >
            <path d="M 0 0 L 6 3 L 0 6 z" fill="context-stroke" />
          </marker>
        </defs>
      </svg>
      <ReactFlow
        colorMode={colorMode}
        edgeTypes={edgeTypes}
        edges={rfEdges}
        minZoom={0.05}
        multiSelectionKeyCode="Control"
        nodeTypes={nodeTypes}
        nodes={rfNodes}
        nodesConnectable={activeMode === VISUALIZER_MODE.EDIT}
        onConnect={handleConnect}
        onDragOver={
          activeMode === VISUALIZER_MODE.EDIT ? handleDragOver : undefined
        }
        onDrop={activeMode === VISUALIZER_MODE.EDIT ? handleDrop : undefined}
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
      >
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
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
                {renderMenuItems(
                  openMenu.items,
                  openMenu.target,
                  handleMenuAction,
                )}
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
  onScreenshotApiReady,
  rendering,
  searchHighlights,
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
          onScreenshotApiReady={onScreenshotApiReady}
          rendering={rendering}
          searchHighlights={searchHighlights}
          store={store}
        />
      </VisualizerStoreProvider>
    </ReactFlowProvider>
  );
}
