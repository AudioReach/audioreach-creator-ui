/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Handle} from '@xyflow/react';

import type {ModuleShape, Port} from '~entities/graph';

import {getPortAnchors} from '../../lib/port-anchors';
import {anchorStyle, portStatusClass} from '../../lib/port-geometry';
import {useVisualizerStore} from '../../model/visualizer-store-context';

interface PortHandlesNode {
  height: number;
  id: string;
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
  const connectionInProgress = useVisualizerStore(
    (state) => state.connectionInProgress,
  );
  const anchors = getPortAnchors(
    node.shape,
    node.ports,
    node.width,
    anchorHeight ?? node.height,
  );

  return (
    <>
      {anchors.map((anchor) => {
        const isConnectionSource =
          connectionInProgress?.nodeId === node.id &&
          connectionInProgress.port.id === anchor.port.id;
        const sourceClass = isConnectionSource
          ? 'port-handle-connection-source border-support-info bg-support-info-subtle shadow-[0_0_0_3px_var(--color-border-support-info)]'
          : '';

        return (
          <Handle
            key={anchor.handleId}
            className={`${HANDLE_CLASS_BASE} ${portStatusClass(anchor.port)} ${sourceClass}`.trim()}
            data-connection-source={isConnectionSource || undefined}
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
