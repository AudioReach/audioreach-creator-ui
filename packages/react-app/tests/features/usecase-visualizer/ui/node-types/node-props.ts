/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {NodeProps} from '@xyflow/react';

import type {
  ContainerNode,
  ModuleNode,
  SubgraphNode,
  SubgraphProxyNode,
  SubsystemNode,
} from '~features/usecase-visualizer/model/visualizer.types';

function makeNodeProps<T extends {id: string}>(
  node: T,
  type: string,
  overrides: Partial<NodeProps> = {},
): NodeProps {
  return {
    data: node,
    deletable: true,
    draggable: true,
    dragging: false,
    id: node.id,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    selectable: true,
    selected: false,
    type,
    zIndex: 0,
    ...overrides,
  };
}

export const makeContainerNodeProps = (
  node: ContainerNode,
  overrides?: Partial<NodeProps>,
): NodeProps => makeNodeProps(node, 'container', overrides);

export const makeModuleNodeProps = (
  node: ModuleNode,
  overrides?: Partial<NodeProps>,
): NodeProps => makeNodeProps(node, 'module', overrides);

export const makeSubgraphNodeProps = (
  node: SubgraphNode,
  overrides?: Partial<NodeProps>,
): NodeProps => makeNodeProps(node, 'subgraph', overrides);

export const makeSubgraphProxyNodeProps = (
  node: SubgraphProxyNode,
  overrides?: Partial<NodeProps>,
): NodeProps => makeNodeProps(node, 'subgraph-proxy', overrides);

export const makeSubsystemNodeProps = (
  node: SubsystemNode,
  overrides?: Partial<NodeProps>,
): NodeProps => makeNodeProps(node, 'subsystem', overrides);
