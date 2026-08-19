/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Node, NodeProps} from '@xyflow/react';

import type {ContainerNode as ContainerNodeData} from '~entities/graph';

import {useNodeHighlight} from '../../model/use-node-highlight';
import {useVisualizerStore} from '../../model/visualizer-store-context';

type ContainerNodeProps = NodeProps<
  Node<ContainerNodeData & Record<string, unknown>>
>;

export function ContainerNode({data: node, selected}: ContainerNodeProps) {
  const clearHoverStateIfNode = useVisualizerStore(
    (state) => state.clearHoverStateIfNode,
  );
  const hoveredLogicalContainerId = useVisualizerStore(
    (state) => state.hoverState.hoveredLogicalContainerId,
  );
  const setHoverState = useVisualizerStore((state) => state.setHoverState);
  const highlight = useNodeHighlight(node.id);

  const isHighlighted =
    node.logicalContainerId != null &&
    hoveredLogicalContainerId === node.logicalContainerId;

  const classNames = [
    'container-node relative rounded-md border border-dotted',
    highlight.state === 'active'
      ? 'bg-support-warning'
      : 'bg-neutral-02',
    highlight.state !== 'none' || selected || isHighlighted
      ? 'border-support-info'
      : 'border-neutral-10',
    'h-full w-full',
    isHighlighted ? 'container-hover-highlight' : '',
    highlight.highlightMatchClass,
    highlight.highlightActiveClass,
    highlight.containsMatchClass,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      data-node-id={node.id}
      data-testid="container-node"
      onMouseEnter={() =>
        setHoverState(node.id, node.logicalContainerId ?? null)
      }
      onMouseLeave={() => clearHoverStateIfNode(node.id)}
    >
      <div className="text-secondary text-xxs absolute left-2 top-2 font-semibold">
        {node.label}
      </div>
    </div>
  );
}
