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
    if (seenConnectionIds.has(connection.connectionId)) {
      logger.warn(
        `buildLevelViewFromGraphData: duplicate connection id omitted: ${connection.connectionId}`,
        {
          action: 'build_level_view',
          component: 'levelViewAdapter',
        },
      );
      continue;
    }
    seenConnectionIds.add(connection.connectionId);
    dedupedConnections.push(connection);
  }

  return dedupedConnections;
}

export function buildLevelViewFromGraphData(
  data: UsecaseGraphData,
  levelId: string,
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
    (m) => !subsystemChildSubgraphIds.has(m.subgraphId),
  );
  const visibleConnectionNodeIds = new Set([
    ...visibleModuleInstances.map((m) => m.moduleInstanceId),
    ...visibleSubsystems.map((ss) => ss.subsystemId),
  ]);

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
      id: m.moduleInstanceId,
      label: m.displayName,
      meta: {systemId: m.moduleInstanceId},
      moduleId: Number(m.moduleId),
      moduleType: m.moduleType,
      nodeKind: NODE_KIND.MODULE,
      parentId: containerNodeId(m.containerId, m.subgraphId),
      ports,
      shape: resolveModuleShape(m.displayName),
      width: NODE_DIMENSIONS.module.minWidth,
      x: 0,
      y: 0,
    };
  });

  // Derive containers from the unique (containerId, subgraphId) pairs present
  // in visible moduleInstances. data.containers provides metadata (label) keyed by
  // containerId, but it has one entry per container entity â€” not one per
  // subgraph context. A container that spans multiple subgraphs needs a
  // separate ContainerNode per subgraph so every module has a valid parent.
  const containerMeta = new Map(
    Object.values(data.containers).map((c) => [c.containerId, c]),
  );
  const containersByKey = new Map<string, ContainerNode>();
  for (const m of visibleModuleInstances) {
    const key = containerNodeId(m.containerId, m.subgraphId);
    if (containersByKey.has(key)) {
      continue;
    }
    if (!containerMeta.has(m.containerId)) {
      logger.warn(
        'buildLevelViewFromGraphData: no container metadata for containerId',
        {
          action: 'build_level_view',
          component: 'levelViewAdapter',
        },
      );
    }
    containersByKey.set(key, {
      containerId: Number(m.containerId),
      height: 0,
      id: key,
      label: `Container ${m.containerId}`,
      meta: {
        containerSystemId: m.containerId,
        subgraphSystemId: m.subgraphId,
        systemId: m.containerId,
      } satisfies ContainerNodeMeta,
      nodeKind: NODE_KIND.CONTAINER,
      parentId: subgraphNodeId(m.subgraphId),
      width: 0,
      x: 0,
      y: 0,
    });
  }

  const subgraphs: SubgraphNode[] = Object.values(data.subgraphs)
    .filter((sg) => !subsystemChildSubgraphIds.has(sg.subgraphId))
    .map((sg) => ({
      height: 0,
      id: subgraphNodeId(sg.subgraphId),
      label: sg.subgraphName,
      meta: {
        subgraphSystemId: sg.subgraphId,
        systemId: sg.subgraphId,
      } satisfies SubgraphNodeMeta,
      nodeKind: NODE_KIND.SUBGRAPH,
      parentId: subgraphToSubsystemId.get(sg.subgraphId),
      subgraphId: Number(sg.subgraphId),
      width: 0,
      x: 0,
      y: 0,
    }));

  const subsystems: SubsystemNode[] = visibleSubsystems.map((ss) => {
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
      // Subsystem systemIds are globally unique â€” no prefix needed unlike
      // container or subgraph ids which share a numeric namespace.
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
  });

  const dataLinks: DataLink[] = [];
  const controlLinks: ControlLink[] = [];

  for (const c of dedupeConnectionsById(data.connections)) {
    if (
      !visibleConnectionNodeIds.has(c.fromModuleId) ||
      !visibleConnectionNodeIds.has(c.toModuleId)
    ) {
      continue;
    }
    if (c.connectionType === 'data') {
      dataLinks.push({
        edgeKind: EDGE_KIND.DATA,
        id: c.connectionId,
        isDangling: c.isDangling,
        meta: {systemId: c.connectionId},
        sourceNodeId: c.fromModuleId,
        sourcePortId: c.fromPortId,
        targetNodeId: c.toModuleId,
        targetPortId: c.toPortId,
      });
    } else {
      controlLinks.push({
        edgeKind: EDGE_KIND.CONTROL,
        id: c.connectionId,
        isDangling: c.isDangling,
        meta: {systemId: c.connectionId},
        sourceNodeId: c.fromModuleId,
        sourcePortId: c.fromPortId,
        targetNodeId: c.toModuleId,
        targetPortId: c.toPortId,
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
    if (scopedSubgraphIds.has(m.subgraphId)) {
      moduleInstances[id] = m;
    }
  }
  const includedNodeIds = new Set([
    ...Object.keys(moduleInstances),
    ...descendantSubsystemIds,
  ]);

  const connections = data.connections.filter(
    (c) =>
      includedNodeIds.has(c.fromModuleId) && includedNodeIds.has(c.toModuleId),
  );

  const subgraphs: UsecaseGraphData['subgraphs'] = {};
  for (const [id, sg] of Object.entries(data.subgraphs)) {
    if (scopedSubgraphIds.has(id)) {
      subgraphs[id] = sg;
    }
  }

  const containers: UsecaseGraphData['containers'] = {};
  for (const [id, c] of Object.entries(data.containers)) {
    if (scopedSubgraphIds.has(c.subgraphId)) {
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
  );
}
