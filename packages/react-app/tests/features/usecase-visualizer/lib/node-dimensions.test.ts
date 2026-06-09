/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  calculateModuleHeight,
  NODE_DIMENSIONS,
} from '~features/usecase-visualizer/lib/node-dimensions';

describe('NODE_DIMENSIONS — exact constants', () => {
  it('module dimensions match the spec', () => {
    expect(NODE_DIMENSIONS.module).toEqual({
      baseHeight: 80,
      footerHeight: 56,
      minHeight: 120,
      minWidth: 160,
      portRowHeight: 24,
    });
  });

  it('subsystem dimensions match the spec', () => {
    expect(NODE_DIMENSIONS.subsystem).toEqual({
      baseHeight: 100,
      portRowHeight: 24,
      width: 200,
    });
  });

  it('subgraphProxy dimensions match the spec', () => {
    expect(NODE_DIMENSIONS.subgraphProxy).toEqual({height: 60, width: 240});
  });

  it('subgraph dimensions match the spec', () => {
    expect(NODE_DIMENSIONS.subgraph).toEqual({headerHeight: 40, padding: 16});
  });

  it('container dimensions match the spec', () => {
    expect(NODE_DIMENSIONS.container).toEqual({headerHeight: 32, padding: 12});
  });
});

describe('calculateModuleHeight', () => {
  const {footerHeight, minHeight, portRowHeight} = NODE_DIMENSIONS.module;

  it('small port count is clamped to minHeight + footerHeight', () => {
    // 1in + 1out: natural = 80 + 44 = 124 < minHeight(120) + 44 = 164
    expect(calculateModuleHeight(1, 1, true)).toBe(minHeight + footerHeight);
  });

  it('3 input + 1 output + footer visible adds 2 port rows above minimum', () => {
    // natural = 80 + 2*24 + 44 = 172 > 164 → natural wins
    expect(calculateModuleHeight(3, 1, true)).toBe(
      80 + 2 * portRowHeight + footerHeight,
    );
  });

  it('small port count without footer is clamped to minHeight', () => {
    // 1in + 1out: natural = 80 < minHeight(120) → minHeight wins
    expect(calculateModuleHeight(1, 1, false)).toBe(minHeight);
  });

  it('1 input + 3 output without footer adds 2 port rows above minimum', () => {
    // natural = 80 + 2*24 = 128 > 120 → natural wins
    expect(calculateModuleHeight(1, 3, false)).toBe(80 + 2 * portRowHeight);
  });

  it('zero ports clamps to minHeight', () => {
    expect(calculateModuleHeight(0, 0, false)).toBe(minHeight);
    expect(calculateModuleHeight(0, 0, true)).toBe(minHeight + footerHeight);
  });
});
