/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';

import {formatDisplayId} from './display-id';

export interface ComponentInfo {
  displayName: string;
  id: string;
  kind: 'module' | 'subsystem' | 'unknown';
}

export interface LinkEndpointInfo {
  component: ComponentInfo;
  nodeId: string;
  portId: string;
  portLabel: string;
}

export interface DirectLinkInfo {
  destination: LinkEndpointInfo;
  id: string;
  source: LinkEndpointInfo;
  type: 'control' | 'data';
}

export function resolveComponentInfo(
  graphData: UsecaseGraphData,
  nodeId: string,
): ComponentInfo {
  const module = graphData.moduleInstances[nodeId];
  if (module) {
    return {
      displayName: module.displayName,
      id: formatDisplayId(module.moduleInstanceId),
      kind: 'module',
    };
  }

  const subsystem = graphData.subsystems[nodeId];
  if (subsystem) {
    return {
      displayName: subsystem.subsystemName,
      id: formatDisplayId(subsystem.subsystemId),
      kind: 'subsystem',
    };
  }

  return {displayName: nodeId, id: formatDisplayId(nodeId), kind: 'unknown'};
}

export function resolvePortLabel(
  graphData: UsecaseGraphData,
  nodeId: string,
  portId: string,
): string {
  const module = graphData.moduleInstances[nodeId];
  const modulePort = [
    ...(module?.inputPorts ?? []),
    ...(module?.outputPorts ?? []),
  ].find((port) => port.portId === portId);
  if (modulePort) {
    return `${modulePort.portName} (${formatDisplayId(modulePort.portId)})`;
  }

  const subsystem = graphData.subsystems[nodeId];
  const subsystemPort = [
    ...(subsystem?.dataPorts ?? []),
    ...(subsystem?.controlPorts ?? []),
  ].find((port) => port.portId === portId);
  if (subsystemPort) {
    return `${subsystemPort.portName} (${formatDisplayId(subsystemPort.portId)})`;
  }

  return formatDisplayId(portId);
}

export function buildDirectLinkInfo(
  graphData: UsecaseGraphData,
  connectionId: string,
): DirectLinkInfo | null {
  const connection = graphData.connections.find(
    (item) => item.connectionId === connectionId,
  );
  if (!connection) {
    return null;
  }

  return {
    destination: {
      component: resolveComponentInfo(graphData, connection.toModuleId),
      nodeId: connection.toModuleId,
      portId: connection.toPortId,
      portLabel: resolvePortLabel(
        graphData,
        connection.toModuleId,
        connection.toPortId,
      ),
    },
    id: connection.connectionId,
    source: {
      component: resolveComponentInfo(graphData, connection.fromModuleId),
      nodeId: connection.fromModuleId,
      portId: connection.fromPortId,
      portLabel: resolvePortLabel(
        graphData,
        connection.fromModuleId,
        connection.fromPortId,
      ),
    },
    type: connection.connectionType,
  };
}
