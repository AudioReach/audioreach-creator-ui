/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Canonical node dimensions and module-height helper.
 *
 * Consumers use these constants when running ELK so the layout matches what
 * the Visualizer renders. Module height grows with the larger of input vs
 * output port counts and with footer visibility.
 *
 * See docs/design/usecase-visualizer/usecase-visualizer-design.md
 *   → Implementation Notes → Node dimensions and consumer sizing contract.
 */
export const NODE_DIMENSIONS = {
  container: {
    headerHeight: 32,
    padding: 12,
  },
  module: {
    baseHeight: 80,
    footerHeight: 56,
    minHeight: 120,
    minWidth: 160,
    portRowHeight: 24,
  },
  subgraph: {
    headerHeight: 40,
    padding: 16,
  },
  subgraphProxy: {
    height: 60,
    width: 240,
  },
  subsystem: {
    baseHeight: 100,
    portRowHeight: 24,
    width: 200,
  },
} as const;

export function calculateModuleHeight(
  inputCount: number,
  outputCount: number,
  footerVisible: boolean,
): number {
  const extraRows = Math.max(0, Math.max(inputCount, outputCount) - 1);
  const natural =
    NODE_DIMENSIONS.module.baseHeight +
    extraRows * NODE_DIMENSIONS.module.portRowHeight +
    (footerVisible ? NODE_DIMENSIONS.module.footerHeight : 0);
  return Math.max(
    natural,
    NODE_DIMENSIONS.module.minHeight +
      (footerVisible ? NODE_DIMENSIONS.module.footerHeight : 0),
  );
}
