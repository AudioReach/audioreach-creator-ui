/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Handle} from '@xyflow/react';

import type {AnyNode} from '~entities/graph';
import {ConvertNumberToHexString} from '~shared/utils/converter-utils';

import {useNodeHighlight} from '../model/use-node-highlight';
import {useVisualizerStore} from '../model/visualizer-store-context';

import {getPortAnchors} from './port-anchors';
import {anchorStyle} from './port-geometry';

interface GhostNodeProps {
  node: AnyNode;
  selected?: boolean;
}

const HANDLE_HIDDEN_CLASS = 'pointer-events-none opacity-0 ghost-node-handle';

export function GhostNode({node, selected}: GhostNodeProps) {
  const showSubgraphId = useVisualizerStore(
    (s) => s.nodeDisplayConfig?.showSubgraphId !== false,
  );
  const highlight = useNodeHighlight(node.id);
  const ports =
    node.nodeKind === 'module' ||
    node.nodeKind === 'subsystem' ||
    node.nodeKind === 'subgraph-proxy'
      ? node.ports
      : [];
  const shape = node.nodeKind === 'module' ? node.shape : undefined;
  const anchors = getPortAnchors(shape, ports, node.width, node.height);

  // Mirror the full SubgraphNode header: append the hex id when enabled, so the
  // id is visible at low zoom too.
  const label =
    node.nodeKind === 'subgraph' && showSubgraphId
      ? `${node.label} #${ConvertNumberToHexString(node.subgraphId) ?? node.subgraphId}`
      : node.label;

  // Boundary nodes (subgraph / container) label top-left like their headers;
  // leaf nodes label centered, matching full-detail rendering at low zoom.
  const labelTopLeft =
    node.nodeKind === 'subgraph' || node.nodeKind === 'container';
  const labelClass = labelTopLeft
    ? 'text-primary text-xxs absolute left-1 top-1 truncate font-semibold'
    : 'text-primary text-xxs absolute inset-x-1 top-1 truncate text-center';

  // Search highlight is a visual cue, so it must survive LOD: apply the same
  // border / active-fill / contains-match treatment the full node components do.
  const classNames = [
    'ghost-node relative rounded border',
    highlight.highlightMatchClass,
    highlight.highlightActiveClass,
    highlight.containsMatchClass,
  ]
    .filter(Boolean)
    .join(' ');

  // Selection shows the info border like the full nodes; search state wins.
  const borderColor =
    selected && highlight.state === 'none'
      ? 'var(--color-border-support-info)'
      : highlight.borderColor;

  return (
    <div
      aria-label={node.label}
      className={classNames}
      data-node-id={node.id}
      data-testid="ghost-node"
      style={{
        backgroundColor:
          highlight.state === 'active'
            ? highlight.activeBackgroundColor
            : 'var(--node-shade-subtle)',
        borderColor,
        height: node.height,
        width: node.width,
      }}
    >
      <span className={labelClass} data-testid="ghost-node-label">
        {label}
      </span>

      {anchors.map((anchor) => {
        return (
          <Handle
            key={anchor.handleId}
            aria-hidden="true"
            className={HANDLE_HIDDEN_CLASS}
            id={anchor.handleId}
            isConnectable={false}
            position={anchor.position}
            style={anchorStyle(anchor)}
            type={anchor.handleKind}
          />
        );
      })}
    </div>
  );
}
