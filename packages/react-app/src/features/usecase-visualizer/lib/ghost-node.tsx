/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Handle} from '@xyflow/react';

import type {AnyNode} from '~entities/graph';
import {ConvertNumberToHexString} from '~shared/utils/converter-utils';

import {useNodeHighlight} from '../model/use-node-highlight';

import {getPortAnchors} from './port-anchors';
import {anchorStyle} from './port-geometry';

interface GhostNodeProps {
  node: AnyNode;
  selected?: boolean;
}

const HANDLE_HIDDEN_CLASS = 'pointer-events-none opacity-0 ghost-node-handle';

export function GhostNode({node, selected}: GhostNodeProps) {
  const highlight = useNodeHighlight(node.id);
  const ports =
    node.nodeKind === 'module' ||
    node.nodeKind === 'subsystem' ||
    node.nodeKind === 'subgraph-proxy'
      ? node.ports
      : [];
  const shape = node.nodeKind === 'module' ? node.shape : undefined;
  const anchors = getPortAnchors(shape, ports, node.width, node.height);

  const label =
    node.nodeKind === 'container'
      ? `Container ID: ${ConvertNumberToHexString(node.containerId) ?? node.containerId}`
      : node.label;

  const labelClass =
    node.nodeKind === 'subgraph'
      ? 'text-primary text-xxs absolute left-1 right-1 top-1 truncate'
      : node.nodeKind === 'module'
        ? 'text-primary text-xxs absolute inset-x-1 top-1/2 -translate-y-1/2 truncate text-center'
        : 'text-primary text-xxs absolute inset-x-1 top-1 truncate text-center';

  // Search highlight is a visual cue, so it must survive LOD: apply the same
  // border / active-fill / contains-match treatment the full node components do.
  const classNames = [
    'ghost-node relative rounded border',
    highlight.state === 'active'
      ? 'bg-support-warning'
      : 'bg-[var(--node-shade-subtle)]',
    selected && highlight.state === 'none'
      ? 'border-support-info'
      : highlight.state !== 'none'
        ? 'border-support-warning'
        : 'border-neutral-10',
    highlight.highlightMatchClass,
    highlight.highlightActiveClass,
    highlight.containsMatchClass,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      aria-label={node.label}
      className={classNames}
      data-node-id={node.id}
      data-testid="ghost-node"
      style={{height: node.height, width: node.width}}
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
