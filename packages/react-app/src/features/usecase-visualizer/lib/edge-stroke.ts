/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {EdgeKind} from '../model/visualizer.types';

export const DATA_ARROW_MARKER_ID = 'visualizer-data-arrow';
export const STROKE_DASHARRAY_DASHED = '5 5';
export const STROKE_WIDTH_DEFAULT = 2;
export const STROKE_WIDTH_EMPHASIZED = 3;

export interface EdgeData {
  edgeKind?: EdgeKind;
}

export function pickEdgeStrokeWidth(selected: boolean | undefined): number {
  return selected === true ? STROKE_WIDTH_EMPHASIZED : STROKE_WIDTH_DEFAULT;
}
