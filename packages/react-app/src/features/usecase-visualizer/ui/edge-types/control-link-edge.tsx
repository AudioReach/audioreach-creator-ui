/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type EdgeProps, getBezierPath} from '@xyflow/react';

import {pickEdgeStrokeWidth} from '../../lib/edge-stroke';

import {EdgeBody} from './edge-body';

export function ControlLinkEdge(props: EdgeProps) {
  const {
    id,
    label,
    selected,
    sourcePosition,
    sourceX,
    sourceY,
    targetPosition,
    targetX,
    targetY,
  } = props;

  const [path, labelX, labelY] = getBezierPath({
    sourcePosition,
    sourceX,
    sourceY,
    targetPosition,
    targetX,
    targetY,
  });

  const strokeWidth = pickEdgeStrokeWidth(selected);

  return (
    <EdgeBody
      dashed
      edgeId={id}
      label={label}
      labelX={labelX}
      labelY={labelY}
      path={path}
      selected={selected}
      strokeWidth={strokeWidth}
    />
  );
}
