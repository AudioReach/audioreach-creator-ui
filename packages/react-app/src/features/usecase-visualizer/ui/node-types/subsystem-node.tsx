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
    selected || highlight.state === 'active'
      ? 'bg-support-info-subtle'
      : 'bg-[var(--node-shade-medium)]',
    selected || highlight.state !== 'none'
      ? 'border-support-info'
      : 'border-neutral-10',
    'h-full w-full',
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
    >
      <span className="text-primary absolute inset-x-2 top-1 truncate text-sm font-semibold">
        {node.label}
      </span>

      <PortHandles node={node} />
    </div>
  );
}
