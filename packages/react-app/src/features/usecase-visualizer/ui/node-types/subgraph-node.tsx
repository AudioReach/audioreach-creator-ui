/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Node, NodeProps} from '@xyflow/react';
import {Minimize2} from 'lucide-react';

import {InlineIconButton} from '@qualcomm-ui/react/inline-icon-button';

import type {SubgraphNode as SubgraphNodeData} from '~entities/graph';
import {ConvertNumberToHexString} from '~shared/utils/converter-utils';

import {useNodeHighlight} from '../../model/use-node-highlight';
import {useVisualizerStore} from '../../model/visualizer-store-context';

type SubgraphNodeProps = NodeProps<
  Node<SubgraphNodeData & Record<string, unknown>>
>;

export function SubgraphNode({data: node, selected}: SubgraphNodeProps) {
  const renderNodeContent = useVisualizerStore(
    (state) => state.renderNodeContent,
  );
  const nodeDisplayConfig = useVisualizerStore(
    (state) => state.nodeDisplayConfig,
  );
  const onSubgraphCollapse = useVisualizerStore(
    (state) => state.eventHandlers?.onSubgraphCollapse,
  );
  const highlight = useNodeHighlight(node.id);

  const override = renderNodeContent ? renderNodeContent(node) : null;
  // SubgraphNode supports the `header` slot only. `footer` and `coreOverrides`
  // from NodeContentOverride are not rendered here — subgraphs have no footer
  // or corner-overlay region per the design spec.
  const showSubgraphId = nodeDisplayConfig?.showSubgraphId !== false;

  const classNames = [
    'subgraph-node rounded-md border',
    highlight.highlightMatchClass,
    highlight.highlightActiveClass,
    highlight.containsMatchClass,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      data-locked={node.locked === true || undefined}
      data-node-id={node.id}
      data-testid="subgraph-node"
      style={{
        backgroundColor:
          selected || highlight.state === 'active'
            ? 'var(--color-background-support-info-subtle)'
            : 'transparent',
        borderColor:
          selected || highlight.state !== 'none'
            ? 'var(--color-border-support-info)'
            : 'var(--color-border-neutral-10)',
        height: '100%',
        width: '100%',
      }}
    >
      <div
        className="subgraph-header flex items-center justify-between gap-2 px-2 py-1"
        data-testid="subgraph-header"
      >
        <div
          className="flex min-w-0 items-center gap-2"
          data-testid="subgraph-header-title-group"
        >
          <span className="text-primary flex items-center gap-1 truncate text-xs font-semibold">
            {node.label}
            {showSubgraphId ? (
              <span className="text-secondary" data-testid="subgraph-id">
                {`#${ConvertNumberToHexString(node.subgraphId) ?? node.subgraphId}`}
              </span>
            ) : null}
          </span>
          {override?.header ? (
            <span data-testid="subgraph-header-slot">{override.header}</span>
          ) : null}
        </div>
        {onSubgraphCollapse ? (
          <InlineIconButton
            aria-label="Collapse subgraph"
            icon={Minimize2}
            onClick={() => onSubgraphCollapse(node.subgraphId)}
            size="lg"
            variant="scale"
          />
        ) : null}
      </div>
    </div>
  );
}
