/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Node, NodeProps} from '@xyflow/react';

import type {ContainerNode as ContainerNodeData} from '~entities/graph';
import {ConvertNumberToHexString} from '~shared/utils/converter-utils';

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
  const showContainerId = useVisualizerStore(
    (state) => state.nodeDisplayConfig?.showContainerId ?? true,
  );
  const setHoverState = useVisualizerStore((state) => state.setHoverState);
  const highlight = useNodeHighlight(node.id);

  const isHighlighted =
    node.logicalContainerId != null &&
    hoveredLogicalContainerId === node.logicalContainerId;

  const classNames = [
    'container-node relative rounded-md border border-dotted',
    highlight.state === 'active' ? 'bg-support-warning' : 'bg-neutral-02',
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
      <div className="text-secondary text-xxs absolute top-2 left-1/2 flex -translate-x-1/2 flex-col items-center text-center font-normal whitespace-nowrap">
        {showContainerId ? (
          <span data-testid="container-id">
            {`Container ID: ${ConvertNumberToHexString(node.containerId) ?? node.containerId}`}
          </span>
        ) : null}
      </div>
    </div>
  );
}
