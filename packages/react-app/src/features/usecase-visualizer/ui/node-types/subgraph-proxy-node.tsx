/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Node, NodeProps} from '@xyflow/react';
import {Maximize2} from 'lucide-react';

import {InlineIconButton} from '@qualcomm-ui/react/inline-icon-button';
import {Tooltip} from '@qualcomm-ui/react/tooltip';

import type {SubgraphProxyNode as SubgraphProxyNodeData} from '~entities/graph';
import {ConvertNumberToHexString} from '~shared/utils/converter-utils';

import {useNodeHighlight} from '../../model/use-node-highlight';
import {useVisualizerStore} from '../../model/visualizer-store-context';

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
  const showSubgraphId = useVisualizerStore(
    (state) => state.nodeDisplayConfig?.showSubgraphId !== false,
  );
  const highlight = useNodeHighlight(node.id);

  const isLocked = node.locked === true;

  const classNames = [
    'subgraph-proxy-node relative rounded-md border-2 border-dashed',
    highlight.state === 'active'
      ? 'bg-support-warning'
      : 'bg-[var(--node-shade-subtle)]',
    selected && highlight.state === 'none'
      ? 'border-support-info'
      : highlight.state !== 'none'
        ? 'border-support-warning'
        : 'border-neutral-10',
    'h-full w-full',
    highlight.highlightMatchClass,
    highlight.highlightActiveClass,
    highlight.containsMatchClass,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="relative h-full w-full">
      <div
        className={classNames}
        data-locked={isLocked || undefined}
        data-node-id={node.id}
        data-testid="subgraph-proxy-node"
      >
        <div className="flex justify-end px-2 py-1">
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

      <div className="absolute inset-x-0 top-full mt-2 flex min-w-0 flex-col items-center text-center">
        <Tooltip
          positioning={{placement: 'bottom', strategy: 'fixed'}}
          trigger={
            <span className="text-primary text-xxs block max-w-full truncate font-semibold">
              {node.label}
            </span>
          }
        >
          {node.label}
        </Tooltip>
        {showSubgraphId ? (
          <span className="text-secondary text-xxs">
            {`SGID: ${ConvertNumberToHexString(node.subgraphId) ?? node.subgraphId}`}
          </span>
        ) : null}
      </div>
    </div>
  );
}
