/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {CSSProperties} from 'react';

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

/**
 * Recovers the portId from a handle id produced by dataHandleId or
 * controlHandleId. Returns undefined when the format is unrecognised.
 */
export function parsePortIdFromHandleId(
  handleId: string,
  role: 'source' | 'target',
): string | undefined {
  if (handleId.startsWith('Data:')) {
    return handleId.slice('Data:'.length);
  }
  if (handleId.startsWith('Control:')) {
    const inner = handleId.slice('Control:'.length);
    const suffix = `-${role}`;
    return inner.endsWith(suffix) ? inner.slice(0, -suffix.length) : inner;
  }
  return undefined;
}

/**
 * Compute the inline style for a ReactFlow Handle based on its anchor
 * coordinates. When both x and y are set (curved/pointed shapes) the handle
 * is centered on that exact point; otherwise only the set axis is pinned.
 */
export function anchorStyle(anchor: {x?: number; y?: number}): CSSProperties {
  const centered = anchor.x !== undefined && anchor.y !== undefined;
  return centered
    ? {
        bottom: 'auto' as const,
        left: anchor.x,
        right: 'auto' as const,
        top: anchor.y,
        transform: 'translate(-50%, -50%)',
      }
    : {
        ...(anchor.x !== undefined ? {left: anchor.x} : {}),
        ...(anchor.y !== undefined ? {top: anchor.y} : {}),
      };
}
