/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import {
  type ContainerNode,
  type ControlLink,
  type DataLink,
  EDGE_KIND,
  type LevelView,
  type ModuleNode,
  NODE_KIND,
  type Port,
  PORT_IO_TYPE,
  type SubgraphNode,
  type SubsystemNode,
} from '~features/usecase-visualizer';

import {containerNodeId, subgraphNodeId} from './node-id';

export function buildLevelViewFromGraphData(
  data: UsecaseGraphData,
  levelId: string,
): LevelView {
  const modules: ModuleNode[] = Object.values(data.moduleInstances).map((m) => {
    const ports: Port[] = [
      ...m.inputPorts
        .filter((p) => p.portType === 'data')
        .map(
          (p): Port => ({
            id: p.portId,
            name: p.portName,
            portIoType: PORT_IO_TYPE.INPUT,
          }),
        ),
      ...m.outputPorts
        .filter((p) => p.portType === 'data')
        .map(
          (p): Port => ({
            id: p.portId,
            name: p.portName,
            portIoType: PORT_IO_TYPE.OUTPUT,
          }),
        ),
      ...m.inputPorts
        .filter((p) => p.portType === 'control')
        .map(
          (p): Port => ({
            id: p.portId,
            name: p.portName,
            portIoType: PORT_IO_TYPE.CONTROL,
          }),
        ),
    ];

    return {
      height: 0,
      id: m.moduleInstanceId,
      label: m.displayName,
      moduleId: Number(m.moduleId),
      moduleType: m.moduleType,
      nodeKind: NODE_KIND.MODULE,
      parentId: containerNodeId(m.containerId, m.subgraphId),
      ports,
      width: 0,
      x: 0,
      y: 0,
    };
  });

  const containers: ContainerNode[] = Object.values(data.containers).map(
    (c) => ({
      containerId: Number(c.containerId),
      height: 0,
      id: containerNodeId(c.containerId, c.subgraphId),
      label: `Container ${c.containerId}`,
      nodeKind: NODE_KIND.CONTAINER,
      parentId: subgraphNodeId(c.subgraphId),
      width: 0,
      x: 0,
      y: 0,
    }),
  );

  // Build reverse index: subgraphId → subsystem systemId.
  const subgraphToSubsystemId = new Map<string, string>();
  for (const ss of Object.values(data.subsystems)) {
    for (const sgId of ss.subgraphs) {
      subgraphToSubsystemId.set(sgId, ss.subsystemId);
    }
  }

  const subgraphs: SubgraphNode[] = Object.values(data.subgraphs).map((sg) => ({
    height: 0,
    id: subgraphNodeId(sg.subgraphId),
    label: sg.subgraphName,
    nodeKind: NODE_KIND.SUBGRAPH,
    parentId: subgraphToSubsystemId.get(sg.subgraphId),
    subgraphId: Number(sg.subgraphId),
    width: 0,
    x: 0,
    y: 0,
  }));

  const subsystems: SubsystemNode[] = Object.values(data.subsystems).map(
    (ss) => {
      const ports: Port[] = [
        ...ss.dataPorts
          .filter((p) => p.direction === 'input')
          .map(
            (p): Port => ({
              id: p.portId,
              name: p.portName,
              portIoType: PORT_IO_TYPE.INPUT,
            }),
          ),
        ...ss.dataPorts
          .filter((p) => p.direction === 'output')
          .map(
            (p): Port => ({
              id: p.portId,
              name: p.portName,
              portIoType: PORT_IO_TYPE.OUTPUT,
            }),
          ),
        ...ss.controlPorts.map(
          (p): Port => ({
            id: p.portId,
            name: p.portName,
            portIoType: PORT_IO_TYPE.CONTROL,
          }),
        ),
      ];

      return {
        height: 0,
        // Subsystem systemIds are globally unique — no prefix needed unlike
        // container or subgraph ids which share a numeric namespace.
        id: ss.subsystemId,
        label: ss.subsystemName,
        nodeKind: NODE_KIND.SUBSYSTEM,
        ports,
        subsystemId: ss.subsystemId,
        width: 0,
        x: 0,
        y: 0,
      };
    },
  );

  const dataLinks: DataLink[] = [];
  const controlLinks: ControlLink[] = [];

  for (const c of data.connections) {
    if (c.connectionType === 'data') {
      dataLinks.push({
        edgeKind: EDGE_KIND.DATA,
        id: c.connectionId,
        sourceNodeId: c.fromModuleId,
        sourcePortId: c.fromPortId,
        targetNodeId: c.toModuleId,
        targetPortId: c.toPortId,
      });
    } else {
      controlLinks.push({
        edgeKind: EDGE_KIND.CONTROL,
        id: c.connectionId,
        sourceNodeId: c.fromModuleId,
        sourcePortId: c.fromPortId,
        targetNodeId: c.toModuleId,
        targetPortId: c.toPortId,
      });
    }
  }

  return {
    containers,
    controlLinks,
    dataLinks,
    levelId,
    modules,
    subgraphs,
    subsystems,
  };
}
