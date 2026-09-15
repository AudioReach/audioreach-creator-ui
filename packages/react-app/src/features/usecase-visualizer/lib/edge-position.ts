/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Position} from '@xyflow/react';

const DEFAULT_CURVATURE = 0.25;
const MIN_BOUNDARY_CONTROL_OFFSET = 48;

export function mirrorPosition(position: Position): Position {
  switch (position) {
    case Position.Bottom:
      return Position.Top;
    case Position.Left:
      return Position.Right;
    case Position.Right:
      return Position.Left;
    case Position.Top:
      return Position.Bottom;
  }
}

export interface DataEdgeEndpoints {
  source: string;
  sourcePosition: Position;
  target: string;
  targetPosition: Position;
}

/**
 * A boundary port's handle position matches its physical side on the
 * enclosing frame (e.g. an output port renders on the right edge), but its
 * real internal counterpart sits on the interior side of that same edge.
 * Feeding the physical position into getBezierPath computes the control
 * point on the wrong side, producing a curve that loops back into the
 * frame with the arrowhead pointing away from its actual counterpart.
 * Mirroring only the boundary endpoint's position corrects the tangent to
 * point toward the interior, matching a normal module-to-module link.
 */
export function resolveDataEdgePositions(
  endpoints: DataEdgeEndpoints,
  boundaryId: string | undefined,
): Pick<DataEdgeEndpoints, 'sourcePosition' | 'targetPosition'> {
  return {
    sourcePosition:
      endpoints.source === boundaryId
        ? mirrorPosition(endpoints.sourcePosition)
        : endpoints.sourcePosition,
    targetPosition:
      endpoints.target === boundaryId
        ? mirrorPosition(endpoints.targetPosition)
        : endpoints.targetPosition,
  };
}

function calculateControlOffset(distance: number, minOffset: number): number {
  if (distance >= 0) {
    return Math.max(minOffset, 0.5 * distance);
  }
  return Math.max(minOffset, DEFAULT_CURVATURE * 25 * Math.sqrt(-distance));
}

function getControlPoint(
  position: Position,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  minOffset: number,
): [x: number, y: number] {
  switch (position) {
    case Position.Bottom:
      return [x1, y1 + calculateControlOffset(y2 - y1, minOffset)];
    case Position.Left:
      return [x1 - calculateControlOffset(x1 - x2, minOffset), y1];
    case Position.Right:
      return [x1 + calculateControlOffset(x2 - x1, minOffset), y1];
    case Position.Top:
      return [x1, y1 - calculateControlOffset(y1 - y2, minOffset)];
  }
}

export interface BoundaryAwareBezierPathParams {
  sourceIsBoundary?: boolean;
  sourcePosition: Position;
  sourceX: number;
  sourceY: number;
  targetIsBoundary?: boolean;
  targetPosition: Position;
  targetX: number;
  targetY: number;
}

/**
 * Builds the same cubic-bezier path as @xyflow/system's getBezierPath, but
 * floors the control-point offset at whichever endpoint is on the boundary
 * frame. @xyflow's `curvature` option only scales the loop-avoidance branch
 * (used when the counterpart lies the "wrong" way), not this one, so it
 * cannot express a minimum departure distance — a boundary port's gap to
 * its interior counterpart is often small (see NODE_DIMENSIONS.
 * subsystemBoundary padding), which otherwise renders the link hugging the
 * port instead of curving away from it like a module-to-module link.
 */
export function getBoundaryAwareBezierPath(
  params: BoundaryAwareBezierPathParams,
): [path: string, labelX: number, labelY: number] {
  const {
    sourceIsBoundary,
    sourcePosition,
    sourceX,
    sourceY,
    targetIsBoundary,
    targetPosition,
    targetX,
    targetY,
  } = params;
  const [sourceControlX, sourceControlY] = getControlPoint(
    sourcePosition,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourceIsBoundary === true ? MIN_BOUNDARY_CONTROL_OFFSET : 0,
  );
  const [targetControlX, targetControlY] = getControlPoint(
    targetPosition,
    targetX,
    targetY,
    sourceX,
    sourceY,
    targetIsBoundary === true ? MIN_BOUNDARY_CONTROL_OFFSET : 0,
  );
  const labelX =
    sourceX * 0.125 +
    sourceControlX * 0.375 +
    targetControlX * 0.375 +
    targetX * 0.125;
  const labelY =
    sourceY * 0.125 +
    sourceControlY * 0.375 +
    targetControlY * 0.375 +
    targetY * 0.125;
  return [
    `M${sourceX},${sourceY} C${sourceControlX},${sourceControlY} ${targetControlX},${targetControlY} ${targetX},${targetY}`,
    labelX,
    labelY,
  ];
}
