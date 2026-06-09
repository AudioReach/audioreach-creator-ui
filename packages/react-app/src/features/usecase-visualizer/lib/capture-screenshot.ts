/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  getNodesBounds,
  getViewportForBounds,
  type ReactFlowInstance,
} from '@xyflow/react';
import {toPng} from 'html-to-image';

import {logger} from '~shared/lib/logger';

/**
 * Captures a PNG screenshot of the current ReactFlow canvas as a data URL.
 * Returns null if there are no nodes, the viewport element is missing, or
 * capture fails.
 */
export async function captureScreenshot(
  instance: Pick<ReactFlowInstance, 'getNodes'>,
  viewportEl: HTMLElement,
): Promise<string | null> {
  const nodes = instance.getNodes();
  if (nodes.length === 0) {
    return null;
  }
  const bounds = getNodesBounds(nodes);
  const w = bounds.width + 100;
  const h = bounds.height + 100;
  const transform = getViewportForBounds(bounds, w, h, 0.5, 2, 0.1);
  // Resolve background from QUI token so light/dark themes work correctly.
  const bgColor = getComputedStyle(viewportEl)
    .getPropertyValue('--color-background-neutral-01')
    .trim();
  if (!bgColor) {
    logger.warn(
      'QUI token --color-background-neutral-01 did not resolve; aborting screenshot',
    );
    return null;
  }
  try {
    const CAPTURE_FLUSH_DELAY_MS = 100;
    // Allow React to flush pending style/layout recalculations before capture.
    await new Promise<void>((resolve) =>
      setTimeout(resolve, CAPTURE_FLUSH_DELAY_MS),
    );
    return await toPng(viewportEl, {
      backgroundColor: bgColor,
      cacheBust: true,
      filter: (node) =>
        !(node instanceof HTMLLinkElement && node.rel === 'stylesheet'),
      height: h,
      pixelRatio: 2,
      skipFonts: true,
      style: {
        height: `${h}px`,
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
        width: `${w}px`,
      },
      width: w,
    });
  } catch {
    return null;
  }
}
