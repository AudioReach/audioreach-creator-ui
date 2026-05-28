/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Fragment, type ReactNode} from 'react';

import {Handle, type Node, type NodeProps, Position} from '@xyflow/react';

import {useVisualizerStore} from '../../model/visualizer-store-context';
import type {
  ModuleNode as ModuleNodeData,
  Port,
} from '../../model/visualizer.types';

type ModuleNodeProps = NodeProps<
  Node<ModuleNodeData & Record<string, unknown>>
>;

const PORT_PADDING = 12;

const CORNER_CLASSES: Record<string, string> = {
  'bottom-left': 'absolute bottom-0 left-0',
  'bottom-right': 'absolute bottom-0 right-0',
  'top-left': 'absolute left-0 top-0',
  'top-right': 'absolute right-0 top-0',
};

function offsetForIndex(
  totalLength: number,
  count: number,
  index: number,
): number {
  const step = (totalLength - 2 * PORT_PADDING) / (count + 1);
  return PORT_PADDING + step * (index + 1);
}

function portStatusClass(port: Port): string {
  return port.portStatus ? `port-status-${port.portStatus}` : '';
}

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

export function ModuleNode({data}: ModuleNodeProps) {
  const node = data;
  const renderNodeContent = useVisualizerStore(
    (state) => state.renderNodeContent,
  );
  const nodeDisplayConfig = useVisualizerStore(
    (state) => state.nodeDisplayConfig,
  );

  const override = renderNodeContent ? renderNodeContent(node) : null;
  const showModuleInstanceId = nodeDisplayConfig?.showModuleInstanceId ?? true;

  const inputs = node.ports.filter((p) => p.portIoType === 'input');
  const outputs = node.ports.filter((p) => p.portIoType === 'output');
  const controls = node.ports.filter((p) => p.portIoType === 'control');

  const shape = node.shape ?? 'rect';
  const isLocked = node.locked === true;
  const connectable = !isLocked;

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

      {inputs.map((port, i) => (
        <Handle
          key={`input-${port.id}`}
          className={`port-handle ${portStatusClass(port)}`.trim()}
          data-port-id={port.id}
          id={`Data:${port.id}`}
          isConnectable={connectable && !port.locked}
          position={Position.Left}
          style={{
            backgroundColor: 'var(--color-background-neutral-06)',
            borderColor: 'var(--color-border-neutral-10)',
            top: offsetForIndex(node.height, inputs.length, i),
          }}
          type="target"
        />
      ))}

      {outputs.map((port, i) => (
        <Handle
          key={`output-${port.id}`}
          className={`port-handle ${portStatusClass(port)}`.trim()}
          data-port-id={port.id}
          id={`Data:${port.id}`}
          isConnectable={connectable && !port.locked}
          position={Position.Right}
          style={{
            backgroundColor: 'var(--color-background-neutral-06)',
            borderColor: 'var(--color-border-neutral-10)',
            top: offsetForIndex(node.height, outputs.length, i),
          }}
          type="source"
        />
      ))}

      {controls.map((port, i) => {
        const left = offsetForIndex(node.width, controls.length, i);
        const className = `port-handle ${portStatusClass(port)}`.trim();
        return (
          <Fragment key={port.id}>
            <Handle
              className={className}
              data-port-id={port.id}
              id={`Control:${port.id}-source`}
              isConnectable={connectable && !port.locked}
              position={Position.Top}
              style={{
                backgroundColor: 'var(--color-background-neutral-06)',
                borderColor: 'var(--color-border-neutral-10)',
                left,
              }}
              type="source"
            />
            <Handle
              className={className}
              data-port-id={port.id}
              id={`Control:${port.id}-target`}
              isConnectable={connectable && !port.locked}
              position={Position.Top}
              style={{
                backgroundColor: 'var(--color-background-neutral-06)',
                borderColor: 'var(--color-border-neutral-10)',
                left,
              }}
              type="target"
            />
          </Fragment>
        );
      })}
    </div>
  );
}
