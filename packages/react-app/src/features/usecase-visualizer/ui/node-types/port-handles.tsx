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
  /** When true, fill reflects portFillClass(port); otherwise uses the fixed fill. */
  showLinkCountColor?: boolean;
}

const HANDLE_BORDER_CLASS = 'port-handle !border-neutral-10';
const FIXED_FILL_CLASS = '!bg-[var(--node-shade-strong)]';

const PORT_FILL_TOKENS = {
  FULLY_COVERED: '!bg-black',
  NONE: '!bg-white',
  PARTIALLY_COVERED: '!bg-[var(--color-background-support-neutral-medium)]',
} as const;

export function portFillClass(port: Port): string {
  const total = port.totalLinks ?? 0;
  const active = port.activeLinks ?? 0;

  if (total === 0) {
    return PORT_FILL_TOKENS.NONE;
  }
  if (active >= total) {
    return PORT_FILL_TOKENS.FULLY_COVERED;
  }
  return PORT_FILL_TOKENS.PARTIALLY_COVERED;
}

export function PortHandles({
  anchorHeight,
  node,
  showLinkCountColor,
}: PortHandlesProps) {
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
            className={`${HANDLE_BORDER_CLASS} ${
              showLinkCountColor ? portFillClass(anchor.port) : FIXED_FILL_CLASS
            } ${portStatusClass(anchor.port)} ${sourceClass}`.trim()}
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
