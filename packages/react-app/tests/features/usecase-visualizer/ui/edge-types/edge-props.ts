/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type EdgeProps, Position} from '@xyflow/react';

export function makeEdgeProps(
  overrides: Partial<EdgeProps> & {id: string},
): EdgeProps {
  const base: EdgeProps = {
    deletable: true,
    id: overrides.id,
    interactionWidth: 20,
    selectable: true,
    selected: false,
    source: 's',
    sourcePosition: Position.Right,
    sourceX: 0,
    sourceY: 0,
    target: 't',
    targetPosition: Position.Left,
    targetX: 100,
    targetY: 100,
  };
  return {...base, ...overrides};
}
