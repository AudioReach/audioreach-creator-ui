/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ReactNode} from 'react';

import type {Node, NodeProps} from '@xyflow/react';

import {useVisualizerStore} from '../../model/visualizer-store-context';
import type {
  CoreOverride,
  ModuleNode as ModuleNodeData,
} from '../../model/visualizer.types';

import {PortHandles} from './port-handles';

type ModuleNodeProps = NodeProps<
  Node<ModuleNodeData & Record<string, unknown>>
>;

const CORNER_CLASSES: Record<CoreOverride['position'], string> = {
  'bottom-left': 'absolute bottom-0 left-0',
  'bottom-right': 'absolute bottom-0 right-0',
  'top-left': 'absolute left-0 top-0',
  'top-right': 'absolute right-0 top-0',
};

function defaultFooter(
  node: ModuleNodeData,
  showModuleInstanceId: boolean,
): ReactNode {
  return (
    <div
      className="text-primary text-xxs flex items-center justify-between gap-1 px-1"
      data-testid="module-default-footer"
    >
      <span className="truncate">{node.alias ?? node.label}</span>
      {showModuleInstanceId ? (
        <span
          className="text-secondary"
          data-testid="module-instance-id"
        >{`#${node.moduleId}`}</span>
      ) : null}
    </div>
  );
}

export function ModuleNode({data: node}: ModuleNodeProps) {
  const renderNodeContent = useVisualizerStore(
    (state) => state.renderNodeContent,
  );
  const nodeDisplayConfig = useVisualizerStore(
    (state) => state.nodeDisplayConfig,
  );

  const override = renderNodeContent ? renderNodeContent(node) : null;
  const showModuleInstanceId = nodeDisplayConfig?.showModuleInstanceId ?? true;

  const shape = node.shape ?? 'rect';
  const isLocked = node.locked === true;

  const footer = override?.footer ?? defaultFooter(node, showModuleInstanceId);

  return (
    <div
      className={`module-node module-shape-${shape} relative rounded border`}
      data-locked={isLocked || undefined}
      data-node-id={node.id}
      data-shape={shape}
      data-testid="module-node"
      style={{
        backgroundColor: 'var(--color-background-neutral-05)',
        borderColor: 'var(--color-border-neutral-10)',
        height: node.height,
        width: node.width,
      }}
    >
      {node.icon ? (
        <img
          alt=""
          className="module-icon mx-auto block h-6 w-6"
          data-testid="module-icon"
          src={node.icon}
        />
      ) : null}

      {override?.coreOverrides?.map((slot, idx) => (
        <div
          key={`${slot.position}-${idx}`}
          className={`core-override core-override-${slot.position} ${CORNER_CLASSES[slot.position]}`}
          data-position={slot.position}
          data-testid={`core-override-${slot.position}`}
        >
          {slot.content}
        </div>
      ))}

      <div
        className="module-footer absolute inset-x-0 bottom-0"
        data-testid="module-footer"
      >
        {footer}
      </div>

      <PortHandles node={node} />
    </div>
  );
}
