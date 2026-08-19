/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Handle} from '@xyflow/react';

import type {ModuleShape, Port} from '~entities/graph';

import {getPortAnchors} from '../../lib/port-anchors';
import {anchorStyle, portStatusClass} from '../../lib/port-geometry';

interface PortHandlesNode {
  height: number;
  locked?: boolean;
  ports: Port[];
  shape?: ModuleShape;
  width: number;
}

interface PortHandlesProps {
  /** Overrides node.height for anchor math (e.g. when a footer sits outside). */
  anchorHeight?: number;
  node: PortHandlesNode;
}

const HANDLE_CLASS_BASE =
  'port-handle bg-[var(--node-shade-strong)] border-neutral-10';

export function PortHandles({anchorHeight, node}: PortHandlesProps) {
  const connectable = node.locked !== true;
  const anchors = getPortAnchors(
    node.shape,
    node.ports,
    node.width,
    anchorHeight ?? node.height,
  );

  return (
    <>
      {anchors.map((anchor) => {
        return (
          <Handle
            key={anchor.handleId}
            className={`${HANDLE_CLASS_BASE} ${portStatusClass(anchor.port)}`.trim()}
            data-port-id={anchor.port.id}
            id={anchor.handleId}
            isConnectable={connectable && !anchor.port.locked}
            position={anchor.position}
            style={anchorStyle(anchor)}
            type={anchor.handleKind}
          />
        );
      })}
    </>
  );
}
