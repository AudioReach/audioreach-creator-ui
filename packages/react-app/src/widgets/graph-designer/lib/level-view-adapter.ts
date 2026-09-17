/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  type ContainerNode,
  type ContainerNodeMeta,
  type ControlLink,
  type DataLink,
  EDGE_KIND,
  type LevelView,
  type ModuleNode,
  type ModuleShape,
  NODE_KIND,
  type Port,
  PORT_IO_TYPE,
  type SubgraphNode,
  type SubgraphNodeMeta,
  type SubsystemNode,
} from '~entities/graph';
import type {
  Connection,
  Subsystem,
  UsecaseGraphData,
} from '~features/graph-designer/model/graph-data-slice';
import {NODE_DIMENSIONS} from '~features/usecase-visualizer';
import {logger} from '~shared/lib/logger';

import {containerNodeId, subgraphNodeId} from './node-id';

function resolveModuleShape(name: string): ModuleShape | undefined {
  const t = name.toLowerCase();
  if (
    t.includes('data log') ||
    t.includes('datalog') ||
    t.includes('logging')
  ) {
    return 'circle';
  }
  if (t.includes('source')) {
    return 'trapezoid-source';
  }
  if (t.includes('sink')) {
    return 'trapezoid-sink';
  }
  return undefined;
}

function dedupeConnectionsById(connections: Connection[]): Connection[] {
  const seenConnectionIds = new Set<string>();
  const dedupedConnections: Connection[] = [];

  for (const connection of connections) {
    if (seenConnectionIds.has(connection.systemId)) {
      logger.warn(
        `buildLevelViewFromGraphData: duplicate connection id omitted: ${connection.systemId}`,
        {
          action: 'build_level_view',
          component: 'levelViewAdapter',
        },
      );
      continue;
    }
    seenConnectionIds.add(connection.systemId);
    dedupedConnections.push(connection);
  }

  return dedupedConnections;
}

function buildSubsystemNode(ss: Subsystem): SubsystemNode {
  const ports: Port[] = [
    ...ss.dataPorts
      .filter((p) => p.direction === 'input')
      .map((p): Port => ({
        id: p.portId,
        name: p.portName,
        portIoType: PORT_IO_TYPE.INPUT,
      })),
    ...ss.dataPorts
      .filter((p) => p.direction === 'output')
      .map((p): Port => ({
        id: p.portId,
        name: p.portName,
        portIoType: PORT_IO_TYPE.OUTPUT,
      })),
    ...ss.controlPorts.map((p): Port => ({
      id: p.portId,
      name: p.portName,
      portIoType: PORT_IO_TYPE.CONTROL,
    })),
  ];

  return {
    height: NODE_DIMENSIONS.subsystem.baseHeight,
    id: ss.subsystemId,
    label: ss.subsystemName,
    meta: {systemId: ss.subsystemId},
    nodeKind: NODE_KIND.SUBSYSTEM,
    ports,
    subsystemId: ss.subsystemId,
    width: NODE_DIMENSIONS.subsystem.width,
    x: 0,
    y: 0,
  };
}

export function buildLevelViewFromGraphData(
  data: UsecaseGraphData,
  levelId: string,
  options?: {boundarySubsystem?: Subsystem},
): LevelView {
  const allSubsystems = Object.values(data.subsystems);
  const childSubsystemIds = new Set(
    allSubsystems.flatMap((ss) => ss.childSubsystemIds),
  );
  const visibleSubsystems = allSubsystems.filter(
    (ss) => !childSubsystemIds.has(ss.subsystemId),
  );
  const subgraphToSubsystemId = new Map<string, string>();
  for (const ss of allSubsystems) {
    for (const sgId of ss.subgraphs) {
      subgraphToSubsystemId.set(sgId, ss.subsystemId);
    }
  }
  const subsystemChildSubgraphIds = new Set(subgraphToSubsystemId.keys());
  const visibleModuleInstances = Object.values(data.moduleInstances).filter(
    (m) => !subsystemChildSubgraphIds.has(m.subgraphSystemId),
  );
  const visibleConnectionNodeIds = new Set([
    ...visibleModuleInstances.map((m) => m.systemId),
    ...visibleSubsystems.map((ss) => ss.subsystemId),
  ]);
  if (options?.boundarySubsystem) {
    visibleConnectionNodeIds.add(options.boundarySubsystem.subsystemId);
  }

  const modules: ModuleNode[] = visibleModuleInstances.map((m) => {
    const ports: Port[] = [
      ...m.inputPorts
        .filter((p) => p.portType === 'data')
        .map((p): Port => ({
          activeLinks: p.activeLinks,
          id: p.portSystemId,
          name: p.portName,
          portIoType: PORT_IO_TYPE.INPUT,
          totalLinks: p.totalLinksAtPort,
        })),
      ...m.outputPorts
        .filter((p) => p.portType === 'data')
        .map((p): Port => ({
          activeLinks: p.activeLinks,
          id: p.portSystemId,
          name: p.portName,
          portIoType: PORT_IO_TYPE.OUTPUT,
          totalLinks: p.totalLinksAtPort,
        })),
      ...m.inputPorts
        .filter((p) => p.portType === 'control')
        .map((p): Port => ({
          activeLinks: p.activeLinks,
          id: p.portSystemId,
          name: p.portName,
          portIoType: PORT_IO_TYPE.CONTROL,
          totalLinks: p.totalLinksAtPort,
        })),
    ];

    return {
      height: 0,
      id: m.systemId,
      label: m.displayName,
      meta: {systemId: m.systemId},
      moduleId: m.naturalId,
      moduleType: m.moduleType,
      nodeKind: NODE_KIND.MODULE,
      parentId: containerNodeId(m.containerSystemId, m.subgraphSystemId),
      ports,
      shape: resolveModuleShape(m.displayName),
      width: NODE_DIMENSIONS.module.minWidth,
      x: 0,
      y: 0,
    };
  });

  // Derive containers from the unique (containerId, subgraphId) pairs present
  // in visible moduleInstances. data.containers provides metadata (label) keyed by
  // containerId, but it has one entry per container entity - not one per
  // subgraph context. A container that spans multiple subgraphs needs a
  // separate ContainerNode per subgraph so every module has a valid parent.
  const containerMeta = new Map(
    Object.values(data.containers).map((c) => [c.systemId, c]),
  );
  const containersByKey = new Map<string, ContainerNode>();
  for (const m of visibleModuleInstances) {
    const key = containerNodeId(m.containerSystemId, m.subgraphSystemId);
    if (containersByKey.has(key)) {
      continue;
    }
    if (!containerMeta.has(m.containerSystemId)) {
      logger.warn(
        'buildLevelViewFromGraphData: no container metadata for containerId',
        {
          action: 'build_level_view',
          component: 'levelViewAdapter',
        },
      );
    }
    containersByKey.set(key, {
      containerId: Number(m.containerSystemId),
      height: 0,
      id: key,
      label: `Container ${m.containerSystemId}`,
      meta: {
        containerSystemId: m.containerSystemId,
        subgraphSystemId: m.subgraphSystemId,
        systemId: m.containerSystemId,
      } satisfies ContainerNodeMeta,
      nodeKind: NODE_KIND.CONTAINER,
      parentId: subgraphNodeId(m.subgraphSystemId),
      width: 0,
      x: 0,
      y: 0,
    });
  }

  const subgraphs: SubgraphNode[] = Object.values(data.subgraphs)
    .filter((sg) => !subsystemChildSubgraphIds.has(sg.systemId))
    .map((sg) => ({
      height: 0,
      id: subgraphNodeId(sg.systemId),
      label: sg.subgraphName,
      meta: {
        subgraphSystemId: sg.systemId,
        systemId: sg.systemId,
      } satisfies SubgraphNodeMeta,
      nodeKind: NODE_KIND.SUBGRAPH,
      parentId: subgraphToSubsystemId.get(sg.systemId),
      subgraphId: Number(sg.systemId),
      width: 0,
      x: 0,
      y: 0,
    }));

  const subsystems: SubsystemNode[] = visibleSubsystems.map(buildSubsystemNode);

  const dataLinks: DataLink[] = [];
  const controlLinks: ControlLink[] = [];

  for (const c of dedupeConnectionsById(data.connections)) {
    if (
      !visibleConnectionNodeIds.has(c.sourceSystemId) ||
      !visibleConnectionNodeIds.has(c.destinationSystemId)
    ) {
      continue;
    }
    if (c.linkKind === 'data') {
      dataLinks.push({
        edgeKind: EDGE_KIND.DATA,
        id: c.systemId,
        isDangling: c.isInterUsecase,
        meta: {systemId: c.systemId},
        sourceNodeId: c.sourceSystemId,
        sourcePortId: c.sourcePortSystemId,
        targetNodeId: c.destinationSystemId,
        targetPortId: c.destinationPortSystemId,
      });
    } else {
      controlLinks.push({
        edgeKind: EDGE_KIND.CONTROL,
        id: c.systemId,
        isDangling: c.isInterUsecase,
        meta: {systemId: c.systemId},
        sourceNodeId: c.sourceSystemId,
        sourcePortId: c.sourcePortSystemId,
        targetNodeId: c.destinationSystemId,
        targetPortId: c.destinationPortSystemId,
      });
    }
  }

  const levelView = {
    containers: [...containersByKey.values()],
    controlLinks,
    dataLinks,
    levelId,
    modules,
    subgraphs,
    subsystems,
    ...(options?.boundarySubsystem
      ? {boundarySubsystem: buildSubsystemNode(options.boundarySubsystem)}
      : {}),
  };

  return levelView;
}

function collectDescendantSubsystemIds(
  data: UsecaseGraphData,
  subsystemId: string,
): Set<string> {
  const descendantSubsystemIds = new Set<string>();
  const pendingSubsystemIds = [
    ...(data.subsystems[subsystemId]?.childSubsystemIds ?? []),
  ];

  while (pendingSubsystemIds.length > 0) {
    const childSubsystemId = pendingSubsystemIds.pop();
    if (
      childSubsystemId === undefined ||
      childSubsystemId === subsystemId ||
      descendantSubsystemIds.has(childSubsystemId)
    ) {
      continue;
    }

    const childSubsystem = data.subsystems[childSubsystemId];
    if (!childSubsystem) {
      continue;
    }

    descendantSubsystemIds.add(childSubsystemId);
    pendingSubsystemIds.push(...childSubsystem.childSubsystemIds);
  }

  return descendantSubsystemIds;
}

/**
 * Builds a canvas view scoped to one subsystem's descendant nodes and links.
 * Returns null if the subsystem is not found in the current graph data.
 */
export function buildSubsystemLevelViewFromGraphData(
  data: UsecaseGraphData,
  subsystemId: string,
  levelId: string,
): LevelView | null {
  const subsystem = data.subsystems[subsystemId];
  if (!subsystem) {
    return null;
  }

  const descendantSubsystemIds = collectDescendantSubsystemIds(
    data,
    subsystemId,
  );
  const scopedSubsystemIds = new Set([subsystemId, ...descendantSubsystemIds]);
  const scopedSubgraphIds = new Set<string>();
  for (const scopedSubsystemId of scopedSubsystemIds) {
    for (const subgraphId of data.subsystems[scopedSubsystemId]?.subgraphs ??
      []) {
      scopedSubgraphIds.add(subgraphId);
    }
  }

  const moduleInstances: UsecaseGraphData['moduleInstances'] = {};
  for (const [id, m] of Object.entries(data.moduleInstances)) {
    if (scopedSubgraphIds.has(m.subgraphSystemId)) {
      moduleInstances[id] = m;
    }
  }
  const includedNodeIds = new Set([
    ...Object.keys(moduleInstances),
    ...descendantSubsystemIds,
    subsystemId,
  ]);

  const connections = data.connections.filter(
    (c) =>
      includedNodeIds.has(c.sourceSystemId) && includedNodeIds.has(c.destinationSystemId),
  );

  const subgraphs: UsecaseGraphData['subgraphs'] = {};
  for (const [id, sg] of Object.entries(data.subgraphs)) {
    if (scopedSubgraphIds.has(id)) {
      subgraphs[id] = sg;
    }
  }

  const containers: UsecaseGraphData['containers'] = {};
  for (const [id, c] of Object.entries(data.containers)) {
    if (scopedSubgraphIds.has(c.subgraphSystemId)) {
      containers[id] = c;
    }
  }

  const subsystems: UsecaseGraphData['subsystems'] = {};
  for (const [id, ss] of Object.entries(data.subsystems)) {
    if (descendantSubsystemIds.has(id)) {
      subsystems[id] = ss;
    }
  }

  return buildLevelViewFromGraphData(
    {
      connections,
      containers,
      moduleInstances,
      selectedUsecases: data.selectedUsecases,
      subgraphs,
      subsystems,
    },
    levelId,
    {boundarySubsystem: subsystem},
  );
}
