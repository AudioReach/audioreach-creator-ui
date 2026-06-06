/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Handle, Position} from '@xyflow/react';

import type {AnyNode, Port} from '../model/visualizer.types';

import {controlHandleId, dataHandleId, offsetForIndex} from './port-geometry';

interface GhostNodeProps {
  node: AnyNode;
}

interface PortHandle {
  id: string;
  port: Port;
  position: Position;
  type: 'source' | 'target';
}

function getNodePorts(node: AnyNode): Port[] {
  if (
    node.nodeKind === 'module' ||
    node.nodeKind === 'subsystem' ||
    node.nodeKind === 'subgraph-proxy'
  ) {
    return node.ports;
  }
  return [];
}

function buildHandleDescriptors(ports: Port[]): {
  control: PortHandle[];
  input: PortHandle[];
  output: PortHandle[];
} {
  const input: PortHandle[] = [];
  const output: PortHandle[] = [];
  const control: PortHandle[] = [];

  for (const port of ports) {
    if (port.portIoType === 'input') {
      input.push({
        id: dataHandleId(port.id),
        port,
        position: Position.Left,
        type: 'target',
      });
    } else if (port.portIoType === 'output') {
      output.push({
        id: dataHandleId(port.id),
        port,
        position: Position.Right,
        type: 'source',
      });
    } else {
      control.push({
        id: controlHandleId(port.id, 'source'),
        port,
        position: Position.Top,
        type: 'source',
      });
      control.push({
        id: controlHandleId(port.id, 'target'),
        port,
        position: Position.Top,
        type: 'target',
      });
    }
  }

  return {control, input, output};
}

const HANDLE_HIDDEN_CLASS = 'pointer-events-none opacity-0 ghost-node-handle';

export function GhostNode({node}: GhostNodeProps) {
  const ports = getNodePorts(node);
  const {control, input, output} = buildHandleDescriptors(ports);

  const inputCount = input.length;
  const outputCount = output.length;
  // Two handle descriptors (source + target) are built per control port.
  const controlPortCount = control.length / 2;

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

      {input.map((h, i) => (
        <Handle
          key={h.id}
          aria-hidden="true"
          className={HANDLE_HIDDEN_CLASS}
          id={h.id}
          isConnectable={false}
          position={h.position}
          style={{top: offsetForIndex(node.height, inputCount, i)}}
          type={h.type}
        />
      ))}
      {output.map((h, i) => (
        <Handle
          key={h.id}
          aria-hidden="true"
          className={HANDLE_HIDDEN_CLASS}
          id={h.id}
          isConnectable={false}
          position={h.position}
          style={{top: offsetForIndex(node.height, outputCount, i)}}
          type={h.type}
        />
      ))}
      {control.map((h, pairIdx) => {
        const pairIndex = Math.floor(pairIdx / 2);
        return (
          <Handle
            key={h.id}
            aria-hidden="true"
            className={HANDLE_HIDDEN_CLASS}
            id={h.id}
            isConnectable={false}
            position={h.position}
            style={{
              left: offsetForIndex(node.width, controlPortCount, pairIndex),
            }}
            type={h.type}
          />
        );
      })}
    </div>
  );
}
