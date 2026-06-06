/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Fragment} from 'react';

import {Handle, type HandleType, Position} from '@xyflow/react';

import {
  controlHandleId,
  dataHandleId,
  offsetForIndex,
  portStatusClass,
} from '../../lib/port-geometry';
import type {Port} from '../../model/visualizer.types';

interface PortHandlesNode {
  height: number;
  locked?: boolean;
  ports: Port[];
  width: number;
}

interface PortHandlesProps {
  node: PortHandlesNode;
}

const HANDLE_CLASS_BASE =
  'port-handle bg-[var(--color-background-neutral-06)] border-[var(--color-border-neutral-10)]';

const DATA_SIDES: ReadonlyArray<{
  ioType: 'input' | 'output';
  keyPrefix: string;
  position: Position;
  type: HandleType;
}> = [
  {
    ioType: 'input',
    keyPrefix: 'input',
    position: Position.Left,
    type: 'target',
  },
  {
    ioType: 'output',
    keyPrefix: 'output',
    position: Position.Right,
    type: 'source',
  },
];

const CONTROL_KINDS = ['source', 'target'] as const;

export function PortHandles({node}: PortHandlesProps) {
  const connectable = node.locked !== true;

  const groups: Record<'input' | 'output' | 'control', Port[]> = {
    control: [],
    input: [],
    output: [],
  };
  for (const port of node.ports) {
    groups[port.portIoType].push(port);
  }

  return (
    <>
      {DATA_SIDES.flatMap(({ioType, keyPrefix, position, type}) => {
        const ports = groups[ioType];
        return ports.map((port, i) => (
          <Handle
            key={`${keyPrefix}-${port.id}`}
            className={`${HANDLE_CLASS_BASE} ${portStatusClass(port)}`.trim()}
            data-port-id={port.id}
            id={dataHandleId(port.id)}
            isConnectable={connectable && !port.locked}
            position={position}
            style={{top: offsetForIndex(node.height, ports.length, i)}}
            type={type}
          />
        ));
      })}

      {groups.control.map((port, i) => {
        const left = offsetForIndex(node.width, groups.control.length, i);
        const className =
          `${HANDLE_CLASS_BASE} ${portStatusClass(port)}`.trim();
        return (
          <Fragment key={port.id}>
            {CONTROL_KINDS.map((kind) => (
              <Handle
                key={kind}
                className={className}
                data-port-id={port.id}
                id={controlHandleId(port.id, kind)}
                isConnectable={connectable && !port.locked}
                position={Position.Top}
                style={{left}}
                type={kind}
              />
            ))}
          </Fragment>
        );
      })}
    </>
  );
}
