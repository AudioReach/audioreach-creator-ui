/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Node, NodeProps} from '@xyflow/react';
import {Maximize2} from 'lucide-react';

import {InlineIconButton} from '@qualcomm-ui/react/inline-icon-button';

import {useNodeHighlight} from '../../model/use-node-highlight';
import {useVisualizerStore} from '../../model/visualizer-store-context';
import type {SubgraphProxyNode as SubgraphProxyNodeData} from '../../model/visualizer.types';

import {PortHandles} from './port-handles';

type SubgraphProxyNodeProps = NodeProps<
  Node<SubgraphProxyNodeData & Record<string, unknown>>
>;

export function SubgraphProxyNode({
  data: node,
  selected,
}: SubgraphProxyNodeProps) {
  const onSubgraphExpand = useVisualizerStore(
    (state) => state.eventHandlers?.onSubgraphExpand,
  );
  const highlight = useNodeHighlight(node.id);

  const isLocked = node.locked === true;

  const classNames = [
    'subgraph-proxy-node relative rounded-md border-2 border-dashed',
    highlight.highlightMatchClass,
    highlight.highlightActiveClass,
    highlight.containsMatchClass,
  ]
    .filter(Boolean)
    .join(' ');

  const borderColor =
    selected && highlight.state === 'none'
      ? 'var(--color-border-support-info)'
      : highlight.borderColor;

  return (
    <div
      className={classNames}
      data-locked={isLocked || undefined}
      data-node-id={node.id}
      data-testid="subgraph-proxy-node"
      style={{
        backgroundColor:
          highlight.state === 'active'
            ? highlight.activeBackgroundColor
            : 'var(--color-background-neutral-04)',
        borderColor,
        height: '100%',
        width: '100%',
      }}
    >
      <div className="flex items-center justify-between gap-1 px-2 py-1">
        <span className="text-primary truncate text-xs font-semibold">
          {node.label}
        </span>
        <InlineIconButton
          aria-label="Expand subgraph"
          icon={Maximize2}
          onClick={() => onSubgraphExpand?.(node.subgraphId)}
          size="lg"
          variant="scale"
        />
      </div>

      <PortHandles node={node} />
    </div>
  );
}
