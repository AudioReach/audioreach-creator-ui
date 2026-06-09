/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {EdgeKind} from '../model/visualizer.types';

export const DATA_ARROW_MARKER_ID = 'visualizer-data-arrow';
export const STROKE_DASHARRAY_DASHED = '5 5';
export const STROKE_WIDTH_DEFAULT = 2;
export const STROKE_WIDTH_EMPHASIZED = 3;

const PROXY_KINDS: ReadonlySet<EdgeKind> = new Set([
  'proxy-control',
  'proxy-data',
]);

export interface EdgeData {
  edgeKind?: EdgeKind;
}

export function pickEdgeStrokeWidth(
  selected: boolean | undefined,
  edgeKind: EdgeKind | undefined,
): number {
  if (selected === true) {
    return STROKE_WIDTH_EMPHASIZED;
  }
  if (edgeKind && PROXY_KINDS.has(edgeKind)) {
    return STROKE_WIDTH_EMPHASIZED;
  }
  return STROKE_WIDTH_DEFAULT;
}
