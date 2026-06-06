/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Node, NodeProps} from '@xyflow/react';

import {useVisualizerStore} from '../../model/visualizer-store-context';
import type {ContainerNode as ContainerNodeData} from '../../model/visualizer.types';

type ContainerNodeProps = NodeProps<
  Node<ContainerNodeData & Record<string, unknown>>
>;

export function ContainerNode({data: node}: ContainerNodeProps) {
  const clearHoverStateIfNode = useVisualizerStore(
    (state) => state.clearHoverStateIfNode,
  );
  const hoveredLogicalContainerId = useVisualizerStore(
    (state) => state.hoverState.hoveredLogicalContainerId,
  );
  const setHoverState = useVisualizerStore((state) => state.setHoverState);

  const isHighlighted =
    node.logicalContainerId != null &&
    hoveredLogicalContainerId === node.logicalContainerId;

  return (
    <div
      className={
        isHighlighted
          ? 'container-node container-hover-highlight relative rounded-md border border-dotted'
          : 'container-node relative rounded-md border border-dotted'
      }
      data-node-id={node.id}
      data-testid="container-node"
      onMouseEnter={() =>
        setHoverState(node.id, node.logicalContainerId ?? null)
      }
      onMouseLeave={() => clearHoverStateIfNode(node.id)}
      style={{
        backgroundColor: 'var(--color-background-neutral-02)',
        borderColor: isHighlighted
          ? 'var(--color-border-support-info)'
          : 'var(--color-border-neutral-10)',
        height: '100%',
        width: '100%',
      }}
    >
      <div className="text-secondary text-xxs absolute left-2 top-2 font-semibold">
        {node.label}
      </div>
    </div>
  );
}
