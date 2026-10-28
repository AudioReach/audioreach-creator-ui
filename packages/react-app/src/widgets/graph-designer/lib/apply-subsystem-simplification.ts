/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  ControlLink,
  DataLink,
  LevelView,
  Port,
  ProxyControlLink,
  ProxyDataLink,
  SubsystemNode,
} from '~entities/graph';

type LinkKind = 'control' | 'data';
type PortRole = 'control' | 'input' | 'output';

interface VirtualPortIdArgs {
  connectionId?: string;
  isBoundary: boolean;
  isInterUsecase: boolean;
  linkKind: LinkKind;
  role: PortRole;
  subsystemId: string;
}

interface VirtualDataLinkGroup {
  allEcLinks: boolean;
  edge: ProxyDataLink;
}

interface VirtualControlLinkGroup {
  edge: ProxyControlLink;
}

function proxyLinkId(
  linkKind: LinkKind,
  sourceNodeId: string,
  sourcePortId: string,
  targetNodeId: string,
  targetPortId: string,
): string {
  return [
    'subsystem-proxy',
    linkKind,
    sourceNodeId,
    sourcePortId,
    targetNodeId,
    targetPortId,
  ].join(':');
}

export function subsystemVirtualPortId({
  connectionId,
  isBoundary,
  isInterUsecase,
  linkKind,
  role,
  subsystemId,
}: VirtualPortIdArgs): string {
  if (isBoundary) {
    if (!connectionId) {
      throw new Error('Boundary subsystem ports require a connection ID');
    }
    return [
      'virtual',
      'ss',
      subsystemId,
      'boundary',
      linkKind,
      connectionId,
    ].join(':');
  }

  const danglingSuffix = isInterUsecase ? ':dangling' : '';
  if (linkKind === 'control') {
    return ['virtual', 'ss', subsystemId, 'control'].join(':') + danglingSuffix;
  }

  return (
    [
      'virtual',
      'ss',
      subsystemId,
      'data',
      role === 'output' ? 'out' : 'in',
    ].join(':') + danglingSuffix
  );
}

export function applySubsystemSimplification(level: LevelView): LevelView {
  const subsystemNodes = new Map<
    string,
    {isBoundary: boolean; node: SubsystemNode}
  >();
  for (const subsystem of level.subsystems ?? []) {
    subsystemNodes.set(subsystem.id, {isBoundary: false, node: subsystem});
  }
  if (level.boundarySubsystem) {
    subsystemNodes.set(level.boundarySubsystem.id, {
      isBoundary: true,
      node: level.boundarySubsystem,
    });
  }

  const hasSubsystemLink = [
    ...(level.dataLinks ?? []),
    ...(level.controlLinks ?? []),
  ].some(
    (link) =>
      subsystemNodes.has(link.sourceNodeId) ||
      subsystemNodes.has(link.targetNodeId),
  );
  if (!hasSubsystemLink) {
    return level;
  }

  const generatedPorts = new Map<string, Map<string, Port>>();
  const ensurePort = (
    nodeId: string,
    linkKind: LinkKind,
    role: PortRole,
    connectionId: string,
    isInterUsecase: boolean,
  ): string => {
    const subsystem = subsystemNodes.get(nodeId);
    if (!subsystem) {
      return '';
    }

    const portId = subsystemVirtualPortId({
      connectionId,
      isBoundary: subsystem.isBoundary,
      isInterUsecase,
      linkKind,
      role,
      subsystemId: subsystem.node.subsystemId,
    });
    const nodePorts = generatedPorts.get(nodeId) ?? new Map<string, Port>();
    if (!generatedPorts.has(nodeId)) {
      generatedPorts.set(nodeId, nodePorts);
    }
    if (!nodePorts.has(portId)) {
      nodePorts.set(portId, {id: portId, locked: true, portIoType: role});
    }
    return portId;
  };

  const dataGroups = new Map<string, VirtualDataLinkGroup>();
  const controlGroups = new Map<string, VirtualControlLinkGroup>();
  const keptDataLinks: DataLink[] = [];
  const keptControlLinks: ControlLink[] = [];

  for (const link of level.dataLinks ?? []) {
    const sourceSubsystem = subsystemNodes.get(link.sourceNodeId);
    const targetSubsystem = subsystemNodes.get(link.targetNodeId);
    if (!sourceSubsystem && !targetSubsystem) {
      keptDataLinks.push(link);
      continue;
    }

    const sourcePortId = sourceSubsystem
      ? ensurePort(
          link.sourceNodeId,
          'data',
          'output',
          link.id,
          link.isInterUsecase === true,
        )
      : link.sourcePortId;
    const targetPortId = targetSubsystem
      ? ensurePort(
          link.targetNodeId,
          'data',
          'input',
          link.id,
          link.isInterUsecase === true,
        )
      : link.targetPortId;
    const key = proxyLinkId(
      'data',
      link.sourceNodeId,
      sourcePortId,
      link.targetNodeId,
      targetPortId,
    );
    const existing = dataGroups.get(key);
    if (existing) {
      existing.edge.realConnectionIds?.push(link.id);
      existing.edge.isInterUsecase =
        existing.edge.isInterUsecase || link.isInterUsecase;
      existing.allEcLinks = existing.allEcLinks && link.isEcLink === true;
      if (!existing.allEcLinks) {
        delete existing.edge.isEcLink;
      }
      continue;
    }

    dataGroups.set(key, {
      allEcLinks: link.isEcLink === true,
      edge: {
        edgeKind: 'proxy-data',
        id: key,
        ...(link.isEcLink === true ? {isEcLink: true} : {}),
        ...(link.isInterUsecase === true ? {isInterUsecase: true} : {}),
        kind: 'subsystem',
        label: link.label,
        locked: true,
        meta: link.meta,
        realConnectionIds: [link.id],
        sourceNodeId: link.sourceNodeId,
        sourcePortId,
        targetNodeId: link.targetNodeId,
        targetPortId,
      },
    });
  }

  for (const link of level.controlLinks ?? []) {
    const sourceSubsystem = subsystemNodes.get(link.sourceNodeId);
    const targetSubsystem = subsystemNodes.get(link.targetNodeId);
    if (!sourceSubsystem && !targetSubsystem) {
      keptControlLinks.push(link);
      continue;
    }

    const sourcePortId = sourceSubsystem
      ? ensurePort(
          link.sourceNodeId,
          'control',
          'control',
          link.id,
          link.isInterUsecase === true,
        )
      : link.sourcePortId;
    const targetPortId = targetSubsystem
      ? ensurePort(
          link.targetNodeId,
          'control',
          'control',
          link.id,
          link.isInterUsecase === true,
        )
      : link.targetPortId;
    const key = proxyLinkId(
      'control',
      link.sourceNodeId,
      sourcePortId,
      link.targetNodeId,
      targetPortId,
    );
    const existing = controlGroups.get(key);
    if (existing) {
      existing.edge.realConnectionIds?.push(link.id);
      existing.edge.isInterUsecase =
        existing.edge.isInterUsecase || link.isInterUsecase;
      continue;
    }

    controlGroups.set(key, {
      edge: {
        edgeKind: 'proxy-control',
        id: key,
        ...(link.isInterUsecase === true ? {isInterUsecase: true} : {}),
        label: link.label,
        locked: true,
        meta: link.meta,
        realConnectionIds: [link.id],
        sourceNodeId: link.sourceNodeId,
        sourcePortId,
        targetNodeId: link.targetNodeId,
        targetPortId,
      },
    });
  }

  const withGeneratedPorts = (node: SubsystemNode): SubsystemNode => {
    const ports = generatedPorts.get(node.id);
    return ports ? {...node, ports: [...ports.values()]} : node;
  };

  return {
    ...level,
    ...(level.boundarySubsystem
      ? {boundarySubsystem: withGeneratedPorts(level.boundarySubsystem)}
      : {}),
    controlLinks: keptControlLinks,
    dataLinks: keptDataLinks,
    proxyControlLinks: [
      ...(level.proxyControlLinks ?? []),
      ...Array.from(controlGroups.values(), ({edge}) => edge),
    ],
    proxyDataLinks: [
      ...(level.proxyDataLinks ?? []),
      ...Array.from(dataGroups.values(), ({edge}) => edge),
    ],
    subsystems: level.subsystems?.map(withGeneratedPorts),
  };
}
