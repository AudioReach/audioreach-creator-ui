/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Port} from '../model/visualizer.types';

export const PORT_PADDING = 12;

export function offsetForIndex(
  totalLength: number,
  count: number,
  index: number,
): number {
  const step = (totalLength - 2 * PORT_PADDING) / (count + 1);
  return PORT_PADDING + step * (index + 1);
}

export function portStatusClass(port: Port): string {
  return port.portStatus ? `port-status-${port.portStatus}` : '';
}

export function dataHandleId(portId: string): string {
  return `Data:${portId}`;
}

export function controlHandleId(
  portId: string,
  kind: 'source' | 'target',
): string {
  return `Control:${portId}-${kind}`;
}
