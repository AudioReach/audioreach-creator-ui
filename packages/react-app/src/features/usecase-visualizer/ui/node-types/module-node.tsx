/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ReactNode} from 'react';

import type {Node, NodeProps} from '@xyflow/react';

import {useNodeHighlight} from '../../model/use-node-highlight';
import {useVisualizerStore} from '../../model/visualizer-store-context';
import type {
  CoreOverride,
  ModuleNode as ModuleNodeData,
  ModuleShape,
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

const SHAPE_CLASSES: Record<ModuleShape, string> = {
  circle: '[clip-path:circle(50%)]',
  rect: '',
  'trapezoid-sink': '[clip-path:polygon(0_15%,100%_0,100%_100%,0_85%)]',
  'trapezoid-source': '[clip-path:polygon(0_0,100%_15%,100%_85%,0_100%)]',
  triangle: '[clip-path:polygon(0_0,100%_50%,0_100%)]',
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
  const highlight = useNodeHighlight(node.id);

  const override = renderNodeContent ? renderNodeContent(node) : null;
  const showModuleInstanceId = nodeDisplayConfig?.showModuleInstanceId ?? true;

  const shape = node.shape ?? 'rect';
  const isLocked = node.locked === true;

  const footer = override?.footer ?? defaultFooter(node, showModuleInstanceId);

  return (
    <div
      className="relative"
      data-locked={isLocked || undefined}
      data-shape={shape}
      data-testid="module-node"
      style={{height: node.height, width: node.width}}
    >
      <div
        className={[
          'module-node',
          'h-full w-full rounded border',
          SHAPE_CLASSES[shape],
          highlight.highlightMatchClass,
          highlight.highlightActiveClass,
          highlight.containsMatchClass,
        ]
          .filter(Boolean)
          .join(' ')}
        data-node-id={node.id}
        data-testid="module-shape-layer"
        style={{
          backgroundColor:
            highlight.state === 'active'
              ? highlight.activeBackgroundColor
              : 'var(--color-background-neutral-05)',
          borderColor: highlight.borderColor,
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
      </div>

      <PortHandles node={node} />
    </div>
  );
}
