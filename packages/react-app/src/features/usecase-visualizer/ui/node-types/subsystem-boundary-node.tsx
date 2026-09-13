/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Node, NodeProps} from '@xyflow/react';

import type {SubsystemNode as SubsystemNodeData} from '~entities/graph';

import {useNodeHighlight} from '../../model/use-node-highlight';

import {SubsystemBoundaryPortHandles} from './subsystem-boundary-port-handles';

type SubsystemBoundaryNodeProps = NodeProps<
  Node<SubsystemNodeData & Record<string, unknown>>
>;

export function SubsystemBoundaryNode({
  data: node,
  selected,
}: SubsystemBoundaryNodeProps) {
  const highlight = useNodeHighlight(node.id);
  const classNames = [
    'subsystem-boundary-node relative rounded-md border',
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
      data-locked={node.locked === true || undefined}
      data-node-id={node.id}
      data-testid="subsystem-boundary-node"
    >
      <span className="text-primary absolute inset-x-2 top-1 truncate text-sm font-semibold">
        {node.label}
      </span>
      <SubsystemBoundaryPortHandles
        height={node.height}
        id={node.id}
        locked={node.locked}
        ports={node.ports}
        width={node.width}
      />
    </div>
  );
}
