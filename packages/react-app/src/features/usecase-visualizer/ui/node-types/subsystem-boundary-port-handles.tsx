/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Port} from '~entities/graph';

import {getPortAnchors} from '../../lib/port-anchors';
import {anchorStyle} from '../../lib/port-geometry';

import {PortHandle} from './port-handles';

interface SubsystemBoundaryPortHandlesProps {
  height: number;
  id: string;
  locked?: boolean;
  ports: Port[];
  width: number;
}

export function SubsystemBoundaryPortHandles({
  height,
  id,
  locked,
  ports,
  width,
}: SubsystemBoundaryPortHandlesProps) {
  const anchors = getPortAnchors('rect', ports, width, height);
  const connectable = locked !== true;

  return (
    <>
      {anchors.map((anchor) => (
        <PortHandle
          key={anchor.handleId}
          id={anchor.handleId}
          isConnectable={connectable}
          nodeId={id}
          port={anchor.port}
          position={anchor.position}
          style={anchorStyle(anchor)}
          type={
            anchor.port.portIoType === 'control'
              ? anchor.handleKind
              : anchor.handleKind === 'source'
                ? 'target'
                : 'source'
          }
        />
      ))}
    </>
  );
}
