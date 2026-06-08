/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Handle, Position} from '@xyflow/react';

import type {AnyNode} from '../model/visualizer.types';

import {getPortAnchors} from './port-anchors';

interface GhostNodeProps {
  node: AnyNode;
}

const HANDLE_HIDDEN_CLASS = 'pointer-events-none opacity-0 ghost-node-handle';

export function GhostNode({node}: GhostNodeProps) {
  const ports =
    node.nodeKind === 'module' ||
    node.nodeKind === 'subsystem' ||
    node.nodeKind === 'subgraph-proxy'
      ? node.ports
      : [];
  const shape = node.nodeKind === 'module' ? node.shape : undefined;
  const anchors = getPortAnchors(shape, ports, node.width, node.height);

  return (
    <div
      aria-label={node.label}
      className="ghost-node relative rounded border"
      data-node-id={node.id}
      data-testid="ghost-node"
      style={{
        backgroundColor: 'var(--color-background-neutral-04)',
        borderColor: 'var(--color-border-neutral-10)',
        height: node.height,
        width: node.width,
      }}
    >
      <span
        className="text-primary text-xxs absolute inset-x-1 top-1 truncate text-center"
        data-testid="ghost-node-label"
      >
        {node.label}
      </span>

      {anchors.map((anchor) => (
        <Handle
          key={anchor.handleId}
          aria-hidden="true"
          className={HANDLE_HIDDEN_CLASS}
          id={anchor.handleId}
          isConnectable={false}
          position={anchor.position}
          style={
            anchor.position === Position.Top ||
            anchor.position === Position.Bottom
              ? {left: anchor.x}
              : {top: anchor.y}
          }
          type={anchor.handleKind}
        />
      ))}
    </div>
  );
}
