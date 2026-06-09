/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Node, NodeProps} from '@xyflow/react';

import {useNodeHighlight} from '../../model/use-node-highlight';
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
  const highlight = useNodeHighlight(node.id);

  const isHighlighted =
    node.logicalContainerId != null &&
    hoveredLogicalContainerId === node.logicalContainerId;

  const classNames = [
    'container-node relative rounded-md border border-dotted',
    isHighlighted ? 'container-hover-highlight' : '',
    highlight.highlightMatchClass,
    highlight.highlightActiveClass,
    highlight.containsMatchClass,
  ]
    .filter(Boolean)
    .join(' ');

  // Search highlight takes precedence over hover highlight for borderColor.
  const borderColor =
    highlight.state !== 'none' || isHighlighted
      ? 'var(--color-border-support-info)'
      : 'var(--color-border-neutral-10)';

  return (
    <div
      className={classNames}
      data-node-id={node.id}
      data-testid="container-node"
      onMouseEnter={() =>
        setHoverState(node.id, node.logicalContainerId ?? null)
      }
      onMouseLeave={() => clearHoverStateIfNode(node.id)}
      style={{
        backgroundColor:
          highlight.state === 'active'
            ? highlight.activeBackgroundColor
            : 'var(--color-background-neutral-02)',
        borderColor,
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
