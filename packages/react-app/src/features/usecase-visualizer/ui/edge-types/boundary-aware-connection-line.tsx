/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ConnectionLineComponentProps, InternalNode} from '@xyflow/react';

import {
  getBoundaryAwareBezierPath,
  mirrorPosition,
} from '../../lib/edge-position';

const DATA_HANDLE_PREFIX = 'Data:';

function isBoundaryNode(node: InternalNode | null): boolean {
  return node?.type === 'subsystem-boundary';
}

/**
 * xyflow's default connection-preview line computes its curve from each
 * endpoint's raw handle Position, unaware that a boundary port's real
 * counterpart sits on the interior side of the frame it renders on (see
 * DataLinkEdge / resolveDataEdgePositions). Without mirroring, the
 * in-progress line loops back into the frame until the mouse is released,
 * even though the finished edge already renders correctly. Control ports
 * colocate the same Position on both ends and need no mirroring.
 */
export function BoundaryAwareConnectionLine({
  connectionLineStyle,
  fromHandle,
  fromNode,
  fromPosition,
  fromX,
  fromY,
  toHandle,
  toNode,
  toPosition,
  toX,
  toY,
}: ConnectionLineComponentProps) {
  const isDataConnection = (fromHandle.id ?? '').startsWith(
    DATA_HANDLE_PREFIX,
  );
  const sourceIsBoundary = isDataConnection && isBoundaryNode(fromNode);
  const targetIsBoundary =
    isDataConnection && toHandle !== null && isBoundaryNode(toNode);

  const [path] = getBoundaryAwareBezierPath({
    sourceIsBoundary,
    sourcePosition: sourceIsBoundary
      ? mirrorPosition(fromPosition)
      : fromPosition,
    sourceX: fromX,
    sourceY: fromY,
    targetIsBoundary,
    targetPosition: targetIsBoundary ? mirrorPosition(toPosition) : toPosition,
    targetX: toX,
    targetY: toY,
  });

  return (
    <path
      className="react-flow__connection-path"
      d={path}
      fill="none"
      style={connectionLineStyle}
    />
  );
}
