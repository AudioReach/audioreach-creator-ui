/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ComponentType} from 'react';

import type {Node, NodeProps} from '@xyflow/react';

import {useVisualizerStore} from '../model/visualizer-store-context';
import type {AnyNode} from '../model/visualizer.types';

import {GhostNode} from './ghost-node';

type NodeComponent<TNode extends AnyNode> = ComponentType<
  NodeProps<Node<TNode & Record<string, unknown>>>
>;

/**
 * Higher-order component swapping the wrapped node component for GhostNode
 * when the per-mount lodZoom drops below lodThreshold. Threshold lives on
 * the store (default 0.4) and will be hydrated from props by the root
 * component in a later phase.
 */
export function withGhostFallback<TNode extends AnyNode>(
  Component: NodeComponent<TNode>,
): NodeComponent<TNode> {
  function GhostFallback(
    props: NodeProps<Node<TNode & Record<string, unknown>>>,
  ) {
    const isGhost = useVisualizerStore(
      (state) => state.lodZoom < state.lodThreshold,
    );

    if (isGhost) {
      return <GhostNode node={props.data} />;
    }
    return <Component {...props} />;
  }
  GhostFallback.displayName = `withGhostFallback(${
    Component.displayName ?? Component.name ?? 'Component'
  })`;
  return GhostFallback;
}
