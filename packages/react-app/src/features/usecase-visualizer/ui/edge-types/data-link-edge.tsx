/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Edge, EdgeProps} from '@xyflow/react';

import type {DataLink} from '~entities/graph';

import {
  getBoundaryAwareBezierPath,
  resolveDataEdgePositions,
} from '../../lib/edge-position';
import {DATA_ARROW_MARKER_ID, pickEdgeStrokeWidth} from '../../lib/edge-stroke';
import {EdgeBody} from './edge-body';

type DataLinkEdgeProps = EdgeProps<Edge<DataLink & Record<string, unknown>>>;

export function DataLinkEdge(props: DataLinkEdgeProps) {
  const {
    data,
    id,
    label,
    selected,
    source,
    sourcePosition,
    sourceX,
    sourceY,
    target,
    targetPosition,
    targetX,
    targetY,
  } = props;
  const {isDangling, isEcLink} = data ?? {};

  const boundaryId =
    typeof data?.boundaryId === 'string' ? data.boundaryId : undefined;
  const {
    sourcePosition: effectiveSourcePosition,
    targetPosition: effectiveTargetPosition,
  } = resolveDataEdgePositions(
    {source, sourcePosition, target, targetPosition},
    boundaryId,
  );

  const [path, labelX, labelY] = getBoundaryAwareBezierPath({
    sourceIsBoundary: source === boundaryId,
    sourcePosition: effectiveSourcePosition,
    sourceX,
    sourceY,
    targetIsBoundary: target === boundaryId,
    targetPosition: effectiveTargetPosition,
    targetX,
    targetY,
  });

  const strokeWidth = pickEdgeStrokeWidth(selected);

  return (
    <EdgeBody
      arrowMarkerId={DATA_ARROW_MARKER_ID}
      edgeId={id}
      isDangling={isDangling}
      isEcLink={isEcLink}
      label={label}
      labelX={labelX}
      labelY={labelY}
      path={path}
      selected={selected}
      strokeWidth={strokeWidth}
    />
  );
}
