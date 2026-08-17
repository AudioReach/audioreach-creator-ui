/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Node, NodeProps} from '@xyflow/react';

import type {SubsystemNode as SubsystemNodeData} from '~entities/graph';

import {useNodeHighlight} from '../../model/use-node-highlight';

import {PortHandles} from './port-handles';

type SubsystemNodeProps = NodeProps<
  Node<SubsystemNodeData & Record<string, unknown>>
>;

export function SubsystemNode({data: node, selected}: SubsystemNodeProps) {
  const isLocked = node.locked === true;
  const highlight = useNodeHighlight(node.id);

  const classNames = [
    'subsystem-node relative rounded-md border',
    highlight.highlightMatchClass,
    highlight.highlightActiveClass,
    highlight.containsMatchClass,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      data-locked={isLocked || undefined}
      data-node-id={node.id}
      data-testid="subsystem-node"
      style={{
        backgroundColor:
          selected || highlight.state === 'active'
            ? 'var(--color-background-support-info-subtle)'
            : 'var(--node-shade-medium)',
        borderColor:
          selected || highlight.state !== 'none'
            ? 'var(--color-border-support-info)'
            : 'var(--color-border-neutral-10)',
        height: '100%',
        width: '100%',
      }}
    >
      <span className="text-primary absolute inset-x-2 top-1 truncate text-sm font-semibold">
        {node.label}
      </span>

      <PortHandles node={node} />
    </div>
  );
}
