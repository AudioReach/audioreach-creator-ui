/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type Edge, type EdgeProps, getBezierPath} from '@xyflow/react';

import type {ControlLink} from '~entities/graph';

import {pickEdgeStrokeWidth} from '../../lib/edge-stroke';

import {EdgeBody} from './edge-body';

type ControlLinkEdgeProps = EdgeProps<
  Edge<ControlLink & Record<string, unknown>>
>;

export function ControlLinkEdge(props: ControlLinkEdgeProps) {
  const {
    data,
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
  const {isDangling} = data ?? {};

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
      isDangling={isDangling}
      label={label}
      labelX={labelX}
      labelY={labelY}
      path={path}
      selected={selected}
      strokeWidth={strokeWidth}
    />
  );
}
