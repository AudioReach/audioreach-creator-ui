/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Handle, Position} from '@xyflow/react';

import {getPortAnchors} from '../../lib/port-anchors';
import {portStatusClass} from '../../lib/port-geometry';
import type {ModuleShape, Port} from '../../model/visualizer.types';

interface PortHandlesNode {
  height: number;
  locked?: boolean;
  ports: Port[];
  shape?: ModuleShape;
  width: number;
}

interface PortHandlesProps {
  node: PortHandlesNode;
}

const HANDLE_CLASS_BASE =
  'port-handle bg-[var(--color-background-neutral-06)] border-[var(--color-border-neutral-10)]';

export function PortHandles({node}: PortHandlesProps) {
  const connectable = node.locked !== true;
  const anchors = getPortAnchors(
    node.shape,
    node.ports,
    node.width,
    node.height,
  );

  return (
    <>
      {anchors.map((anchor) => (
        <Handle
          key={anchor.handleId}
          className={`${HANDLE_CLASS_BASE} ${portStatusClass(anchor.port)}`.trim()}
          data-port-id={anchor.port.id}
          id={anchor.handleId}
          isConnectable={connectable && !anchor.port.locked}
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
    </>
  );
}
