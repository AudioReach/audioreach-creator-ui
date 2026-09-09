/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ProxyControlLink, ProxyDataLink} from '~entities/graph';
import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';

import {
  buildDirectLinkInfo,
  type ComponentInfo,
  type DirectLinkInfo,
} from './node-info';

export interface VirtualControlLinkRowModel {
  deleteId: string;
  id: string;
  peer1Component: ComponentInfo;
  peer1NodeId: string;
  peer1PortId: string;
  peer1PortLabel: string;
  peer2Component: ComponentInfo;
  peer2NodeId: string;
  peer2PortId: string;
  peer2PortLabel: string;
}

export interface VirtualDataLinkRowModel {
  deleteId: string;
  destinationComponent: ComponentInfo;
  destinationNodeId: string;
  destinationPortId: string;
  destinationPortLabel: string;
  id: string;
  sourceComponent: ComponentInfo;
  sourceNodeId: string;
  sourcePortId: string;
  sourcePortLabel: string;
}

export interface VirtualMdfModuleRowModel {
  id: string;
  moduleId: string;
  moduleName: string;
  processingDomain: string;
}

function toDataLinkRow(info: DirectLinkInfo): VirtualDataLinkRowModel {
  return {
    deleteId: info.id,
    destinationComponent: info.destination.component,
    destinationNodeId: info.destination.nodeId,
    destinationPortId: info.destination.portId,
    destinationPortLabel: info.destination.portLabel,
    id: info.id,
    sourceComponent: info.source.component,
    sourceNodeId: info.source.nodeId,
    sourcePortId: info.source.portId,
    sourcePortLabel: info.source.portLabel,
  };
}

function toControlLinkRow(info: DirectLinkInfo): VirtualControlLinkRowModel {
  return {
    deleteId: info.id,
    id: info.id,
    peer1Component: info.source.component,
    peer1NodeId: info.source.nodeId,
    peer1PortId: info.source.portId,
    peer1PortLabel: info.source.portLabel,
    peer2Component: info.destination.component,
    peer2NodeId: info.destination.nodeId,
    peer2PortId: info.destination.portId,
    peer2PortLabel: info.destination.portLabel,
  };
}

export function buildMdfModuleRows(
  graphData: UsecaseGraphData,
  proxy: ProxyDataLink,
): VirtualMdfModuleRowModel[] {
  return (proxy.mdfModuleIds ?? []).flatMap((moduleId) => {
    const module = graphData.moduleInstances[moduleId];
    if (!module) {
      return [];
    }

    return [
      {
        id: module.moduleInstanceId,
        moduleId: module.moduleId,
        moduleName: module.displayName,
        processingDomain: module.moduleType,
      },
    ];
  });
}

export function buildVirtualControlLinkRows(
  graphData: UsecaseGraphData,
  proxy: ProxyControlLink,
): VirtualControlLinkRowModel[] {
  return (proxy.realConnectionIds ?? []).flatMap((connectionId) => {
    const info = buildDirectLinkInfo(graphData, connectionId);
    return info ? [toControlLinkRow(info)] : [];
  });
}

export function buildVirtualDataLinkRows(
  graphData: UsecaseGraphData,
  proxy: ProxyDataLink,
): VirtualDataLinkRowModel[] {
  return (proxy.realConnectionIds ?? []).flatMap((connectionId) => {
    const info = buildDirectLinkInfo(graphData, connectionId);
    return info ? [toDataLinkRow(info)] : [];
  });
}
